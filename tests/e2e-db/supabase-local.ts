/**
 * URL e chaves do Supabase local para o e2e de banco, lidas do `supabase status` (como o
 * `tests/db/global-setup.ts`). Nada daqui aponta para a produção: a URL precisa ser local.
 *
 * O resultado fica em `process.env.SUPABASE_LOCAL_E2E`, para os workers do Playwright
 * (que herdam o ambiente) não rodarem o `supabase status` de novo.
 */
import { execSync } from "node:child_process";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export interface SupabaseLocal {
  readonly url: string;
  readonly anonKey: string;
  readonly serviceRoleKey: string;
}

export function lerSupabaseLocal(): SupabaseLocal {
  const guardado = process.env.SUPABASE_LOCAL_E2E;
  if (guardado) return JSON.parse(guardado) as SupabaseLocal;

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
  if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(json.API_URL)) {
    throw new Error(
      `O Supabase do e2e precisa ser local (recebido: ${json.API_URL}).`,
    );
  }
  const local: SupabaseLocal = {
    url: json.API_URL,
    anonKey: json.ANON_KEY,
    serviceRoleKey: json.SERVICE_ROLE_KEY,
  };
  process.env.SUPABASE_LOCAL_E2E = JSON.stringify(local);
  return local;
}

/** service_role: só para preparar e conferir dados no banco local. */
export function clienteDeServico(): SupabaseClient {
  const { url, serviceRoleKey } = lerSupabaseLocal();
  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
