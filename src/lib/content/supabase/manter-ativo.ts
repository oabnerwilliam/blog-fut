import "server-only";
import type { ConexaoSupabase } from "../config";
import { criarClienteAnonimo } from "./cliente";

/**
 * Leitura leve do keep-alive (U11): `select slug from articles limit 1`, com a chave anon
 * (o RLS vale). Qualquer falha vira `false`: quem chama responde 503, nunca 500.
 */
export async function cutucarSupabase(
  conexao: ConexaoSupabase,
): Promise<boolean> {
  try {
    const { error } = await criarClienteAnonimo(conexao)
      .from("articles")
      .select("slug")
      .limit(1);
    if (error) {
      console.error(
        "[manter-ativo] o Supabase respondeu com erro:",
        error.message,
      );
      return false;
    }
    return true;
  } catch (erro) {
    console.error("[manter-ativo] o Supabase não respondeu:", erro);
    return false;
  }
}
