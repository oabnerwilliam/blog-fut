/**
 * Paridade com o content/ real (foco de revisão 2 do plano v2): o mesmo conteúdo dá o
 * mesmo resultado em `files` e em `supabase`, método a método, e a normalização da busca
 * feita no Postgres é a mesma do JS.
 */
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { carregarArtigosDoDisco } from "@/lib/content/disco";
import { FileArticleRepository } from "@/lib/content/file-repository";
import type { ArticleRepository } from "@/lib/content/repository";
import { normalizarParaBusca, textoBuscavel } from "@/lib/content/search";
import { SupabaseArticleRepository } from "@/lib/content/supabase/repository";
import { EDITORIAS } from "@/lib/editorias";
import { importarConteudo } from "../../scripts/lib/importacao";
import {
  clienteAnonimo,
  clienteDeServico,
  limparBanco,
} from "./helpers/supabase-local";

const CONTENT = path.resolve(__dirname, "../../content");
const servico = clienteDeServico();
const artigos = carregarArtigosDoDisco(CONTENT, () => {}).map((c) => c.artigo);

beforeAll(async () => {
  await limparBanco(servico);
  await importarConteudo(servico, CONTENT, () => {});
});

async function normalizarNoBanco(texto: string): Promise<string> {
  const { data, error } = await servico.rpc("normalizar_busca", { texto });
  expect(error).toBeNull();
  return data as string;
}

describe("normalizar_busca (SQL) = normalizarParaBusca (JS)", () => {
  it.each([
    "São Paulo",
    "SÃO PAULO",
    "  são\t\tpaulo \n ",
    "Ação, coração, pinguim, über, ÇÉDILHA",
    "“aspas curvas” — travessão – meia-risca … reticências",
    "50% de 1_000 * 2",
    "œuvre ½ º ª ß Æ Ø Đ Ł",
    "espaço duro e fino　ideográfico﻿bom",
    "é composto × é pronto",
    "",
  ])("%j", async (texto) => {
    expect(await normalizarNoBanco(texto)).toBe(normalizarParaBusca(texto));
  });

  it("o corpo de cada matéria real", async () => {
    for (const artigo of artigos) {
      expect(await normalizarNoBanco(artigo.corpo_md), artigo.slug).toBe(
        normalizarParaBusca(artigo.corpo_md),
      );
    }
  });
});

describe("busca_normalizada = textoBuscavel", () => {
  async function buscaDoBanco(slug: string): Promise<string> {
    const { data, error } = await servico
      .from("articles")
      .select("busca_normalizada")
      .eq("slug", slug)
      .single();
    expect(error).toBeNull();
    return data!.busca_normalizada as string;
  }

  it("para cada matéria real, com os rótulos de tags.json", async () => {
    for (const artigo of artigos) {
      expect(await buscaDoBanco(artigo.slug), artigo.slug).toBe(
        textoBuscavel(artigo),
      );
    }
  });

  it("o trigger de tags recalcula quando o rótulo muda ou some", async () => {
    const alvo = artigos.find((a) => a.tags.some((t) => t.slug === "psg"))!;
    const original = await buscaDoBanco(alvo.slug);

    await servico
      .from("tags")
      .update({ rotulo: "Paris Rótulo" })
      .eq("slug", "psg");
    expect(await buscaDoBanco(alvo.slug)).toContain("\nparis rotulo\n");

    await servico.from("tags").delete().eq("slug", "psg");
    // Sem rótulo, vale o humanizado ("Psg"), que normalizado é o próprio slug.
    expect(await buscaDoBanco(alvo.slug)).toBe(
      textoBuscavel({
        ...alvo,
        tags: alvo.tags.map((t) =>
          t.slug === "psg" ? { slug: "psg", rotulo: "Psg" } : t,
        ),
      }),
    );

    await servico.from("tags").insert({ slug: "psg", rotulo: "PSG" });
    expect(await buscaDoBanco(alvo.slug)).toBe(original);
  });
});

describe("files × supabase, método a método, com o content/ real", () => {
  const CONSULTAS = [
    "sao ciriaco",
    "São Ciríaco",
    "psg",
    "PSG mercado",
    "goleira",
    "taça das serras",
    "a",
    "inexistente xyz",
    "%",
    "",
  ];

  for (const mostrarExemplos of [true, false]) {
    describe(`MOSTRAR_EXEMPLOS=${mostrarExemplos}`, () => {
      const arquivos: ArticleRepository = new FileArticleRepository({
        contentDir: CONTENT,
        mostrarExemplos,
        avisar: () => {},
      });
      const banco: ArticleRepository = new SupabaseArticleRepository({
        client: clienteAnonimo(),
        mostrarExemplos,
      });

      it("list: todas as páginas, cada editoria e cada tag", async () => {
        for (const pageSize of [1, 2, 12]) {
          const primeira = await arquivos.list({ pageSize });
          for (let page = 1; page <= primeira.totalPaginas + 1; page++) {
            expect(await banco.list({ page, pageSize })).toEqual(
              await arquivos.list({ page, pageSize }),
            );
          }
        }
        for (const { slug } of EDITORIAS) {
          expect(await banco.list({ editoria: slug })).toEqual(
            await arquivos.list({ editoria: slug }),
          );
        }
        for (const { slug } of await arquivos.listTags()) {
          expect(await banco.list({ tag: slug })).toEqual(
            await arquivos.list({ tag: slug }),
          );
        }
      });

      it("getBySlug de cada matéria", async () => {
        for (const artigo of artigos) {
          expect(await banco.getBySlug(artigo.slug), artigo.slug).toEqual(
            await arquivos.getBySlug(artigo.slug),
          );
        }
      });

      it("search", async () => {
        for (const consulta of CONSULTAS) {
          expect(await banco.search(consulta), consulta).toEqual(
            await arquivos.search(consulta),
          );
        }
      });

      it("listEditorias e listTags", async () => {
        expect(await banco.listEditorias()).toEqual(
          await arquivos.listEditorias(),
        );
        expect(await banco.listTags()).toEqual(await arquivos.listTags());
      });
    });
  }
});
