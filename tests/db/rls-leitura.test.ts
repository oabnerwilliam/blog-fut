/**
 * RLS de leitura (história 13, critério 14): o visitante anônimo, com a mesma chave do
 * site, só lê matérias publicadas e tags, e não grava nada em nenhuma das três tabelas.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";
import { SupabaseArticleRepository } from "@/lib/content/supabase/repository";
import {
  clienteAnonimo,
  clienteDeServico,
  limparBanco,
} from "./helpers/supabase-local";

const servico = clienteDeServico();
const anon = clienteAnonimo();

const BASE = {
  linha_fina: "Linha fina de teste",
  editoria: "noticia",
  tags: ["tag-de-teste"],
  publicado_em: "2026-11-01",
  autor: "Squad Fut",
  ficticio: true,
  fonte: "importacao",
};

let idDoRascunho = "";

async function fotoDoBanco() {
  const [articles, revisoes, tags] = await Promise.all([
    servico.from("articles").select("*").order("slug"),
    servico.from("article_revisions").select("*").order("numero"),
    servico.from("tags").select("*").order("slug"),
  ]);
  return { articles: articles.data, revisoes: revisoes.data, tags: tags.data };
}

beforeAll(async () => {
  await limparBanco(servico);
  const { error: erroDaTag } = await servico
    .from("tags")
    .insert({ slug: "tag-de-teste", rotulo: "Tag de Teste" });
  expect(erroDaTag).toBeNull();
  const { data, error } = await servico
    .from("articles")
    .insert([
      {
        ...BASE,
        slug: "rascunho-secreto",
        titulo: "Rascunho secreto",
        corpo_md: "Palavra única: xyzzy.\n",
        status: "rascunho",
      },
      {
        ...BASE,
        slug: "materia-publicada",
        titulo: "Matéria publicada",
        corpo_md: "Texto público.\n",
        status: "publicado",
        revisao_publicada: 1,
      },
    ])
    .select("id,slug");
  expect(error).toBeNull();
  idDoRascunho = data!.find((m) => m.slug === "rascunho-secreto")!.id;
  const { error: erroDaRevisao } = await servico
    .from("article_revisions")
    .insert({
      article_id: idDoRascunho,
      numero: 1,
      titulo: "Rascunho secreto",
      linha_fina: BASE.linha_fina,
      editoria: BASE.editoria,
      tags: BASE.tags,
      publicado_em: BASE.publicado_em,
      autor: BASE.autor,
      ficticio: true,
      corpo_md: "Palavra única: xyzzy.\n",
      origem_da_revisao: "importacao",
    });
  expect(erroDaRevisao).toBeNull();
});

describe("anon não vê rascunho", () => {
  const repo = () =>
    new SupabaseArticleRepository({ client: anon, mostrarExemplos: true });

  it("nem por getBySlug, nem pela lista, nem pela busca", async () => {
    expect(await repo().getBySlug("rascunho-secreto")).toBeNull();
    expect(await repo().getBySlug("materia-publicada")).not.toBeNull();
    expect((await repo().list()).itens.map((m) => m.slug)).toEqual([
      "materia-publicada",
    ]);
    expect(await repo().search("xyzzy")).toEqual([]);
    expect(
      (await repo().listEditorias()).find((e) => e.slug === "noticia"),
    ).toMatchObject({ total: 1 });
  });

  it("nem direto na tabela, nem chamando a RPC da busca sem filtro", async () => {
    const direto = await anon.from("articles").select("slug");
    expect(direto.error).toBeNull();
    expect(direto.data).toEqual([{ slug: "materia-publicada" }]);

    const rpc = await anon.rpc("buscar_artigos", { termos: ["xyzzy"] });
    expect(rpc.error).toBeNull();
    expect(rpc.data).toEqual([]);
  });

  it("não chama as funções internas da busca; buscar_artigos continua aberta", async () => {
    for (const [funcao, args] of [
      ["normalizar_busca", { texto: "São Paulo" }],
      [
        "calcular_busca_normalizada",
        { p_titulo: "a", p_linha_fina: "b", p_tags: ["c"], p_corpo: "d" },
      ],
    ] as const) {
      const { data, error } = await anon.rpc(funcao, args);
      expect(error, funcao).not.toBeNull();
      expect(data, funcao).toBeNull();
    }
    const aberta = await anon.rpc("buscar_artigos", { termos: ["publico"] });
    expect(aberta.error).toBeNull();
  });

  it("e não lê article_revisions", async () => {
    const { data, error } = await anon.from("article_revisions").select("*");
    expect(data ?? []).toEqual([]);
    expect(error).not.toBeNull();
  });

  it("lê as tags", async () => {
    const { data, error } = await anon.from("tags").select("slug,rotulo");
    expect(error).toBeNull();
    expect(data).toEqual([{ slug: "tag-de-teste", rotulo: "Tag de Teste" }]);
  });
});

describe("anon não grava", () => {
  type Tentativa = (cliente: SupabaseClient) => PromiseLike<{
    error: unknown;
  }>;

  const tentativas: [string, Tentativa][] = [
    [
      "insert em articles",
      (c) =>
        c.from("articles").insert({
          ...BASE,
          slug: "invasora",
          titulo: "Invasora",
          corpo_md: "x",
          status: "rascunho",
        }),
    ],
    [
      "update em articles",
      (c) =>
        c
          .from("articles")
          .update({ titulo: "Alterado" })
          .eq("slug", "materia-publicada"),
    ],
    [
      "delete em articles",
      (c) => c.from("articles").delete().eq("slug", "materia-publicada"),
    ],
    [
      "insert em article_revisions",
      (c) =>
        c.from("article_revisions").insert({
          article_id: idDoRascunho,
          numero: 2,
          titulo: "x",
          linha_fina: "x",
          editoria: "noticia",
          tags: ["x"],
          publicado_em: "2026-11-01",
          autor: "x",
          ficticio: true,
          corpo_md: "x",
          origem_da_revisao: "painel",
        }),
    ],
    [
      "update em article_revisions",
      (c) =>
        c
          .from("article_revisions")
          .update({ corpo_md: "alterado" })
          .eq("article_id", idDoRascunho),
    ],
    [
      "delete em article_revisions",
      (c) =>
        c.from("article_revisions").delete().eq("article_id", idDoRascunho),
    ],
    [
      "insert em tags",
      (c) => c.from("tags").insert({ slug: "nova", rotulo: "Nova" }),
    ],
    [
      "update em tags",
      (c) =>
        c.from("tags").update({ rotulo: "Mudou" }).eq("slug", "tag-de-teste"),
    ],
    [
      "delete em tags",
      (c) => c.from("tags").delete().eq("slug", "tag-de-teste"),
    ],
  ];

  it.each(tentativas)("%s → erro e nada muda", async (_nome, tentativa) => {
    const antes = await fotoDoBanco();
    const { error } = await tentativa(anon);
    expect(error).not.toBeNull();
    expect(await fotoDoBanco()).toEqual(antes);
  });
});
