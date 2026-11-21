/** Peças comuns das CLIs de `scripts/` (história 15). */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Ambiente } from "./ambiente";

/** service_role: grava ignorando o RLS. Só existe em comando local, nunca no site. */
export function criarClienteDeServico(ambiente: Ambiente): SupabaseClient {
  return createClient(ambiente.url, ambiente.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Roda o comando; qualquer erro vira a mensagem no stderr e o código de saída 1. */
export function executarCli(comando: () => Promise<void>): void {
  comando().catch((erro: unknown) => {
    console.error(erro instanceof Error ? erro.message : erro);
    process.exit(1);
  });
}
