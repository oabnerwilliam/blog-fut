import "server-only";
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { isEditoria, rotuloDaEditoria } from "@/lib/editorias";
import { contarEditorias, contarTags, validarPaginacao } from "../catalog";
import { ContentError } from "../errors";
import { readingTime } from "../reading-time";
import type { ArticleRepository, ListOptions } from "../repository";
import { SLUG_REGEX } from "../schema";
import { termosDaBusca } from "../search";
import { humanizarTag } from "../tags";
import type {
  Article,
  ArticleSummary,
  EditoriaRef,
  Paginated,
  TagRef,
  Taxonomy,
} from "../types";

export interface SupabaseRepositoryOptions {
  /** Cliente criado com a chave anon: o RLS esconde o que não é público. */
  readonly client: SupabaseClient;
  readonly mostrarExemplos: boolean;
}

/** Linha de `articles` com as colunas que o resumo usa (o corpo dá o tempo de leitura). */
interface LinhaResumo {
  readonly slug: string;
  readonly titulo: string;
  readonly linha_fina: string;
  readonly editoria: string;
  readonly tags: readonly string[];
  readonly publicado_em: string;
  readonly autor: string;
  readonly ficticio: boolean;
  readonly corpo_md: string;
}

interface LinhaArtigo extends LinhaResumo {
  readonly titulo_seo: string | null;
  readonly meta_description: string | null;
  readonly palavras_chave: readonly string[];
  readonly origem: string | null;
}

const COLUNAS_RESUMO =
  "slug,titulo,linha_fina,editoria,tags,publicado_em,autor,ficticio,corpo_md";
const COLUNAS_ARTIGO = `${COLUNAS_RESUMO},titulo_seo,meta_description,palavras_chave,origem`;

/** PostgREST: o `range` pedido começa depois da última linha (página além da última). */
const FAIXA_FORA_DO_TOTAL = "PGRST103";

type Rotulos = ReadonlyMap<string, string>;

function falha(contexto: string, erro: PostgrestError): Error {
  return new Error(
    `[conteúdo] falha ao ler ${contexto} do Supabase: ${erro.message}`,
  );
}

function referenciaDaEditoria(slug: string): EditoriaRef {
  if (!isEditoria(slug)) {
    throw new ContentError(`editoria desconhecida vinda do banco: "${slug}"`);
  }
  return { slug, rotulo: rotuloDaEditoria(slug) };
}

/** Rótulo da tabela `tags` ou o humanizado, como o FileArticleRepository. */
function referenciasDasTags(
  slugs: readonly string[],
  rotulos: Rotulos,
): TagRef[] {
  return slugs.map((slug) => ({
    slug,
    rotulo: rotulos.get(slug) ?? humanizarTag(slug),
  }));
}

function paraResumo(linha: LinhaResumo, rotulos: Rotulos): ArticleSummary {
  return {
    slug: linha.slug,
    titulo: linha.titulo,
    linha_fina: linha.linha_fina,
    editoria: referenciaDaEditoria(linha.editoria),
    tags: referenciasDasTags(linha.tags, rotulos),
    publicado_em: linha.publicado_em,
    autor: linha.autor,
    ficticio: linha.ficticio,
    tempo_de_leitura: readingTime(linha.corpo_md),
  };
}

function paraArtigo(linha: LinhaArtigo, rotulos: Rotulos): Article {
  return {
    ...paraResumo(linha, rotulos),
    titulo_seo: linha.titulo_seo,
    meta_description: linha.meta_description,
    palavras_chave: [...linha.palavras_chave],
    origem: linha.origem,
    corpo_md: linha.corpo_md,
  };
}

function paginaVazia(pagina: number): Paginated<ArticleSummary> {
  return { itens: [], pagina, totalPaginas: 0, total: 0 };
}

/**
 * Repositório do Supabase: mesmo contrato e mesmos resultados do FileArticleRepository
 * (suíte de contrato em tests/contract). Lê só matérias publicadas; o RLS garante o mesmo.
 */
export class SupabaseArticleRepository implements ArticleRepository {
  readonly #client: SupabaseClient;
  readonly #mostrarExemplos: boolean;

  constructor({ client, mostrarExemplos }: SupabaseRepositoryOptions) {
    this.#client = client;
    this.#mostrarExemplos = mostrarExemplos;
  }

  /** Publicadas, sem fictícias quando MOSTRAR_EXEMPLOS=false, e com os filtros da listagem. */
  #publicadas(
    colunas: string,
    filtros: Pick<ListOptions, "editoria" | "tag"> = {},
    opcoes?: { count: "exact"; head?: boolean },
  ) {
    let consulta = this.#client
      .from("articles")
      .select(colunas, opcoes)
      .eq("status", "publicado");
    if (!this.#mostrarExemplos) consulta = consulta.eq("ficticio", false);
    if (filtros.editoria !== undefined) {
      consulta = consulta.eq("editoria", filtros.editoria);
    }
    if (filtros.tag !== undefined) {
      consulta = consulta.contains("tags", [filtros.tag]);
    }
    return consulta;
  }

  async #rotulos(): Promise<Rotulos> {
    const { data, error } = await this.#client
      .from("tags")
      .select("slug,rotulo");
    if (error) throw falha("as tags", error);
    return new Map(
      (data as { slug: string; rotulo: string }[]).map((t) => [
        t.slug,
        t.rotulo,
      ]),
    );
  }

  async list(opts: ListOptions = {}): Promise<Paginated<ArticleSummary>> {
    const { pagina, tamanho } = validarPaginacao(opts);
    const filtros = { editoria: opts.editoria, tag: opts.tag };
    // Nenhuma matéria tem editoria fora da lista nem tag fora do kebab-case. E o
    // `contains` do PostgREST quebraria uma tag com vírgula ou chave em várias.
    if (
      (filtros.editoria !== undefined && !isEditoria(filtros.editoria)) ||
      (filtros.tag !== undefined && !SLUG_REGEX.test(filtros.tag))
    ) {
      return paginaVazia(pagina);
    }

    const inicio = (pagina - 1) * tamanho;
    const [resposta, rotulos] = await Promise.all([
      this.#publicadas(COLUNAS_RESUMO, filtros, { count: "exact" })
        .order("publicado_em", { ascending: false })
        .order("slug", { ascending: true })
        .range(inicio, inicio + tamanho - 1),
      this.#rotulos(),
    ]);

    let total = resposta.count ?? 0;
    let linhas = (resposta.data ?? []) as unknown as LinhaResumo[];
    if (resposta.error?.code === FAIXA_FORA_DO_TOTAL) {
      // Página além da última: o arquivo devolve itens vazios com o total certo.
      const contagem = await this.#publicadas("slug", filtros, {
        count: "exact",
        head: true,
      });
      if (contagem.error) throw falha("a contagem de matérias", contagem.error);
      total = contagem.count ?? 0;
      linhas = [];
    } else if (resposta.error) {
      throw falha("a lista de matérias", resposta.error);
    }

    return {
      itens: linhas.map((linha) => paraResumo(linha, rotulos)),
      pagina,
      totalPaginas: Math.ceil(total / tamanho),
      total,
    };
  }

  async getBySlug(slug: string): Promise<Article | null> {
    if (!SLUG_REGEX.test(slug)) return null;
    const [resposta, rotulos] = await Promise.all([
      this.#publicadas(COLUNAS_ARTIGO).eq("slug", slug).maybeSingle(),
      this.#rotulos(),
    ]);
    if (resposta.error) throw falha(`a matéria "${slug}"`, resposta.error);
    if (resposta.data === null) return null;
    return paraArtigo(resposta.data as unknown as LinhaArtigo, rotulos);
  }

  async search(query: string): Promise<ArticleSummary[]> {
    const termos = termosDaBusca(query);
    if (termos.length === 0) return [];
    let consulta = this.#client
      .rpc("buscar_artigos", { termos })
      .select(COLUNAS_RESUMO)
      .eq("status", "publicado");
    if (!this.#mostrarExemplos) consulta = consulta.eq("ficticio", false);
    const [resposta, rotulos] = await Promise.all([
      consulta
        .order("publicado_em", { ascending: false })
        .order("slug", { ascending: true }),
      this.#rotulos(),
    ]);
    if (resposta.error) throw falha("a busca", resposta.error);
    return (resposta.data as unknown as LinhaResumo[]).map((linha) =>
      paraResumo(linha, rotulos),
    );
  }

  async listEditorias(): Promise<Taxonomy[]> {
    const { data, error } = await this.#publicadas("editoria");
    if (error) throw falha("as editorias", error);
    const artigos = (data as unknown as { editoria: string }[]).map(
      (linha) => ({ editoria: referenciaDaEditoria(linha.editoria) }),
    );
    return contarEditorias({ artigos });
  }

  async listTags(): Promise<Taxonomy[]> {
    const [resposta, rotulos] = await Promise.all([
      this.#publicadas("tags"),
      this.#rotulos(),
    ]);
    if (resposta.error) throw falha("as tags das matérias", resposta.error);
    const artigos = (resposta.data as unknown as { tags: string[] }[]).map(
      (linha) => ({ tags: referenciasDasTags(linha.tags, rotulos) }),
    );
    return contarTags({ artigos });
  }
}
