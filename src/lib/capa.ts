import type { ArticleRepository, ArticleSummary } from "@/lib/content";
import { isEditoria, type Editoria } from "@/lib/editorias";

/** Faixas mostram no máximo este número de matérias (mockup: trio de Crônica). */
const ITENS_POR_FAIXA = 3;
/** Uma editoria só ganha faixa com pelo menos este número de matérias (decisão do usuário). */
const MINIMO_PARA_FAIXA = 2;

export interface EditoriaDaCapa {
  readonly slug: Editoria;
  readonly rotulo: string;
  readonly total: number;
}

export interface FaixaDaCapa {
  readonly editoria: EditoriaDaCapa;
  readonly itens: readonly ArticleSummary[];
}

export interface Capa {
  readonly destaque: ArticleSummary | null;
  readonly ultimas: readonly ArticleSummary[];
  readonly editorias: readonly EditoriaDaCapa[];
  readonly faixas: readonly FaixaDaCapa[];
}

/**
 * Recebe as matérias já ordenadas (publicado_em decrescente) e devolve a real mais
 * recente; sem nenhuma real, a fictícia mais recente; com lista vazia, null.
 * Só olha a lista que recebe (a primeira página): pela spec, as fictícias têm datas antes
 * de 2026-11-01, então uma matéria real nunca fica atrás de uma página inteira delas.
 */
export function escolherDestaque(
  itens: readonly ArticleSummary[],
): ArticleSummary | null {
  return itens.find((item) => !item.ficticio) ?? itens[0] ?? null;
}

/** Dados da capa, buscados só pelo contrato do repositório. */
export async function montarCapa(
  repositorio: ArticleRepository,
): Promise<Capa> {
  const [primeiraPagina, taxonomia] = await Promise.all([
    repositorio.list(),
    repositorio.listEditorias(),
  ]);

  const destaque = escolherDestaque(primeiraPagina.itens);
  const ultimas = primeiraPagina.itens.filter(
    (item) => item.slug !== destaque?.slug,
  );

  const editorias: EditoriaDaCapa[] = taxonomia
    .filter((t) => t.total > 0)
    .flatMap((t) =>
      isEditoria(t.slug)
        ? [{ slug: t.slug, rotulo: t.rotulo, total: t.total }]
        : [],
    );

  const faixas = await Promise.all(
    editorias
      .filter((editoria) => editoria.total >= MINIMO_PARA_FAIXA)
      .map(async (editoria) => ({
        editoria,
        itens: (
          await repositorio.list({
            editoria: editoria.slug,
            pageSize: ITENS_POR_FAIXA,
          })
        ).itens,
      })),
  );

  return { destaque, ultimas, editorias, faixas };
}
