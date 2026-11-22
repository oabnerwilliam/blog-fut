import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { unstable_rethrow } from "next/navigation";
import { adminHabilitado } from "@/lib/auth/config";
import {
  criarClienteDoServidor,
  obterSessaoDoAdmin,
} from "@/lib/auth/servidor";
import { recusaDoPainel } from "./painel";
import type { Recusa } from "./tipos";

/**
 * A primeira linha de toda server action do painel (história 17, critério 3; ADR 0009).
 *
 * Uma action é um endpoint que qualquer um chama com um POST, sem passar pela tela (guia
 * `server-actions.md`, "Authenticate and authorize"). Por isso, antes de qualquer
 * gravação:
 * 1. o admin precisa estar ligado (`ADMIN_HABILITADO`, U14): num preview, nada grava;
 * 2. a sessão vem do servidor (`getUser()`, que confere o token no Auth), nunca do
 *    formulário, e o perfil precisa estar `aprovado`;
 * 3. `eh_admin()` é conferida no banco, com o JWT de quem chama (um perfil revogado há um
 *    segundo já não passa).
 * O banco ainda confere `eh_admin()` na primeira linha de cada RPC e no RLS: é a última
 * camada.
 */
export interface AdminLogado {
  /** Cliente com a sessão de quem está logado (nunca a chave de serviço). */
  readonly cliente: SupabaseClient;
  readonly usuarioId: string;
}

export async function exigirAdmin(): Promise<
  { readonly ok: true; readonly admin: AdminLogado } | Recusa
> {
  if (!adminHabilitado(process.env)) return recusaDoPainel("nao_autorizado");
  try {
    const sessao = await obterSessaoDoAdmin();
    if (sessao === null || sessao.perfil?.status !== "aprovado") {
      return recusaDoPainel("nao_autorizado");
    }
    const cliente = await criarClienteDoServidor();
    const { data, error } = await cliente.rpc("eh_admin");
    if (error) {
      console.error("[admin] eh_admin falhou:", error.message);
      return recusaDoPainel("falha");
    }
    if (data !== true) return recusaDoPainel("nao_autorizado");
    return { ok: true, admin: { cliente, usuarioId: sessao.usuario.id } };
  } catch (erro) {
    // Os erros de controle do Next (o ponto dinâmico do prerender, notFound) seguem.
    unstable_rethrow(erro);
    console.error("[admin] não foi possível conferir a sessão:", erro);
    return recusaDoPainel("falha");
  }
}
