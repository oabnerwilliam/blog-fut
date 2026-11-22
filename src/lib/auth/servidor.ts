import "server-only";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { cache } from "react";
import { lerConexaoDoAuth } from "./config";

/**
 * Sessão do admin no servidor (história 16; spec v2 §7.6; ADR 0009).
 *
 * Duas camadas: o servidor confere a sessão e o status aqui, antes de mostrar uma tela
 * ou gravar; o RLS do banco é a garantia final (o cliente usa a sessão do usuário, nunca
 * a chave de serviço).
 */

export type StatusDoPerfil = "pendente" | "aprovado" | "recusado" | "revogado";

export interface Perfil {
  readonly userId: string;
  readonly email: string | null;
  readonly nome: string | null;
  readonly avatarUrl: string | null;
  readonly status: StatusDoPerfil;
  readonly papel: "admin";
  readonly decididoPor: string | null;
  readonly decididoEm: string | null;
  readonly criadoEm: string;
}

/** Só o que as telas precisam do usuário do Auth. */
export interface UsuarioDoAdmin {
  readonly id: string;
  readonly email: string | null;
}

export interface SessaoDoAdmin {
  readonly usuario: UsuarioDoAdmin;
  /** Nulo só se o trigger de perfis não rodou (anomalia): o layout trata como sem acesso. */
  readonly perfil: Perfil | null;
}

/** Linha de `public.perfis`, com os nomes do banco. */
export interface LinhaDoPerfil {
  user_id: string;
  email: string | null;
  nome: string | null;
  avatar_url: string | null;
  status: StatusDoPerfil;
  papel: "admin";
  decidido_por: string | null;
  decidido_em: string | null;
  created_at: string;
}

export const COLUNAS_DO_PERFIL =
  "user_id,email,nome,avatar_url,status,papel,decidido_por,decidido_em,created_at";

export function paraPerfil(linha: LinhaDoPerfil): Perfil {
  return {
    userId: linha.user_id,
    email: linha.email,
    nome: linha.nome,
    avatarUrl: linha.avatar_url,
    status: linha.status,
    papel: linha.papel,
    decididoPor: linha.decidido_por,
    decididoEm: linha.decidido_em,
    criadoEm: linha.created_at,
  };
}

/**
 * Cliente Supabase com a sessão dos cookies da requisição (padrão do `@supabase/ssr`
 * com `getAll`/`setAll`). Crie um por requisição; nunca compartilhe.
 *
 * Em Server Action e Route Handler, `setAll` grava os cookies (login, logout, sessão
 * renovada). Num Server Component, o Next não deixa gravar cookie (doc `cookies.md`), e
 * o `set` lança: o erro é engolido, porque quem renova a sessão antes da renderização é
 * o Proxy (`sessao-no-proxy.ts`).
 *
 * O `connection()` vem antes: o cliente do Auth lê o relógio (`Date.now()`) para saber se
 * o token venceu, e com Cache Components isso só pode rodar na fase da requisição, não
 * na pré-renderização (doc `connection.md`). Sem ele, o Next acusa
 * "encountered the unstable value Date.now() while prerendering".
 */
export async function criarClienteDoServidor(): Promise<SupabaseClient> {
  const { url, anonKey } = lerConexaoDoAuth(process.env);
  await connection();
  const loja = await cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => loja.getAll(),
      setAll(aGravar) {
        try {
          for (const { name, value, options } of aGravar) {
            loja.set(name, value, options);
          }
        } catch {
          // Server Component: o Proxy já renovou a sessão nesta requisição.
        }
      },
    },
  });
}

/**
 * Quem está logado e o perfil dele, ou `null` sem sessão válida.
 *
 * Usa `getUser()`, que confere o token no servidor do Auth. O `getSession()` só lê o
 * cookie, que o navegador pode forjar: nunca serve para autorizar. Memorizada por
 * requisição (`cache` do React): o layout e a página leem uma vez só.
 */
export const obterSessaoDoAdmin = cache(
  async (): Promise<SessaoDoAdmin | null> => {
    const cliente = await criarClienteDoServidor();
    const { data, error } = await cliente.auth.getUser();
    if (error || !data.user) return null;

    const { data: linha, error: erroDoPerfil } = await cliente
      .from("perfis")
      .select(COLUNAS_DO_PERFIL)
      .eq("user_id", data.user.id)
      .maybeSingle();
    if (erroDoPerfil) {
      throw new Error(`Não foi possível ler o perfil: ${erroDoPerfil.message}`);
    }

    return {
      usuario: { id: data.user.id, email: data.user.email ?? null },
      perfil: linha ? paraPerfil(linha as LinhaDoPerfil) : null,
    };
  },
);
