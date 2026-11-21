import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";

function resumo(texto: string): Buffer {
  return createHash("sha256").update(texto, "utf8").digest();
}

/**
 * Compara o segredo recebido com o esperado em tempo constante (rotas de API da
 * história 14). O `timingSafeEqual` exige o mesmo tamanho; comparar os hashes SHA-256
 * dos dois lados resolve isso sem revelar o tamanho do segredo pelo tempo de resposta.
 *
 * Sem segredo configurado no servidor (ausente, vazio ou só espaços), nada confere:
 * uma variável esquecida na Vercel nunca abre a rota.
 */
export function segredoConfere(
  recebido: string | null | undefined,
  esperado: string | undefined,
): boolean {
  if (esperado === undefined || esperado.trim() === "") return false;
  if (recebido === null || recebido === undefined) return false;
  return timingSafeEqual(resumo(recebido), resumo(esperado));
}
