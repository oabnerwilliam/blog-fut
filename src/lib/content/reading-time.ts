export const PALAVRAS_POR_MINUTO = 200;

const TEM_LETRA_OU_DIGITO = /[\p{L}\p{N}]/u;

/** Tokens separados por espaço em branco que contenham ao menos uma letra ou dígito. */
export function contarPalavras(md: string): number {
  return md.split(/\s+/u).filter((token) => TEM_LETRA_OU_DIGITO.test(token))
    .length;
}

/** Minutos de leitura: 200 palavras por minuto, arredondado para cima, mínimo 1. */
export function readingTime(md: string): number {
  return Math.max(1, Math.ceil(contarPalavras(md) / PALAVRAS_POR_MINUTO));
}
