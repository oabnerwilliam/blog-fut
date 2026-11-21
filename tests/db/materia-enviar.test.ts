/**
 * `pnpm materia:enviar` e `pnpm materia:publicar` contra o Supabase local (história 15,
 * critérios 1, 4, 5 e 7). A caixa de entrada é uma pasta temporária: a content/entrada
 * real nunca é tocada.
 */
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { SupabaseArticleRepository } from "@/lib/content/supabase/repository";
import { enviarMateria, publicarMateria } from "../../scripts/lib/materias";
import {
  clienteAnonimo,
  clienteDeServico,
  limparBanco,
} from "./helpers/supabase-local";

const servico = clienteDeServico();
const anon = clienteAnonimo();
const repo = () =>
  new SupabaseArticleRepository({ client: anon, mostrarExemplos: true });

const SLUG = "o-gol-do-zaguenho";

/** CRLF, espaços no fim de linha e acentos (critério 5). */
function arquivo({
  slug = SLUG,
  tags = "[fc-aurora, copa-do-litoral]",
  extra = "",
}: { slug?: string; tags?: string; extra?: string } = {}): string {
  return [
    "---",
    `slug: ${slug}`,
    "titulo: O gol do Zaguenho",
    "linha_fina: Um zagueiro que decidiu a final",
    "editoria: cronica",
    `tags: ${tags}`,
    "publicado_em: 2026-11-20",
    "autor: Squad Fut",
    "ficticio: true",
    ...(extra ? [extra] : []),
    "---",
    "Ninguém esperava: o zagueiro subiu na área, aos 47 do segundo tempo.  ",
    "",
    "Açúcar, coração e pênalti: palavra única zaguenhoxyz.\t",
    "",
  ].join("\r\n");
}

const CORPO_LF =
  "Ninguém esperava: o zagueiro subiu na área, aos 47 do segundo tempo.  \n\nAçúcar, coração e pênalti: palavra única zaguenhoxyz.\t\n";

function sha256(texto: string): string {
  return createHash("sha256").update(texto, "utf8").digest("hex");
}

let entrada = "";

function gravar(nome: string, conteudo: string): string {
  const caminho = path.join(entrada, `${nome}.md`);
  writeFileSync(caminho, conteudo);
  return caminho;
}

async function fotoDoBanco() {
  const [articles, revisoes, tags] = await Promise.all([
    servico.from("articles").select("*").order("slug"),
    servico.from("article_revisions").select("*").order("numero"),
    servico.from("tags").select("*").order("slug"),
  ]);
  return { articles: articles.data, revisoes: revisoes.data, tags: tags.data };
}

beforeEach(async () => {
  await limparBanco(servico);
  if (entrada) rmSync(entrada, { recursive: true, force: true });
  entrada = mkdtempSync(path.join(tmpdir(), "blog-fut-entrada-"));
});

afterAll(async () => {
  rmSync(entrada, { recursive: true, force: true });
  await limparBanco(servico);
});

describe("materia:enviar", () => {
  it("grava rascunho + revisão 1 com o corpo literal (LF) e move o arquivo", async () => {
    const original = arquivo();
    gravar(SLUG, original);
    const resultado = await enviarMateria({
      cliente: servico,
      entrada,
      slug: SLUG,
    });
    expect(resultado).toMatchObject({
      slug: SLUG,
      titulo: "O gol do Zaguenho",
      status: "rascunho",
    });

    const { data: materia } = await servico
      .from("articles")
      .select("*")
      .eq("slug", SLUG)
      .single();
    expect(materia).toMatchObject({
      id: resultado.id,
      status: "rascunho",
      fonte: "squad",
      revisao_publicada: null,
      revisao_em_edicao: 1,
      tags: ["fc-aurora", "copa-do-litoral"],
      publicado_em: "2026-11-20",
      origem: null,
    });

    const { data: revisoes } = await servico
      .from("article_revisions")
      .select("*")
      .eq("article_id", resultado.id);
    expect(revisoes).toHaveLength(1);
    const [revisao] = revisoes!;
    expect(revisao).toMatchObject({
      numero: 1,
      origem_da_revisao: "squad",
      autor_id: null,
      titulo: "O gol do Zaguenho",
    });
    expect(sha256(revisao.corpo_md)).toBe(sha256(CORPO_LF));
    expect(sha256(materia!.corpo_md)).toBe(sha256(CORPO_LF));

    // tags que faltavam, com o rótulo humanizado
    const { data: tags } = await servico
      .from("tags")
      .select("slug,rotulo")
      .order("slug");
    expect(tags).toEqual([
      { slug: "copa-do-litoral", rotulo: "Copa do Litoral" },
      { slug: "fc-aurora", rotulo: "Fc Aurora" },
    ]);

    // só move depois do banco confirmar; o arquivo movido é o original, intacto
    expect(existsSync(path.join(entrada, `${SLUG}.md`))).toBe(false);
    expect(
      readFileSync(path.join(entrada, "enviadas", `${SLUG}.md`), "utf8"),
    ).toBe(original);
  });

  it("tag que já existe fica com o rótulo dela", async () => {
    await servico
      .from("tags")
      .insert({ slug: "fc-aurora", rotulo: "FC Aurora (escolhido à mão)" });
    gravar(SLUG, arquivo());
    await enviarMateria({ cliente: servico, entrada, slug: SLUG });
    const { data } = await servico
      .from("tags")
      .select("rotulo")
      .eq("slug", "fc-aurora")
      .single();
    expect(data!.rotulo).toBe("FC Aurora (escolhido à mão)");
  });

  it("slug duplicado: recusa com a mensagem exata, sem gravar nada (nem as tags novas)", async () => {
    gravar(SLUG, arquivo());
    await enviarMateria({ cliente: servico, entrada, slug: SLUG });
    const antes = await fotoDoBanco();

    gravar(SLUG, arquivo({ tags: "[tag-que-nao-existia]" }));
    await expect(
      enviarMateria({ cliente: servico, entrada, slug: SLUG }),
    ).rejects.toThrow(
      `Já existe uma matéria com o slug ${SLUG}. Edite pelo painel.`,
    );
    expect(await fotoDoBanco()).toEqual(antes);
    // o segundo arquivo continua na caixa de entrada
    expect(existsSync(path.join(entrada, `${SLUG}.md`))).toBe(true);
  });

  it("frontmatter inválido: erro com o nome do arquivo, nada gravado e nada movido", async () => {
    const antes = await fotoDoBanco();
    gravar(SLUG, arquivo().replace("editoria: cronica", "editoria: fofoca"));
    await expect(
      enviarMateria({ cliente: servico, entrada, slug: SLUG }),
    ).rejects.toThrow(new RegExp(`${SLUG}\\.md: campo "editoria"`));
    expect(await fotoDoBanco()).toEqual(antes);
    expect(existsSync(path.join(entrada, `${SLUG}.md`))).toBe(true);
    expect(existsSync(path.join(entrada, "enviadas"))).toBe(false);
  });

  it("matéria real sem origem: erro claro e nada gravado", async () => {
    const antes = await fotoDoBanco();
    gravar(SLUG, arquivo().replace("ficticio: true", "ficticio: false"));
    await expect(
      enviarMateria({ cliente: servico, entrada, slug: SLUG }),
    ).rejects.toThrow(/campo "origem": obrigatória/);
    expect(await fotoDoBanco()).toEqual(antes);
  });

  it("matéria real com origem é aceita", async () => {
    gravar(
      SLUG,
      arquivo()
        .replace("ficticio: true", "ficticio: false")
        .replace(
          "autor: Squad Fut",
          "autor: Squad Fut\r\norigem: squad-fut/textos/x/final.md",
        ),
    );
    await enviarMateria({ cliente: servico, entrada, slug: SLUG });
    const { data } = await servico
      .from("articles")
      .select("ficticio,origem,fonte")
      .eq("slug", SLUG)
      .single();
    expect(data).toEqual({
      ficticio: false,
      origem: "squad-fut/textos/x/final.md",
      fonte: "squad",
    });
  });

  it("a função é uma transação: falha no meio não deixa nem a tag nova", async () => {
    const antes = await fotoDoBanco();
    const { error } = await servico.rpc("enviar_materia_do_squad", {
      dados: {
        slug: "quebra-no-meio",
        titulo: "Quebra",
        linha_fina: "Linha",
        // o check de editoria recusa depois de a tag ter sido inserida
        editoria: "fofoca",
        tags: ["tag-orfa"],
        palavras_chave: [],
        publicado_em: "2026-11-20",
        autor: "Squad Fut",
        ficticio: true,
        corpo_md: "x",
        rotulos: { "tag-orfa": "Tag Órfã" },
      },
    });
    expect(error).not.toBeNull();
    expect(await fotoDoBanco()).toEqual(antes);
  });

  it("rascunho fica fora do site: anon não lê por tabela, getBySlug nem busca", async () => {
    gravar(SLUG, arquivo());
    await enviarMateria({ cliente: servico, entrada, slug: SLUG });

    const direto = await anon.from("articles").select("slug").eq("slug", SLUG);
    expect(direto.error).toBeNull();
    expect(direto.data).toEqual([]);
    expect(await repo().getBySlug(SLUG)).toBeNull();
    expect(await repo().search("zaguenhoxyz")).toEqual([]);
  });

  it("anon não executa as funções do squad", async () => {
    const envio = await anon.rpc("enviar_materia_do_squad", {
      dados: { slug: "invasora" },
    });
    expect(envio.error).not.toBeNull();
    const publicar = await anon.rpc("publicar_revisao", {
      p_article_id: "00000000-0000-0000-0000-000000000000",
    });
    expect(publicar.error).not.toBeNull();
  });
});

describe("materia:publicar", () => {
  it("depois de publicar, anon lê a matéria e o repositório do site a mostra", async () => {
    gravar(SLUG, arquivo());
    await enviarMateria({ cliente: servico, entrada, slug: SLUG });

    const resultado = await publicarMateria({ cliente: servico, slug: SLUG });
    expect(resultado).toEqual({
      estado: "publicada",
      slug: SLUG,
      titulo: "O gol do Zaguenho",
      revisao: 1,
    });

    const direto = await anon
      .from("articles")
      .select("slug,status,revisao_publicada,publicado_em")
      .eq("slug", SLUG);
    expect(direto.data).toEqual([
      {
        slug: SLUG,
        status: "publicado",
        revisao_publicada: 1,
        publicado_em: "2026-11-20",
      },
    ]);
    const materia = await repo().getBySlug(SLUG);
    expect(materia?.corpo_md).toBe(CORPO_LF);
    expect((await repo().search("zaguenhoxyz")).map((m) => m.slug)).toEqual([
      SLUG,
    ]);
  });

  it("já publicada e sem revisão nova: nada a publicar", async () => {
    gravar(SLUG, arquivo());
    await enviarMateria({ cliente: servico, entrada, slug: SLUG });
    await publicarMateria({ cliente: servico, slug: SLUG });
    const antes = await fotoDoBanco();
    expect(await publicarMateria({ cliente: servico, slug: SLUG })).toEqual({
      estado: "nada-a-publicar",
      slug: SLUG,
      titulo: "O gol do Zaguenho",
      revisao: 1,
    });
    expect(await fotoDoBanco()).toEqual(antes);
  });

  it("revisão nova de matéria já publicada: copia os campos e mantém o publicado_em", async () => {
    gravar(SLUG, arquivo());
    const { id } = await enviarMateria({
      cliente: servico,
      entrada,
      slug: SLUG,
    });
    await publicarMateria({ cliente: servico, slug: SLUG });

    // o que o painel (história 17) fará: revisão 2 + ponteiro de edição
    const { data: r1 } = await servico
      .from("article_revisions")
      .select(
        "article_id,titulo_seo,linha_fina,editoria,tags,meta_description,palavras_chave,autor,ficticio,corpo_md",
      )
      .eq("article_id", id)
      .single();
    const nova = await servico.from("article_revisions").insert({
      ...r1!,
      numero: 2,
      titulo: "O gol do Zaguenho (revisto)",
      publicado_em: "2027-01-01",
      origem_da_revisao: "painel",
    });
    expect(nova.error).toBeNull();
    await servico
      .from("articles")
      .update({ revisao_em_edicao: 2 })
      .eq("id", id);

    // antes de publicar, o site continua com a revisão 1
    expect((await repo().getBySlug(SLUG))?.titulo).toBe("O gol do Zaguenho");

    expect(await publicarMateria({ cliente: servico, slug: SLUG })).toEqual({
      estado: "publicada",
      slug: SLUG,
      titulo: "O gol do Zaguenho (revisto)",
      revisao: 2,
    });
    const { data } = await servico
      .from("articles")
      .select("titulo,publicado_em,revisao_publicada,status")
      .eq("id", id)
      .single();
    expect(data).toEqual({
      titulo: "O gol do Zaguenho (revisto)",
      publicado_em: "2026-11-20",
      revisao_publicada: 2,
      status: "publicado",
    });
    // a revisão 1 continua intacta
    const { data: revisao1 } = await servico
      .from("article_revisions")
      .select("corpo_md,titulo")
      .eq("article_id", id)
      .eq("numero", 1)
      .single();
    expect(revisao1).toEqual({
      corpo_md: CORPO_LF,
      titulo: "O gol do Zaguenho",
    });
  });

  it("slug inexistente: erro claro", async () => {
    await expect(
      publicarMateria({ cliente: servico, slug: "nao-existe" }),
    ).rejects.toThrow(/Não existe matéria com o slug nao-existe/);
  });

  it("publicar_revisao com id inexistente: exceção do banco", async () => {
    const { error } = await servico.rpc("publicar_revisao", {
      p_article_id: "00000000-0000-0000-0000-000000000000",
    });
    expect(error).not.toBeNull();
    expect(error!.hint).toBe("materia_inexistente");
  });
});
