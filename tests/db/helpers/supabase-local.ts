import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { inject } from "vitest";

export interface SupabaseLocal {
  readonly url: string;
  readonly anonKey: string;
  readonly serviceRoleKey: string;
}

const SEM_SESSAO = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
} as const;

/** Valores do `supabase status`, lidos uma vez pelo global-setup. */
export function supabaseLocal(): SupabaseLocal {
  return inject("supabaseLocal");
}

/** Como o site: chave anon, sem sessão. O RLS decide o que ela vê. */
export function clienteAnonimo(): SupabaseClient {
  const { url, anonKey } = supabaseLocal();
  return createClient(url, anonKey, SEM_SESSAO);
}

/** Como os scripts: service_role, ignora o RLS. Só para preparar e conferir dados. */
export function clienteDeServico(): SupabaseClient {
  const { url, serviceRoleKey } = supabaseLocal();
  return createClient(url, serviceRoleKey, SEM_SESSAO);
}

/** Apaga tudo das três tabelas (revisões primeiro, por causa do `on delete restrict`). */
export async function limparBanco(servico: SupabaseClient): Promise<void> {
  for (const [tabela, coluna] of [
    ["article_revisions", "id"],
    ["articles", "id"],
    ["tags", "slug"],
  ] as const) {
    const { error } = await servico
      .from(tabela)
      .delete()
      .not(coluna, "is", null);
    if (error) throw new Error(`limpar ${tabela}: ${error.message}`);
  }
}
