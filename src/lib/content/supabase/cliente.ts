import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ConexaoSupabase } from "../config";

/** Um cliente por URL + chave: ele não guarda estado de sessão, então pode ser reaproveitado. */
const clientes = new Map<string, SupabaseClient>();

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
    });
    clientes.set(chave, cliente);
  }
  return cliente;
}
