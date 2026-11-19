/**
 * Lista fechada de editorias (spec, seção 6.2).
 * A ordem é a posição no array: ordem da nav e da numeração 01–07 (feita no CSS).
 */
export const EDITORIAS = [
  { slug: "analise", rotulo: "Análise" },
  { slug: "cronica", rotulo: "Crônica" },
  { slug: "noticia", rotulo: "Notícia" },
  { slug: "coluna", rotulo: "Coluna" },
  { slug: "perfil", rotulo: "Perfil" },
  { slug: "entrevista", rotulo: "Entrevista" },
  { slug: "reportagem", rotulo: "Reportagem" },
] as const;

export type Editoria = (typeof EDITORIAS)[number]["slug"];

/** Tupla para `z.enum(SLUGS_DE_EDITORIA)` no schema da história 2. */
export const SLUGS_DE_EDITORIA = EDITORIAS.map(
  (e) => e.slug,
) as unknown as readonly [Editoria, ...Editoria[]];

export function hrefDaEditoria(slug: Editoria): `/editorias/${Editoria}` {
  return `/editorias/${slug}`;
}

export function rotuloDaEditoria(slug: Editoria): string {
  const editoria = EDITORIAS.find((e) => e.slug === slug);
  if (!editoria) throw new Error(`Editoria desconhecida: ${slug}`);
  return editoria.rotulo;
}

export function isEditoria(valor: string): valor is Editoria {
  return (SLUGS_DE_EDITORIA as readonly string[]).includes(valor);
}
