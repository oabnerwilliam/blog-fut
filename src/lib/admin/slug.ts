/**
 * O slug sugerido a partir do título no editor (história 18, critério 1). Função pura,
 * sem `server-only`: o formulário de criação (cliente) sugere o slug enquanto a pessoa
 * digita, e o servidor valida de novo com o `SLUG_REGEX`.
 */

/** O teto do slug criado no painel: cabe numa URL legível e num `title` de aba. */
export const TAMANHO_MAXIMO_DO_SLUG = 80;

/**
 * Letras que o NFD não separa em letra + acento (ß não vira "s" + marca, por exemplo).
 * Sem esta troca, viram hífen e a palavra se parte ao meio ("stra-e").
 */
const LETRAS_SEM_DECOMPOSICAO: Readonly<Record<string, string>> = {
  ß: "ss",
  æ: "ae",
  œ: "oe",
  ø: "o",
  ł: "l",
  đ: "d",
  ð: "d",
  þ: "th",
  ı: "i",
};

/**
 * "São Paulo é campeão!" → "sao-paulo-e-campeao".
 *
 * 1. NFD separa a letra do acento ("ã" vira "a" + til) e o `\p{M}` tira os acentos; o
 *    "ç" vira "c" do mesmo jeito.
 * 2. Minúsculas, e o que não é a-z nem 0-9 (espaço, pontuação, emoji, "_") vira um hífen
 *    só, mesmo em sequência. Os hífens das pontas saem.
 * 3. Acima de 80 caracteres, corta na última palavra inteira que cabe. Uma palavra só,
 *    maior que 80, é cortada em 80.
 *
 * Título sem letra nem número ("?!", "⚽") dá `""`: quem cria recusa com um erro claro.
 */
export function gerarSlug(titulo: string): string {
  const completo = titulo
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[ßæœøłđðþı]/g, (letra) => LETRAS_SEM_DECOMPOSICAO[letra])
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (completo.length <= TAMANHO_MAXIMO_DO_SLUG) return completo;

  // O caractere logo depois do corte é um hífen: o corte já cai entre duas palavras.
  if (completo[TAMANHO_MAXIMO_DO_SLUG] === "-") {
    return completo.slice(0, TAMANHO_MAXIMO_DO_SLUG);
  }
  const cabe = completo.slice(0, TAMANHO_MAXIMO_DO_SLUG);
  const ultimoHifen = cabe.lastIndexOf("-");
  return (ultimoHifen > 0 ? cabe.slice(0, ultimoHifen) : cabe).replace(
    /-+$/,
    "",
  );
}
