"use server";
import "server-only";
import { refresh } from "next/cache";
import {
  criarClienteDoServidor,
  obterSessaoDoAdmin,
} from "@/lib/auth/servidor";
import {
  decidirAcesso,
  recusaDaDecisao,
  type Decisao,
  type ResultadoDaDecisao,
} from "./decisoes";

/**
 * Server actions de `/admin/acessos` (história 16, critério 4; spec v2 §7.6).
 *
 * Tudo que este arquivo exporta vira um endpoint que qualquer um pode chamar com um POST,
 * sem passar pela tela (guia `server-actions.md`, "Authenticate and authorize"). Por isso
 * cada action lê a sessão no servidor, recusa quem não está aprovado antes de ir ao
 * banco e passa a decisão para `decidirAcesso`, que confere `eh_admin()` e recusa o
 * próprio usuário. O RLS de `perfis` é a última camada.
 *
 * O `userId` vem do formulário e é validado em `decidirAcesso`. Na fase 2, a tela liga
 * cada botão com `aceitar.bind(null, userId)`.
 */
async function decidir(
  decisao: Decisao,
  userId: unknown,
): Promise<ResultadoDaDecisao> {
  let sessao;
  try {
    sessao = await obterSessaoDoAdmin();
  } catch (erro) {
    console.error("[admin] não foi possível ler a sessão:", erro);
    return recusaDaDecisao("falha");
  }
  if (sessao === null || sessao.perfil?.status !== "aprovado") {
    return recusaDaDecisao("nao_autorizado");
  }

  const resultado = await decidirAcesso({
    cliente: await criarClienteDoServidor(),
    decisorId: sessao.usuario.id,
    alvoId: userId,
    decisao,
  });
  // A lista de pedidos é lida a cada requisição (cookies), então basta atualizar a tela.
  if (resultado.ok) refresh();
  return resultado;
}

export async function aceitar(userId: string): Promise<ResultadoDaDecisao> {
  return decidir("aceitar", userId);
}

export async function recusar(userId: string): Promise<ResultadoDaDecisao> {
  return decidir("recusar", userId);
}

export async function revogar(userId: string): Promise<ResultadoDaDecisao> {
  return decidir("revogar", userId);
}

export async function reabrir(userId: string): Promise<ResultadoDaDecisao> {
  return decidir("reabrir", userId);
}
