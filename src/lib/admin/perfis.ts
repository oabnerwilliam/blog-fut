import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  COLUNAS_DO_PERFIL,
  paraPerfil,
  type LinhaDoPerfil,
  type Perfil,
  type StatusDoPerfil,
} from "@/lib/auth/servidor";
import { iniciaisDe, nomeParaExibir } from "./formatos";

/**
 * Leitura dos pedidos de acesso para `/admin/acessos` (história 16, critério 4).
 *
 * Lê com o cliente da sessão: o RLS de `perfis` só devolve todos para um admin. Um
 * pendente que chegasse aqui veria só o próprio perfil (o layout nem deixa chegar).
 */

/** Quem decidiu: um admin pelo painel, ou o `pnpm admin:promover` (decidido_por nulo). */
export type Decisor =
  | { readonly por: "pessoa"; readonly nome: string }
  | { readonly por: "comando" };

export interface PedidoDeAcesso {
  readonly userId: string;
  /** O nome do Google, ou o e-mail quando não há nome. */
  readonly nome: string;
  readonly email: string | null;
  readonly avatarUrl: string | null;
  readonly iniciais: string;
  readonly status: StatusDoPerfil;
  readonly pedidoEm: string;
  readonly decididoEm: string | null;
  /** Nulo enquanto ninguém decidiu. */
  readonly decisao: Decisor | null;
  /** A linha de quem está logado: aparece sem ações. */
  readonly ehVoce: boolean;
}

export interface PedidosDeAcesso {
  /** Do pedido mais antigo para o mais novo: uma fila. */
  readonly pendentes: readonly PedidoDeAcesso[];
  /** Da decisão mais antiga para a mais nova; o primeiro admin (por comando) vem antes. */
  readonly aprovados: readonly PedidoDeAcesso[];
  /** Recusados e revogados, na ordem da decisão. */
  readonly negados: readonly PedidoDeAcesso[];
}

const porData =
  (campo: (p: PedidoDeAcesso) => string | null) =>
  (a: PedidoDeAcesso, b: PedidoDeAcesso): number => {
    const x = campo(a) ?? "";
    const y = campo(b) ?? "";
    if (x !== y) return Date.parse(x || "0") - Date.parse(y || "0");
    return a.nome.localeCompare(b.nome, "pt-BR");
  };

/** Função pura: monta os três grupos a partir dos perfis lidos. */
export function agruparPedidos(
  perfis: readonly Perfil[],
  usuarioId: string,
): PedidosDeAcesso {
  const nomes = new Map(
    perfis.map((p) => [p.userId, nomeParaExibir(p.nome, p.email)]),
  );
  const pedidos = perfis.map((p): PedidoDeAcesso => {
    let decisao: Decisor | null = null;
    if (p.decididoEm !== null) {
      decisao =
        p.decididoPor === null
          ? { por: "comando" }
          : { por: "pessoa", nome: nomes.get(p.decididoPor) ?? "um admin" };
    }
    return {
      userId: p.userId,
      nome: nomeParaExibir(p.nome, p.email),
      email: p.email,
      avatarUrl: p.avatarUrl,
      iniciais: iniciaisDe(p.nome, p.email),
      status: p.status,
      pedidoEm: p.criadoEm,
      decididoEm: p.decididoEm,
      decisao,
      ehVoce: p.userId === usuarioId,
    };
  });
  return {
    pendentes: pedidos
      .filter((p) => p.status === "pendente")
      .sort(porData((p) => p.pedidoEm)),
    aprovados: pedidos
      .filter((p) => p.status === "aprovado")
      .sort(porData((p) => p.decididoEm)),
    negados: pedidos
      .filter((p) => p.status === "recusado" || p.status === "revogado")
      .sort(porData((p) => p.decididoEm)),
  };
}

export async function listarPedidosDeAcesso(
  cliente: SupabaseClient,
  usuarioId: string,
): Promise<PedidosDeAcesso> {
  const { data, error } = await cliente
    .from("perfis")
    .select(COLUNAS_DO_PERFIL)
    .order("created_at", { ascending: true });
  if (error) {
    throw new Error(
      `Não foi possível ler os pedidos de acesso: ${error.message}`,
    );
  }
  return agruparPedidos((data as LinhaDoPerfil[]).map(paraPerfil), usuarioId);
}
