/**
 * Usuários reais no Supabase local para os testes de `tests/db/` (história 16). A
 * implementação fica em `tests/helpers/sessao-supabase.ts`, que o e2e de banco também
 * usa; aqui a conexão vem do `supabase status` lido pelo global-setup.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  criarUsuarioDeTeste,
  entrarComSenha,
  type StatusDoPerfil,
  type UsuarioDeTeste,
} from "../../helpers/sessao-supabase";
import { supabaseLocal } from "./supabase-local";

export {
  apagarUsuarios,
  definirStatus,
  type StatusDoPerfil,
  type UsuarioDeTeste,
} from "../../helpers/sessao-supabase";

export function criarUsuario(
  servico: SupabaseClient,
  opcoes: {
    email: string;
    status?: StatusDoPerfil;
    metadados?: Record<string, string>;
  },
): Promise<UsuarioDeTeste> {
  return criarUsuarioDeTeste(servico, supabaseLocal(), opcoes);
}

export function entrar(email: string): Promise<SupabaseClient> {
  return entrarComSenha(supabaseLocal(), email);
}
