import type { Article } from "./types";

/** NFD → remove marcas → minúsculas pt-BR → colapsa espaços → apara. */
export function normalizarParaBusca(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/\s+/gu, " ")
    .trim();
}

/** Normaliza e quebra em termos; "" ou só espaços → []. */
export function termosDaBusca(query: string): string[] {
  const normalizada = normalizarParaBusca(query);
  return normalizada === "" ? [] : normalizada.split(" ");
}

/** Texto normalizado de título, linha fina, tags (slug e rótulo) e corpo, um por linha. */
export function textoBuscavel(artigo: Article): string {
  return [
    artigo.titulo,
    artigo.linha_fina,
    ...artigo.tags.flatMap((tag) => [tag.slug.replace(/-/g, " "), tag.rotulo]),
    artigo.corpo_md,
  ]
    .map(normalizarParaBusca)
    .join("\n");
}

/** Verdadeiro se todos os termos aparecem como substring (E lógico). */
export function correspondeABusca(
  textoNormalizado: string,
  termos: readonly string[],
): boolean {
  return termos.every((termo) => textoNormalizado.includes(termo));
}
