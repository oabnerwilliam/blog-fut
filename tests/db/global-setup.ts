/**
 * Roda uma vez antes dos testes de banco: lê URL e chaves do Supabase local pelo
 * `supabase status`, sem depender do `.env.local`. Nada aqui aponta para a produção.
 */
import { execSync } from "node:child_process";
import type { TestProject } from "vitest/node";
import type { SupabaseLocal } from "./helpers/supabase-local";

declare module "vitest" {
  export interface ProvidedContext {
    supabaseLocal: SupabaseLocal;
  }
}

/**
 * Logo depois do `supabase db reset`, a API (PostgREST) ainda está reconectando ao banco
 * e responde erro por alguns segundos. Espera ela ler a tabela de verdade.
 */
async function esperarApi(url: string, chave: string): Promise<void> {
  let ultimo = "";
  for (let tentativa = 0; tentativa < 60; tentativa++) {
    try {
      const resposta = await fetch(
        `${url}/rest/v1/articles?select=slug&limit=1`,
        {
          headers: { apikey: chave, Authorization: `Bearer ${chave}` },
        },
      );
      if (resposta.ok) return;
      ultimo = `HTTP ${resposta.status}`;
    } catch (erro) {
      ultimo = erro instanceof Error ? erro.message : String(erro);
    }
    await new Promise((resolver) => setTimeout(resolver, 500));
  }
  throw new Error(`A API do Supabase local não respondeu em 30 s (${ultimo}).`);
}

export default async function setup(project: TestProject): Promise<void> {
  let saida: string;
  try {
    saida = execSync("pnpm exec supabase status -o json", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    throw new Error(
      "Supabase local fora do ar. Rode `pnpm db:start` (ou use `pnpm test:db`, que já sobe o banco).",
    );
  }
  const json = JSON.parse(
    saida.slice(saida.indexOf("{"), saida.lastIndexOf("}") + 1),
  ) as Record<string, string>;
  const url = json.API_URL;
  if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(url)) {
    throw new Error(
      `O Supabase dos testes precisa ser local (recebido: ${url}).`,
    );
  }
  await esperarApi(url, json.SERVICE_ROLE_KEY);
  project.provide("supabaseLocal", {
    url,
    anonKey: json.ANON_KEY,
    serviceRoleKey: json.SERVICE_ROLE_KEY,
  });
}
