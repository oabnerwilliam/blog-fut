/**
 * Webhook de invalidação (história 14, critério 2), contra o Supabase local. Um servidor
 * HTTP do próprio teste faz o papel do site: o Postgres (no Docker) chega nele por
 * `host.docker.internal`, o mesmo caminho do `pnpm test:e2e:db`.
 *
 * Confere o payload que `public.avisar_revalidacao()` manda (tabela, slug e slug_antigo
 * só quando muda), o header do segredo, o "sem Vault não faz nada" e quem pode configurar.
 */
import { createServer, type IncomingHttpHeaders, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { configurarVault } from "../../scripts/lib/vault";
import { HOST_DO_SITE_NO_DOCKER } from "../e2e-db/constantes";
import {
  clienteAnonimo,
  clienteDeServico,
  limparBanco,
} from "./helpers/supabase-local";

const servico = clienteDeServico();
const anon = clienteAnonimo();
const SEGREDO = "segredo-do-teste-de-webhook-0123456789";

interface Aviso {
  readonly caminho: string;
  readonly cabecalhos: IncomingHttpHeaders;
  readonly corpo: unknown;
}

const avisos: Aviso[] = [];
let servidor: Server;
let porta = 0;

const ARTIGO = {
  titulo: "Matéria do webhook",
  linha_fina: "Linha fina",
  editoria: "noticia",
  tags: ["tag-do-webhook"],
  publicado_em: "2026-11-21",
  autor: "Squad Fut",
  ficticio: true,
  fonte: "importacao",
  corpo_md: "Texto.\n",
  status: "publicado",
  revisao_publicada: 1,
};

/** Espera os avisos chegarem (o pg_net envia depois do commit, em segundo plano). */
async function esperarAvisos(
  quantos: number,
  prazoMs = 10_000,
): Promise<Aviso[]> {
  const fim = Date.now() + prazoMs;
  while (avisos.length < quantos && Date.now() < fim) {
    await new Promise((resolver) => setTimeout(resolver, 100));
  }
  return avisos.splice(0, avisos.length);
}

beforeAll(async () => {
  servidor = createServer((req, res) => {
    let bruto = "";
    req.on("data", (pedaco) => (bruto += pedaco));
    req.on("end", () => {
      avisos.push({
        caminho: req.url ?? "",
        cabecalhos: req.headers,
        corpo: JSON.parse(bruto || "null"),
      });
      res.writeHead(200, { "content-type": "application/json" });
      res.end("{}");
    });
  });
  await new Promise<void>((resolver) =>
    servidor.listen(0, "0.0.0.0", () => resolver()),
  );
  porta = (servidor.address() as AddressInfo).port;
  await limparBanco(servico);
  const { error } = await servico.rpc("remover_revalidacao");
  expect(error).toBeNull();
});

afterAll(async () => {
  await servico.rpc("remover_revalidacao");
  await limparBanco(servico);
  await new Promise((resolver) => servidor.close(resolver));
});

beforeEach(() => {
  avisos.length = 0;
});

describe("webhook sem Vault", () => {
  it("sem url_revalidar, a gravação passa e nada é enviado", async () => {
    const { error } = await servico
      .from("tags")
      .insert({ slug: "sem-vault", rotulo: "Sem Vault" });
    expect(error).toBeNull();
    expect(await esperarAvisos(1, 1_500)).toEqual([]);
  });
});

describe("webhook com o Vault configurado", () => {
  beforeAll(async () => {
    await configurarVault(servico, {
      base: `http://${HOST_DO_SITE_NO_DOCKER}:${porta}`,
      segredo: SEGREDO,
    });
  });

  it("tag nova: POST em /api/revalidar com o segredo e { tabela: tags, slug }", async () => {
    const { error } = await servico
      .from("tags")
      .insert({ slug: "tag-do-webhook", rotulo: "Tag do Webhook" });
    expect(error).toBeNull();
    const [aviso, ...resto] = await esperarAvisos(1);
    expect(resto).toEqual([]);
    expect(aviso.caminho).toBe("/api/revalidar");
    expect(aviso.cabecalhos["x-revalidate-secret"]).toBe(SEGREDO);
    expect(aviso.cabecalhos["content-type"]).toMatch(/application\/json/);
    expect(aviso.corpo).toEqual({ tabela: "tags", slug: "tag-do-webhook" });
  });

  it("matéria nova, slug trocado e matéria apagada", async () => {
    const { data, error } = await servico
      .from("articles")
      .insert({ ...ARTIGO, slug: "materia-do-webhook" })
      .select("id")
      .single();
    expect(error).toBeNull();
    expect((await esperarAvisos(1)).map((a) => a.corpo)).toEqual([
      { tabela: "articles", slug: "materia-do-webhook" },
    ]);

    const troca = await servico
      .from("articles")
      .update({ slug: "materia-renomeada" })
      .eq("id", data!.id);
    expect(troca.error).toBeNull();
    expect((await esperarAvisos(1)).map((a) => a.corpo)).toEqual([
      {
        tabela: "articles",
        slug: "materia-renomeada",
        slug_antigo: "materia-do-webhook",
      },
    ]);

    const titulo = await servico
      .from("articles")
      .update({ titulo: "Outro título" })
      .eq("id", data!.id);
    expect(titulo.error).toBeNull();
    // slug igual: o slug_antigo não vai
    expect((await esperarAvisos(1)).map((a) => a.corpo)).toEqual([
      { tabela: "articles", slug: "materia-renomeada" },
    ]);

    const apagar = await servico.from("articles").delete().eq("id", data!.id);
    expect(apagar.error).toBeNull();
    expect((await esperarAvisos(1)).map((a) => a.corpo)).toEqual([
      { tabela: "articles", slug: "materia-renomeada" },
    ]);
  });

  it("update que não muda nada não avisa", async () => {
    const { error } = await servico
      .from("tags")
      .update({ rotulo: "Tag do Webhook" })
      .eq("slug", "tag-do-webhook");
    expect(error).toBeNull();
    expect(await esperarAvisos(1, 1_500)).toEqual([]);
  });

  it("site fora do ar (porta sem ninguém): a gravação passa", async () => {
    await configurarVault(servico, {
      base: `http://${HOST_DO_SITE_NO_DOCKER}:9`,
      segredo: SEGREDO,
    });
    const { error } = await servico
      .from("tags")
      .insert({ slug: "site-fora", rotulo: "Site Fora" });
    expect(error).toBeNull();
    await configurarVault(servico, {
      base: `http://${HOST_DO_SITE_NO_DOCKER}:${porta}`,
      segredo: SEGREDO,
    });
  });
});

describe("quem configura o Vault", () => {
  it.each(["configurar_revalidacao", "remover_revalidacao"])(
    "anon não executa %s",
    async (funcao) => {
      const args =
        funcao === "configurar_revalidacao"
          ? { p_url: "http://x.app/api/revalidar", p_segredo: "a".repeat(20) }
          : {};
      const { error } = await anon.rpc(funcao, args);
      expect(error).not.toBeNull();
    },
  );

  it("anon não chama a função do trigger como RPC", async () => {
    const { error } = await anon.rpc("avisar_revalidacao");
    expect(error).not.toBeNull();
  });

  it.each([
    ["URL sem /api/revalidar", "http://x.app/", "a".repeat(20)],
    ["URL que não é http", "ftp://x.app/api/revalidar", "a".repeat(20)],
    ["segredo curto", "http://x.app/api/revalidar", "xyz-7"],
  ])("%s → erro, sem citar o segredo", async (_caso, p_url, p_segredo) => {
    const { error } = await servico.rpc("configurar_revalidacao", {
      p_url,
      p_segredo,
    });
    expect(error).not.toBeNull();
    expect(error!.message).not.toContain(p_segredo);
  });
});
