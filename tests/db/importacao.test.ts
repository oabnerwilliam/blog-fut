import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { carregarArtigosDoDisco } from "@/lib/content/disco";
import { importarConteudo } from "../../scripts/lib/importacao";
import { clienteDeServico, limparBanco } from "./helpers/supabase-local";

const CONTENT = path.resolve(__dirname, "../../content");
const servico = clienteDeServico();
const reais = carregarArtigosDoDisco(CONTENT, () => {}).map((c) => c.artigo);

async function foto() {
  const materias = await servico
    .from("articles")
    .select("slug,updated_at,revisao_publicada,revisao_em_edicao,status,fonte")
    .order("slug");
  const revisoes = await servico
    .from("article_revisions")
    .select("article_id,numero,created_at")
    .order("article_id");
  const tags = await servico.from("tags").select("slug,rotulo").order("slug");
  expect(materias.error ?? revisoes.error ?? tags.error).toBeNull();
  return {
    materias: materias.data!,
    revisoes: revisoes.data!,
    tags: tags.data!,
  };
}

describe("pnpm db:importar (importarConteudo) com o content/ real", () => {
  beforeAll(async () => {
    await limparBanco(servico);
  });

  it("importa as matérias e as tags, publicadas, com a revisão 1", async () => {
    const resultado = await importarConteudo(servico, CONTENT, () => {});
    expect(resultado.materias.inseridas.sort()).toEqual(
      reais.map((a) => a.slug).sort(),
    );
    expect(resultado.materias.atualizadas).toEqual([]);

    const { materias, revisoes, tags } = await foto();
    expect(materias).toHaveLength(reais.length);
    expect(revisoes).toHaveLength(reais.length);
    for (const m of materias) {
      expect(m).toMatchObject({
        status: "publicado",
        revisao_publicada: 1,
        revisao_em_edicao: 1,
      });
    }
    expect(Object.fromEntries(tags.map((t) => [t.slug, t.rotulo]))).toEqual(
      JSON.parse(readFileSync(path.join(CONTENT, "tags.json"), "utf8")),
    );
  });

  it("fonte: squad para a matéria real com origem, importacao para as fictícias", async () => {
    const { materias } = await foto();
    const fontes = Object.fromEntries(materias.map((m) => [m.slug, m.fonte]));
    for (const artigo of reais) {
      expect(fontes[artigo.slug], artigo.slug).toBe(
        artigo.ficticio ? "importacao" : "squad",
      );
    }
    expect(Object.values(fontes)).toContain("squad");
  });

  it("a revisão 1 é o snapshot completo, com o corpo literal do arquivo", async () => {
    for (const artigo of reais) {
      const { data, error } = await servico
        .from("article_revisions")
        .select(
          "numero,titulo,titulo_seo,linha_fina,editoria,tags,meta_description,palavras_chave,publicado_em,autor,ficticio,corpo_md,origem_da_revisao,autor_id,articles!inner(slug)",
        )
        .eq("articles.slug", artigo.slug)
        .single();
      expect(error).toBeNull();
      expect(data).toMatchObject({
        numero: 1,
        titulo: artigo.titulo,
        titulo_seo: artigo.titulo_seo,
        linha_fina: artigo.linha_fina,
        editoria: artigo.editoria.slug,
        tags: artigo.tags.map((t) => t.slug),
        meta_description: artigo.meta_description,
        palavras_chave: [...artigo.palavras_chave],
        publicado_em: artigo.publicado_em,
        autor: artigo.autor,
        ficticio: artigo.ficticio,
        corpo_md: artigo.corpo_md,
        origem_da_revisao: artigo.ficticio ? "importacao" : "squad",
        autor_id: null,
      });
    }
  });

  it("é idempotente: a segunda execução não grava nada (linhas, updated_at e revisões iguais)", async () => {
    const antes = await foto();
    const resultado = await importarConteudo(servico, CONTENT, () => {});
    expect(resultado.materias).toEqual({
      inseridas: [],
      atualizadas: [],
      iguais: expect.arrayContaining(reais.map((a) => a.slug)),
    });
    expect(resultado.tags.inseridas).toEqual([]);
    expect(resultado.tags.atualizadas).toEqual([]);
    expect(await foto()).toEqual(antes);
  });

  it("arquivo alterado vira a revisão 2, sem reescrever a 1", async () => {
    const alvo = reais[0];
    // Simula uma importação anterior com outro título: a do arquivo precisa voltar.
    const { error } = await servico
      .from("articles")
      .update({ titulo: "Título antigo" })
      .eq("slug", alvo.slug);
    expect(error).toBeNull();

    const resultado = await importarConteudo(servico, CONTENT, () => {});
    expect(resultado.materias.atualizadas).toEqual([alvo.slug]);

    const { data } = await servico
      .from("articles")
      .select(
        "titulo,revisao_publicada,revisao_em_edicao,article_revisions(numero)",
      )
      .eq("slug", alvo.slug)
      .single();
    expect(data).toMatchObject({
      titulo: alvo.titulo,
      revisao_publicada: 2,
      revisao_em_edicao: 2,
    });
    expect(
      (data!.article_revisions as { numero: number }[])
        .map((r) => r.numero)
        .sort(),
    ).toEqual([1, 2]);
  });

  it("avisa as publicadas que estão no banco mas não no disco, sem apagar", async () => {
    const semExtra = await importarConteudo(servico, CONTENT, () => {});
    expect(semExtra.soNoBanco).toEqual([]);

    const { error } = await servico.from("articles").insert({
      slug: "so-no-banco",
      titulo: "Só no banco",
      linha_fina: "Não existe em content/",
      editoria: "noticia",
      tags: ["psg"],
      publicado_em: "2026-01-01",
      autor: "Squad Fut",
      ficticio: true,
      corpo_md: "x",
      fonte: "importacao",
      status: "publicado",
      revisao_publicada: 1,
    });
    expect(error).toBeNull();

    const comExtra = await importarConteudo(servico, CONTENT, () => {});
    expect(comExtra.soNoBanco).toEqual(["so-no-banco"]);
    const { data } = await servico
      .from("articles")
      .select("slug")
      .eq("slug", "so-no-banco");
    expect(data).toEqual([{ slug: "so-no-banco" }]);
  });
});
