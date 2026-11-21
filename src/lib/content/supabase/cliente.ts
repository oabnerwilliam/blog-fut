import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ConexaoSupabase } from "../config";

/** Um cliente por URL + chave: ele não guarda estado de sessão, então pode ser reaproveitado. */
const clientes = new Map<string, SupabaseClient>();

/**
 * Toda requisição do supabase-js sai com `cache: "no-store"`. Sem isso, o `fetch` do
 * Next guarda a resposta no fetch cache persistente (`.next/cache/fetch-cache`), por
 * baixo do "use cache": o build seguinte reaproveitava dados velhos, e o `revalidateTag`
 * não alcança essas entradas (ADR 0008, §4). Dentro de um escopo "use cache", o
 * `no-store` não torna a rota dinâmica (`markCurrentScopeAsDynamic` ignora o escopo de
 * cache); quem guarda o resultado é só o "use cache", com as etiquetas.
 *
 * O `fetch` global é lido a cada chamada, porque o Next o substitui pela versão dele.
 */
export const fetchSemCacheDoNext: typeof fetch = (input, init) =>
  globalThis.fetch(input, { ...init, cache: "no-store" });

/**
 * Cliente de leitura pública, com a chave anon. Sem sessão: o site nunca faz login, e
 * sem isso o supabase-js tentaria usar localStorage e renovar token em segundo plano.
 */
export function criarClienteAnonimo({
  url,
  anonKey,
}: ConexaoSupabase): SupabaseClient {
  const chave = `${url}\n${anonKey}`;
  let cliente = clientes.get(chave);
  if (cliente === undefined) {
    cliente = createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: { fetch: fetchSemCacheDoNext },
    });
    clientes.set(chave, cliente);
  }
  return cliente;
}
