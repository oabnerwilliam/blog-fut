import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { StatusDoPerfil } from "@/lib/auth/servidor";

/**
 * Núcleo das decisões de acesso (história 16; spec v2 §7.6; ADR 0009). As server actions
 * de `acessos.ts` só juntam a sessão a esta função; aqui ficam as regras, testadas contra
 * o Supabase local com o JWT de cada usuário (`tests/db/acessos.test.ts`).
 *
 * Camada do servidor: confere `eh_admin()` no banco, recusa o próprio usuário e só aceita
 * a transição a partir do status esperado. Camada do banco: o RLS de `perfis` repete as
 * duas primeiras regras e exige `decidido_por = auth.uid()`.
 */

export type Decisao = "aceitar" | "recusar" | "revogar" | "reabrir";

/**
 * De onde cada ação parte e aonde chega. "Reabrir" devolve o pedido para os pendentes:
 * um admin decide de novo, com Aceitar ou Recusar (decisão da história 16, ADR 0009).
 */
export const TRANSICOES: Readonly<
  Record<
    Decisao,
    { readonly de: readonly StatusDoPerfil[]; readonly para: StatusDoPerfil }
  >
> = {
  aceitar: { de: ["pendente"], para: "aprovado" },
  recusar: { de: ["pendente"], para: "recusado" },
  revogar: { de: ["aprovado"], para: "revogado" },
  reabrir: { de: ["recusado", "revogado"], para: "pendente" },
};

export type ErroDaDecisao =
  | "nao_autorizado"
  | "proprio_usuario"
  | "id_invalido"
  | "decisao_invalida"
  | "estado_mudou"
  | "falha";

export type ResultadoDaDecisao =
  | { readonly ok: true; readonly status: StatusDoPerfil }
  | {
      readonly ok: false;
      readonly erro: ErroDaDecisao;
      readonly mensagem: string;
    };

const MENSAGENS: Record<ErroDaDecisao, string> = {
  nao_autorizado: "Você não tem permissão para decidir pedidos de acesso.",
  proprio_usuario: "Você não pode mudar o seu próprio acesso.",
  id_invalido: "Pedido de acesso inválido.",
  decisao_invalida: "Ação desconhecida.",
  estado_mudou:
    "Esse pedido mudou desde que a página foi aberta. Recarregue e confira.",
  falha: "Não foi possível gravar a decisão. Tente de novo em instantes.",
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A recusa com a mensagem da tela (pt-BR). */
export function recusaDaDecisao(erro: ErroDaDecisao): ResultadoDaDecisao {
  return { ok: false, erro, mensagem: MENSAGENS[erro] };
}

const recusa = recusaDaDecisao;

function ehDecisao(valor: unknown): valor is Decisao {
  return typeof valor === "string" && Object.hasOwn(TRANSICOES, valor);
}

export interface PedidoDeDecisao {
  /** Cliente com a sessão de quem decide (nunca a chave de serviço). */
  readonly cliente: SupabaseClient;
  /** Id de quem está logado: vira `decidido_por`. */
  readonly decisorId: string;
  /** Vem do formulário: não confiável até ser validado. */
  readonly alvoId: unknown;
  readonly decisao: Decisao;
  readonly agora?: () => Date;
}

export async function decidirAcesso({
  cliente,
  decisorId,
  alvoId,
  decisao,
  agora = () => new Date(),
}: PedidoDeDecisao): Promise<ResultadoDaDecisao> {
  if (!ehDecisao(decisao)) return recusa("decisao_invalida");
  if (typeof alvoId !== "string" || !UUID.test(alvoId)) {
    return recusa("id_invalido");
  }
  if (alvoId.toLowerCase() === decisorId.toLowerCase()) {
    return recusa("proprio_usuario");
  }

  const { data: ehAdmin, error: erroDoAdmin } = await cliente.rpc("eh_admin");
  if (erroDoAdmin) {
    console.error("[admin] eh_admin falhou:", erroDoAdmin.message);
    return recusa("falha");
  }
  if (ehAdmin !== true) return recusa("nao_autorizado");

  const { de, para } = TRANSICOES[decisao];
  const { data, error } = await cliente
    .from("perfis")
    .update({
      status: para,
      decidido_por: decisorId,
      decidido_em: agora().toISOString(),
    })
    .eq("user_id", alvoId)
    // Só a partir do status esperado: dois admins decidindo ao mesmo tempo não se atropelam.
    .in("status", [...de])
    .select("status");
  if (error) {
    console.error("[admin] a decisão de acesso falhou:", error.message);
    return recusa("falha");
  }
  if (!data || data.length === 0) return recusa("estado_mudou");
  return { ok: true, status: para };
}
