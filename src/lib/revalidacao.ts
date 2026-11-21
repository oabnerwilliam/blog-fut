import { z } from "zod";
import { TAG_MATERIAS, TAG_TAGS, tagDaMateria } from "@/lib/content/cache";
import { SLUG_REGEX } from "@/lib/content/schema";

/**
 * Payload do webhook do banco (`public.avisar_revalidacao()`, migração da história 14).
 * O slug cabe numa etiqueta: o Next ignora etiquetas com mais de 256 caracteres
 * (doc `revalidateTag.md`), e `materia:` ocupa 8.
 */
const slug = z.string().max(200).regex(SLUG_REGEX).nullish();

export const payloadDeRevalidacao = z.object({
  tabela: z.enum(["articles", "tags"]),
  slug,
  slug_antigo: slug,
});

export type PayloadDeRevalidacao = z.infer<typeof payloadDeRevalidacao>;

/**
 * Etiquetas a invalidar (ADR 0008):
 * - `articles`: a lista (`materias`) e a página da matéria, com o slug novo e o antigo
 *   quando ele mudou;
 * - `tags`: os rótulos (`tags`) e a lista (`materias`), porque os rótulos aparecem nas
 *   listagens e nas contagens.
 */
export function etiquetasParaInvalidar(
  payload: PayloadDeRevalidacao,
): string[] {
  if (payload.tabela === "tags") return [TAG_TAGS, TAG_MATERIAS];
  const etiquetas = [TAG_MATERIAS];
  for (const s of [payload.slug, payload.slug_antigo]) {
    if (s) etiquetas.push(tagDaMateria(s));
  }
  return [...new Set(etiquetas)];
}
