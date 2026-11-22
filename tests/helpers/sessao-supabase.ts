/**
 * Usuários e sessões reais no Supabase local, para os testes do admin (história 16).
 * Sem Vitest nem Playwright: os dois usam (tests/db/helpers e tests/e2e-db).
 *
 * - `auth.admin.createUser` (service_role) cria o usuário já confirmado; o trigger da
 *   migração cria o perfil `pendente`. O status é ajustado pela service_role.
 * - `signInWithPassword` devolve um cliente com o JWT do próprio usuário: é o que uma
 *   conta Google qualquer teria ao chamar a API direto. O login por senha só existe no
 *   Supabase local (`config.toml`); na produção, o e-mail fica desligado.
 * - `cookiesDaSessao` gera os cookies no formato do `@supabase/ssr` pela própria
 *   biblioteca: um `createServerClient` com um pote em memória recebe a sessão
 *   (`setSession`) e grava os cookies do jeito dele (nome `sb-<host>-auth-token`, valor
 *   `base64-<json>`, pedaços `.0`, `.1` se passar de ~3 KB). Os testes nunca montam esse
 *   formato à mão, então uma versão nova do pacote não os quebra por engano.
 *
 * E-mails sempre `@exemplo.test` (domínio reservado, nunca entrega nada).
 */
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type StatusDoPerfil = "pendente" | "aprovado" | "recusado" | "revogado";

/** URL e chave anon do Supabase local. */
export interface ConexaoLocal {
  readonly url: string;
  readonly anonKey: string;
}

export interface UsuarioDeTeste {
  readonly id: string;
  readonly email: string;
  /** Cliente com a chave anon e a sessão do usuário (JWT próprio). */
  readonly cliente: SupabaseClient;
}

export interface CookieSimples {
  readonly name: string;
  readonly value: string;
}

const SENHA = "senha-de-teste-local";

export async function apagarUsuarios(
  servico: SupabaseClient,
  emails: readonly string[],
): Promise<void> {
  const alvo = new Set(emails.map((e) => e.toLowerCase()));
  const { data, error } = await servico.auth.admin.listUsers({
    perPage: 1000,
  });
  if (error) throw new Error(`listar usuários: ${error.message}`);
  for (const usuario of data.users) {
    if (usuario.email && alvo.has(usuario.email.toLowerCase())) {
      const { error: erro } = await servico.auth.admin.deleteUser(usuario.id);
      if (erro) throw new Error(`apagar usuário: ${erro.message}`);
    }
  }
}

export async function definirStatus(
  servico: SupabaseClient,
  userId: string,
  status: StatusDoPerfil,
): Promise<void> {
  const { error } = await servico
    .from("perfis")
    .update({ status })
    .eq("user_id", userId);
  if (error) throw new Error(`definir status: ${error.message}`);
}

/** Um cliente novo, logado por senha, sem guardar sessão em disco. */
export async function entrarComSenha(
  { url, anonKey }: ConexaoLocal,
  email: string,
): Promise<SupabaseClient> {
  const cliente = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  const { error } = await cliente.auth.signInWithPassword({
    email,
    password: SENHA,
  });
  if (error) throw new Error(`entrar: ${error.message}`);
  return cliente;
}

export async function criarUsuarioDeTeste(
  servico: SupabaseClient,
  conexao: ConexaoLocal,
  {
    email,
    status,
    metadados = {},
  }: {
    email: string;
    status?: StatusDoPerfil;
    metadados?: Record<string, string>;
  },
): Promise<UsuarioDeTeste> {
  await apagarUsuarios(servico, [email]);
  const { data, error } = await servico.auth.admin.createUser({
    email,
    password: SENHA,
    email_confirm: true,
    user_metadata: metadados,
  });
  if (error || !data.user) {
    throw new Error(`criar usuário: ${error?.message ?? "sem usuário"}`);
  }
  const id = data.user.id;
  if (status !== undefined && status !== "pendente") {
    await definirStatus(servico, id, status);
  }
  return { id, email, cliente: await entrarComSenha(conexao, email) };
}

/** Os cookies que o navegador teria depois de entrar com essa sessão. */
export async function gerarCookiesDaSessao(
  { url, anonKey }: ConexaoLocal,
  logado: SupabaseClient,
): Promise<CookieSimples[]> {
  const { data, error } = await logado.auth.getSession();
  if (error || !data.session) {
    throw new Error(`sem sessão para gerar cookies: ${error?.message ?? ""}`);
  }
  const pote = new Map<string, string>();
  const cliente = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => [...pote].map(([name, value]) => ({ name, value })),
      setAll(aGravar) {
        for (const { name, value } of aGravar) {
          if (value === "") pote.delete(name);
          else pote.set(name, value);
        }
      },
    },
  });
  const { error: erro } = await cliente.auth.setSession({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });
  if (erro) throw new Error(`setSession: ${erro.message}`);
  if (pote.size === 0) throw new Error("o @supabase/ssr não gravou cookie");
  return [...pote].map(([name, value]) => ({ name, value }));
}
