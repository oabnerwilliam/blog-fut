import type { MetadataRoute } from "next";
import type { ArticleRepository, ArticleSummary } from "@/lib/content";
import { caminhoDaListagem } from "@/lib/listagens";
import { caminhoDaMateria } from "@/lib/seo";

type Entrada = MetadataRoute.Sitemap[number];

/** Todas as matérias visíveis, já na ordem do catálogo (mais nova primeiro). */
async function todasAsMaterias(
  repositorio: ArticleRepository,
): Promise<ArticleSummary[]> {
  const materias: ArticleSummary[] = [];
  let pagina = 1;
  let totalPaginas = 1;
  do {
    const resultado = await repositorio.list({ page: pagina });
    materias.push(...resultado.itens);
    totalPaginas = resultado.totalPaginas;
    pagina += 1;
  } while (pagina <= totalPaginas);
  return materias;
}

/**
 * Entradas do `sitemap.xml` (spec 6.5): a capa, cada matéria real e cada editoria e tag
 * com pelo menos uma matéria real. Fictícias nunca entram, nem listas só de fictícias.
 * `lastModified` é a data da matéria real mais recente de cada entrada.
 */
export async function entradasDoSitemap(
  repositorio: ArticleRepository,
  base: URL,
): Promise<MetadataRoute.Sitemap> {
  const reais = (await todasAsMaterias(repositorio)).filter(
    (materia) => !materia.ficticio,
  );
  const absoluta = (caminho: string) => new URL(caminho, base).href;

  // As reais vêm da mais nova para a mais antiga: a primeira data vista é a mais recente.
  const editorias = new Map<string, string>();
  const tags = new Map<string, string>();
  for (const materia of reais) {
    if (!editorias.has(materia.editoria.slug)) {
      editorias.set(materia.editoria.slug, materia.publicado_em);
    }
    for (const tag of materia.tags) {
      if (!tags.has(tag.slug)) tags.set(tag.slug, materia.publicado_em);
    }
  }

  const capa: Entrada = {
    url: absoluta("/"),
    ...(reais.length > 0 ? { lastModified: reais[0].publicado_em } : {}),
  };
  return [
    capa,
    ...reais.map((materia) => ({
      url: absoluta(caminhoDaMateria(materia.slug)),
      lastModified: materia.publicado_em,
    })),
    ...[...editorias].map(([slug, data]) => ({
      url: absoluta(caminhoDaListagem("editoria", slug)),
      lastModified: data,
    })),
    ...[...tags].map(([slug, data]) => ({
      url: absoluta(caminhoDaListagem("tag", slug)),
      lastModified: data,
    })),
  ];
}
