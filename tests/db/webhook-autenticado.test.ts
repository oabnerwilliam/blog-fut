/**
 * Revisão da história 14 (segurança do Vault). O `webhook.test.ts` prova que a chave
 * anon não chama `configurar_revalidacao` nem `remover_revalidacao`. Falta o papel
 * `authenticated`: na história 16 haverá usuários logados (o admin), e um usuário comum
 * que conseguisse chamar `configurar_revalidacao` trocaria a URL do webhook pela dele e
 * receberia o `x-revalidate-secret` em cada gravação. Só a `service_role` pode.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { clienteDeServico, supabaseLocal } from "./helpers/supabase-local";

const servico = clienteDeServico();
const EMAIL = "revisor-webhook@teste.local";
const SENHA = "senha-do-revisor-0123456789";

let usuarioId: string | undefined;
let logado: SupabaseClient;

beforeAll(async () => {
  // Sobra de uma rodada interrompida: apaga antes de criar.
  const { data: lista } = await servico.auth.admin.listUsers();
  for (const u of lista?.users ?? []) {
    if (u.email === EMAIL) await servico.auth.admin.deleteUser(u.id);
  }
  const { data, error } = await servico.auth.admin.createUser({
    email: EMAIL,
    password: SENHA,
    email_confirm: true,
  });
  expect(error).toBeNull();
  usuarioId = data.user?.id;

  const { url, anonKey } = supabaseLocal();
  logado = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  const { error: erroDoLogin } = await logado.auth.signInWithPassword({
    email: EMAIL,
    password: SENHA,
  });
  expect(erroDoLogin).toBeNull();
});

afterAll(async () => {
  if (usuarioId) await servico.auth.admin.deleteUser(usuarioId);
});

describe("papel authenticated não mexe no Vault do webhook", () => {
  it("a sessão é de fato authenticated", async () => {
    const { data } = await logado.auth.getSession();
    expect(data.session?.user.role).toBe("authenticated");
  });

  it("configurar_revalidacao → recusado (sequestro da URL do webhook)", async () => {
    const { error } = await logado.rpc("configurar_revalidacao", {
      p_url: "https://atacante.example/api/revalidar",
      p_segredo: "a".repeat(32),
    });
    expect(error).not.toBeNull();
  });

  it("remover_revalidacao → recusado (desligar a invalidação)", async () => {
    const { error } = await logado.rpc("remover_revalidacao");
    expect(error).not.toBeNull();
  });

  it("avisar_revalidacao → recusado como RPC", async () => {
    const { error } = await logado.rpc("avisar_revalidacao");
    expect(error).not.toBeNull();
  });
});
