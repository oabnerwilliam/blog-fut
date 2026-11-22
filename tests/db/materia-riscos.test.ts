/**
 * Riscos da história 15 que os testes do dev não cobrem (revisor):
 * - o `jsonb` do envio não é interpretado como SQL (slug e corpo hostis);
 * - as matérias já importadas (o estado da produção, com as 9 matérias do content/) não
 *   mudam com `materia:publicar` e recusam um `materia:enviar` do mesmo slug.
 */
import { mkdtempSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { importarConteudo } from "../../scripts/lib/importacao";
import {
  enviarMateria,
  MENSAGEM_SLUG_EXISTENTE,
  publicarMateria,
} from "../../scripts/lib/materias";
import { clienteDeServico, limparBanco } from "./helpers/supabase-local";

const servico = clienteDeServico();
const CONTENT = path.resolve("content");

async function fotoDoBanco() {
  const [articles, revisoes, tags] = await Promise.all([
    servico.from("articles").select("*").order("slug"),
    servico
      .from("article_revisions")
      .select("*")
      .order("article_id")
      .order("numero"),
    servico.from("tags").select("*").order("slug"),
  ]);
  return { articles: articles.data, revisoes: revisoes.data, tags: tags.data };
}

const BASE = {
  titulo: "Título",
  titulo_seo: null,
  linha_fina: "Linha fina",
  editoria: "noticia",
  tags: ["tag-segura"],
  meta_description: null,
  palavras_chave: [],
  publicado_em: "2026-11-21",
  autor: "Squad Fut",
  ficticio: true,
  origem: null,
  rotulos: { "tag-segura": "Tag Segura" },
};

let entrada = "";

beforeEach(async () => {
  await limparBanco(servico);
  if (entrada) rmSync(entrada, { recursive: true, force: true });
  entrada = mkdtempSync(path.join(tmpdir(), "blog-fut-riscos-"));
});

afterAll(async () => {
  rmSync(entrada, { recursive: true, force: true });
  await limparBanco(servico);
});

describe("enviar_materia_do_squad com jsonb hostil", () => {
  it("slug com SQL é recusado pelo check e nada é gravado", async () => {
    await servico.from("tags").insert({ slug: "vitima", rotulo: "Vítima" });
    const antes = await fotoDoBanco();
    const { error } = await servico.rpc("enviar_materia_do_squad", {
      dados: {
        ...BASE,
        slug: "x'); delete from public.tags; --",
        corpo_md: "x",
      },
    });
    expect(error).not.toBeNull();
    expect(await fotoDoBanco()).toEqual(antes);
  });

  it("corpo com aspas, $$, % e comandos SQL é gravado literalmente", async () => {
    const corpo =
      '\'; drop table public.articles; --\n$$ fim $$ %s %% \\n "aspas" <script>x</script>\n';
    const { error } = await servico.rpc("enviar_materia_do_squad", {
      dados: { ...BASE, slug: "corpo-hostil", corpo_md: corpo },
    });
    expect(error).toBeNull();
    const { data } = await servico
      .from("article_revisions")
      .select("corpo_md")
      .eq("numero", 1)
      .single();
    expect(data!.corpo_md).toBe(corpo);
  });

  it("rótulo de tag ausente em `rotulos` cai no slug com espaços", async () => {
    const { error } = await servico.rpc("enviar_materia_do_squad", {
      dados: {
        ...BASE,
        slug: "sem-rotulo",
        tags: ["tag-sem-rotulo"],
        rotulos: {},
        corpo_md: "x",
      },
    });
    expect(error).toBeNull();
    const { data } = await servico
      .from("tags")
      .select("rotulo")
      .eq("slug", "tag-sem-rotulo")
      .single();
    expect(data!.rotulo).toBe("tag sem rotulo");
  });
});

describe("sobre as matérias já importadas (estado da produção)", () => {
  it("materia:publicar numa importada: nada a publicar e nada muda", async () => {
    await importarConteudo(servico, CONTENT, () => {});
    const { data: linhas } = await servico
      .from("articles")
      .select("slug")
      .order("slug");
    expect(linhas!.length).toBeGreaterThan(0);
    const antes = await fotoDoBanco();
    for (const { slug } of linhas!) {
      const resultado = await publicarMateria({ cliente: servico, slug });
      expect(resultado.estado).toBe("nada-a-publicar");
    }
    expect(await fotoDoBanco()).toEqual(antes);
  });

  it("materia:enviar com o slug de uma importada: recusa e o arquivo fica", async () => {
    await importarConteudo(servico, CONTENT, () => {});
    const { data: primeira } = await servico
      .from("articles")
      .select("slug")
      .order("slug")
      .limit(1)
      .single();
    const slug = primeira!.slug as string;
    const arquivo = [
      "---",
      `slug: ${slug}`,
      "titulo: Outra versão",
      "linha_fina: Linha",
      "editoria: noticia",
      "tags: [tag-nova-do-reenvio]",
      "publicado_em: 2026-11-21",
      "autor: Squad Fut",
      "ficticio: true",
      "---",
      "Texto novo.",
      "",
    ].join("\n");
    writeFileSync(path.join(entrada, `${slug}.md`), arquivo);
    const antes = await fotoDoBanco();
    await expect(
      enviarMateria({ cliente: servico, entrada, slug }),
    ).rejects.toThrow(MENSAGEM_SLUG_EXISTENTE(slug));
    expect(await fotoDoBanco()).toEqual(antes);
    expect(existsSync(path.join(entrada, `${slug}.md`))).toBe(true);
  });
});
