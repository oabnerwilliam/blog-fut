import type { Article, ArticleSummary, Paginated, Taxonomy } from "./types";

/** Fecha a grade em 1, 2, 3 ou 4 colunas. */
export const TAMANHO_PADRAO_DA_PAGINA = 12;

export interface ListOptions {
  editoria?: string;
  tag?: string;
  page?: number;
  pageSize?: number;
}

/** Contrato da spec 6.3. Arquivos hoje; Supabase no futuro, só por configuração. */
export interface ArticleRepository {
  list(opts?: ListOptions): Promise<Paginated<ArticleSummary>>;
  getBySlug(slug: string): Promise<Article | null>;
  search(query: string): Promise<ArticleSummary[]>;
  listEditorias(): Promise<Taxonomy[]>;
  listTags(): Promise<Taxonomy[]>;
}
