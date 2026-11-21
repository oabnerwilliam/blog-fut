/*
 * Etiquetas do cache das leituras do Supabase (`cacheTag`). A história 13 só marca;
 * a 14 invalida com `revalidateTag`/`updateTag` (rota /api/revalidar e webhook do banco).
 */

/** Toda leitura que depende da lista de matérias: capa, listagens, busca, sitemap e contagens. */
export const TAG_MATERIAS = "materias";

/** Rótulos de tag (tabela `tags`). */
export const TAG_TAGS = "tags";

/** Uma matéria só (`getBySlug`). */
export function tagDaMateria(slug: string): string {
  return `materia:${slug}`;
}
