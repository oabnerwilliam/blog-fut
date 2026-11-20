import type { ArticleRepository } from "@/lib/content";

/** Slugs de todas as matérias visíveis, percorrendo todas as páginas da listagem. */
export async function listarTodosOsSlugs(
  repositorio: ArticleRepository,
): Promise<string[]> {
  const slugs: string[] = [];
  let pagina = 1;
  let totalPaginas = 1;
  do {
    const resultado = await repositorio.list({ page: pagina });
    slugs.push(...resultado.itens.map((item) => item.slug));
    totalPaginas = resultado.totalPaginas;
    pagina += 1;
  } while (pagina <= totalPaginas);
  return slugs;
}

/**
 * Com Cache Components, `generateStaticParams` não pode devolver lista vazia (erro de
 * build). Sem matérias visíveis (ex.: `MOSTRAR_EXEMPLOS=false` só com fictícias), usa um
 * slug que não existe: a página cai no `notFound()`.
 */
export const SLUG_DE_RESERVA = "nenhuma-materia-publicada";

export async function paramsDasMaterias(
  repositorio: ArticleRepository,
): Promise<{ slug: string }[]> {
  const slugs = await listarTodosOsSlugs(repositorio);
  return (slugs.length > 0 ? slugs : [SLUG_DE_RESERVA]).map((slug) => ({
    slug,
  }));
}
