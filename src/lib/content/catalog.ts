import { EDITORIAS } from "@/lib/editorias";
import { ContentError } from "./errors";
import type { ArtigoCarregado } from "./parse-article";
import { TAMANHO_PADRAO_DA_PAGINA, type ListOptions } from "./repository";
import { SLUG_REGEX } from "./schema";
import { correspondeABusca, termosDaBusca, textoBuscavel } from "./search";
import type { Article, ArticleSummary, Paginated, Taxonomy } from "./types";

/** Conteúdo validado em memória. Consultas puras, sem disco. */
export interface Catalogo {
  /** Só os visíveis, já ordenados. */
  readonly artigos: readonly Article[];
  readonly porSlug: ReadonlyMap<string, Article>;
  /** slug → textoBuscavel */
  readonly busca: ReadonlyMap<string, string>;
}

/** publicado_em decrescente (texto ISO); empate → slug crescente. */
export function compararArtigos(a: ArticleSummary, b: ArticleSummary): number {
  if (a.publicado_em !== b.publicado_em) {
    return a.publicado_em < b.publicado_em ? 1 : -1;
  }
  if (a.slug === b.slug) return 0;
  return a.slug < b.slug ? -1 : 1;
}

function conferirSlugsUnicos(carregados: readonly ArtigoCarregado[]): void {
  const arquivoPorSlug = new Map<string, string>();
  const problemas: string[] = [];
  for (const { arquivo, artigo } of carregados) {
    const anterior = arquivoPorSlug.get(artigo.slug);
    if (anterior !== undefined) {
      problemas.push(
        `slug "${artigo.slug}" duplicado nos arquivos ${anterior} e ${arquivo}`,
      );
    } else {
      arquivoPorSlug.set(artigo.slug, arquivo);
    }
  }
  if (problemas.length > 0) {
    throw new ContentError(
      `Conteúdo inválido em content/ (${problemas.length} problema(s)):\n${problemas.join("\n")}`,
    );
  }
}

/**
 * Monta o catálogo. Lança ContentError citando os dois arquivos se houver slug
 * repetido (antes do filtro de fictícias). O filtro MOSTRAR_EXEMPLOS é aplicado
 * aqui, uma vez, e todas as consultas herdam.
 */
export function montarCatalogo(
  carregados: readonly ArtigoCarregado[],
  opcoes: { readonly mostrarExemplos: boolean },
): Catalogo {
  conferirSlugsUnicos(carregados);
  const artigos = carregados
    .map((c) => c.artigo)
    .filter((artigo) => opcoes.mostrarExemplos || !artigo.ficticio)
    .sort(compararArtigos);
  return Object.freeze({
    artigos: Object.freeze(artigos),
    porSlug: new Map(artigos.map((a) => [a.slug, a])),
    busca: new Map(artigos.map((a) => [a.slug, textoBuscavel(a)])),
  });
}

/** Cópia sem titulo_seo, meta_description, palavras_chave, origem e corpo_md. */
export function paraResumo(artigo: Article): ArticleSummary {
  return Object.freeze({
    slug: artigo.slug,
    titulo: artigo.titulo,
    linha_fina: artigo.linha_fina,
    editoria: artigo.editoria,
    tags: artigo.tags,
    publicado_em: artigo.publicado_em,
    autor: artigo.autor,
    ficticio: artigo.ficticio,
    fonte: artigo.fonte,
    tempo_de_leitura: artigo.tempo_de_leitura,
  });
}

function validarInteiroPositivo(nome: string, valor: number): number {
  if (!Number.isInteger(valor) || valor < 1) {
    throw new RangeError(
      `list(): "${nome}" precisa ser um inteiro ≥ 1 (recebido: ${valor})`,
    );
  }
  return valor;
}

/** Página e tamanho com os padrões; RangeError se não forem inteiros ≥ 1. Vale para os dois repositórios. */
export function validarPaginacao(opts: ListOptions = {}): {
  readonly pagina: number;
  readonly tamanho: number;
} {
  return {
    pagina: validarInteiroPositivo("page", opts.page ?? 1),
    tamanho: validarInteiroPositivo(
      "pageSize",
      opts.pageSize ?? TAMANHO_PADRAO_DA_PAGINA,
    ),
  };
}

export function listar(
  catalogo: Catalogo,
  opts: ListOptions = {},
): Paginated<ArticleSummary> {
  const { pagina, tamanho } = validarPaginacao(opts);
  const { editoria, tag } = opts;
  const filtrados = catalogo.artigos.filter(
    (artigo) =>
      (editoria === undefined || artigo.editoria.slug === editoria) &&
      (tag === undefined || artigo.tags.some((t) => t.slug === tag)),
  );
  const total = filtrados.length;
  return Object.freeze({
    itens: Object.freeze(
      filtrados.slice((pagina - 1) * tamanho, pagina * tamanho).map(paraResumo),
    ),
    pagina,
    totalPaginas: Math.ceil(total / tamanho),
    total,
  });
}

/** Nunca monta caminho: confere o formato e procura no mapa. */
export function obterPorSlug(catalogo: Catalogo, slug: string): Article | null {
  if (!SLUG_REGEX.test(slug)) return null;
  return catalogo.porSlug.get(slug) ?? null;
}

export function buscar(catalogo: Catalogo, query: string): ArticleSummary[] {
  const termos = termosDaBusca(query);
  if (termos.length === 0) return [];
  return catalogo.artigos
    .filter((artigo) =>
      correspondeABusca(catalogo.busca.get(artigo.slug) ?? "", termos),
    )
    .map(paraResumo);
}

/**
 * As contagens só leem `artigos`: servem ao Catalogo (arquivos) e às linhas do banco
 * (`SupabaseArticleRepository`), com a mesma ordem e os mesmos totais.
 */
export function contarEditorias(catalogo: {
  readonly artigos: readonly Pick<ArticleSummary, "editoria">[];
}): Taxonomy[] {
  return EDITORIAS.map((editoria) =>
    Object.freeze({
      slug: editoria.slug,
      rotulo: editoria.rotulo,
      total: catalogo.artigos.filter((a) => a.editoria.slug === editoria.slug)
        .length,
    }),
  );
}

const COLLATOR = new Intl.Collator("pt-BR");

export function contarTags(catalogo: {
  readonly artigos: readonly Pick<ArticleSummary, "tags">[];
}): Taxonomy[] {
  const contagem = new Map<string, { rotulo: string; total: number }>();
  for (const artigo of catalogo.artigos) {
    for (const tag of artigo.tags) {
      const atual = contagem.get(tag.slug);
      contagem.set(tag.slug, {
        rotulo: tag.rotulo,
        total: (atual?.total ?? 0) + 1,
      });
    }
  }
  return [...contagem.entries()]
    .map(([slug, { rotulo, total }]) => Object.freeze({ slug, rotulo, total }))
    .sort((a, b) => b.total - a.total || COLLATOR.compare(a.rotulo, b.rotulo));
}
