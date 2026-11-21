import type {
  ArticleRepository,
  ArticleSummary,
  Taxonomy,
} from "@/lib/content";
import { isEditoria } from "@/lib/editorias";
import { slugsOuReserva } from "@/lib/materias";

export type TipoDeListagem = "editoria" | "tag";

/** O que a rota pede: uma editoria (`/editorias/<slug>`) ou uma tag (`/tags/<slug>`). */
export type FiltroDaListagem = { editoria: string } | { tag: string };

export interface Listagem {
  readonly tipo: TipoDeListagem;
  readonly slug: string;
  readonly rotulo: string;
  /** Matérias visíveis na editoria ou na tag, somando todas as páginas. */
  readonly total: number;
  readonly pagina: number;
  readonly totalPaginas: number;
  readonly itens: readonly ArticleSummary[];
  /** Todas as matérias da lista (não só as da página) são fictícias: a página leva noindex. */
  readonly soFicticias: boolean;
}

/** Inteiro decimal ≥ 1 sem zero à esquerda. Nada de sinal, espaço, ponto ou expoente. */
const PAGINA = /^[1-9]\d*$/;

/**
 * Lê o `pagina` da query. Sem valor, é a página 1. Qualquer valor fora do formato (ou
 * repetido, que chega como array) devolve `null`, e a rota responde 404.
 */
export function lerPagina(valor: string | string[] | undefined): number | null {
  if (valor === undefined) return 1;
  if (typeof valor !== "string" || !PAGINA.test(valor)) return null;
  const numero = Number(valor);
  return Number.isSafeInteger(numero) ? numero : null;
}

/** `/editorias/cronica`, `/tags/taca-das-serras?pagina=2`. A página 1 nunca leva a query. */
export function caminhoDaListagem(
  tipo: TipoDeListagem,
  slug: string,
  pagina = 1,
): string {
  const base = tipo === "editoria" ? `/editorias/${slug}` : `/tags/${slug}`;
  return pagina > 1 ? `${base}?pagina=${pagina}` : base;
}

/** "1 matéria", "2 matérias". */
export function rotuloDaContagem(total: number): string {
  return `${total} ${total === 1 ? "matéria" : "matérias"}`;
}

/**
 * Monta a página de uma editoria ou de uma tag, só pelo contrato do repositório.
 * Devolve `null` (404) quando a editoria não é da lista fechada, quando a editoria ou a tag
 * não tem matéria visível, ou quando a página passa da última. A página e o Proxy usam
 * esta mesma função, então os dois concordam sobre o que existe.
 */
export async function montarListagem(
  repositorio: ArticleRepository,
  filtro: FiltroDaListagem,
  pagina: number,
): Promise<Listagem | null> {
  const tipo: TipoDeListagem = "editoria" in filtro ? "editoria" : "tag";
  const slug = "editoria" in filtro ? filtro.editoria : filtro.tag;
  if (tipo === "editoria" && !isEditoria(slug)) return null;

  const taxonomia = await (tipo === "editoria"
    ? repositorio.listEditorias()
    : repositorio.listTags());
  const entrada = taxonomia.find((t) => t.slug === slug);
  if (!entrada || entrada.total === 0) return null;

  const opcoes = tipo === "editoria" ? { editoria: slug } : { tag: slug };
  const resultado = await repositorio.list({ ...opcoes, page: pagina });
  if (pagina > resultado.totalPaginas) return null;

  // Uma página só cobre até 12 matérias; o noindex depende da lista inteira.
  const todas =
    resultado.totalPaginas === 1
      ? resultado.itens
      : (await repositorio.list({ ...opcoes, pageSize: resultado.total }))
          .itens;

  return {
    tipo,
    slug,
    rotulo: entrada.rotulo,
    total: resultado.total,
    pagina: resultado.pagina,
    totalPaginas: resultado.totalPaginas,
    itens: resultado.itens,
    soFicticias: todas.every((item) => item.ficticio),
  };
}

function comMateria(taxonomia: readonly Taxonomy[]): string[] {
  return taxonomia.filter((t) => t.total > 0).map((t) => t.slug);
}

/**
 * Params das rotas: só editorias e tags com matéria visível. Com Cache Components, uma
 * lista vazia quebra o build; sem nenhuma (ou com o repositório fora do ar), usa o
 * valor de reserva, que cai no 404.
 */
export async function paramsDasEditorias(
  repositorio: ArticleRepository,
): Promise<{ editoria: string }[]> {
  const slugs = await slugsOuReserva("/editorias/[editoria]", async () =>
    comMateria(await repositorio.listEditorias()),
  );
  return slugs.map((editoria) => ({ editoria }));
}

export async function paramsDasTags(
  repositorio: ArticleRepository,
): Promise<{ tag: string }[]> {
  const slugs = await slugsOuReserva("/tags/[tag]", async () =>
    comMateria(await repositorio.listTags()),
  );
  return slugs.map((tag) => ({ tag }));
}
