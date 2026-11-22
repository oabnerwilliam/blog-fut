/**
 * Usuários reais no Supabase local para os testes do admin (história 16).
 *
 * - `auth.admin.createUser` (service_role) cria o usuário já confirmado. O trigger da
 *   migração cria o perfil `pendente`.
 * - O status é ajustado pela service_role, que ignora o RLS.
 * - `signInWithPassword` devolve um cliente com o JWT do próprio usuário: é o que uma
 *   conta Google qualquer teria ao chamar a API direto.
 *
 * E-mails sempre `@exemplo.test` (domínio reservado, nunca entrega nada).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseLocal } from "./supabase-local";

export type StatusDoPerfil = "pendente" | "aprovado" | "recusado" | "revogado";

export interface UsuarioDeTeste {
  readonly id: string;
  readonly email: string;
  /** Cliente com a chave anon e a sessão do usuário (JWT próprio). */
  readonly cliente: SupabaseClient;
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

export async function criarUsuario(
  servico: SupabaseClient,
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
  return { id, email, cliente: await entrar(email) };
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
export async function entrar(email: string): Promise<SupabaseClient> {
  const { url, anonKey } = supabaseLocal();
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
