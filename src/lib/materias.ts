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

/**
 * Slugs para o `generateStaticParams`, com a reserva quando não há nenhum. Se o
 * repositório lançar (banco fora do ar ou pausado, U11), registra o erro e usa a reserva:
 * o build não quebra, e as rotas reais renderizam sob demanda quando o banco voltar.
 */
export async function slugsOuReserva(
  rota: string,
  carregar: () => Promise<readonly string[]>,
): Promise<string[]> {
  try {
    const slugs = await carregar();
    return slugs.length > 0 ? [...slugs] : [SLUG_DE_RESERVA];
  } catch (erro) {
    console.error(
      `[generateStaticParams] ${rota}: o repositório falhou; usando o slug de reserva.`,
      erro,
    );
    return [SLUG_DE_RESERVA];
  }
}

export async function paramsDasMaterias(
  repositorio: ArticleRepository,
): Promise<{ slug: string }[]> {
  const slugs = await slugsOuReserva("/materias/[slug]", () =>
    listarTodosOsSlugs(repositorio),
  );
  return slugs.map((slug) => ({ slug }));
}
