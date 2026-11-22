/**
 * Configuração do login do admin (história 16). Funções puras sobre o ambiente, sem
 * `server-only`, porque o Proxy também as usa.
 */

export type AmbienteDoAuth = Readonly<Record<string, string | undefined>>;

/** URL e chave anon (publicável). A sessão do usuário vem dos cookies; o RLS decide. */
export interface ConexaoDoAuth {
  readonly url: string;
  readonly anonKey: string;
}

/**
 * U14: o `/admin` só existe com `ADMIN_HABILITADO=true` (exatamente). Qualquer outro
 * valor, inclusive ausente, desliga: os previews da Vercel e os testes com `files` nunca
 * mostram o login.
 */
export function adminHabilitado(env: AmbienteDoAuth): boolean {
  return env.ADMIN_HABILITADO === "true";
}

/** `/admin` e tudo abaixo dele. `/administracao` não é do admin. */
export function ehRotaDoAdmin(caminho: string): boolean {
  return caminho === "/admin" || caminho.startsWith("/admin/");
}

const VARIAVEIS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;

/** Lista todas as que faltam de uma vez, como `lerConfiguracao` do conteúdo. */
export function lerConexaoDoAuth(env: AmbienteDoAuth): ConexaoDoAuth {
  const faltando = VARIAVEIS.filter((nome) => (env[nome] ?? "").trim() === "");
  if (faltando.length > 0) {
    throw new Error(
      `Admin: faltam variáveis de ambiente (ausentes ou vazias): ${faltando.join(", ")}.`,
    );
  }
  return {
    url: env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim(),
  };
}
