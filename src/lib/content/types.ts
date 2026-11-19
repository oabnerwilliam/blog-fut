import type { Editoria } from "@/lib/editorias";

/** Data de calendário "AAAA-MM-DD", sem fuso. Nunca vira Date nesta camada. */
export type DataISO = string;

export interface EditoriaRef {
  readonly slug: Editoria;
  readonly rotulo: string;
}

export interface TagRef {
  readonly slug: string;
  readonly rotulo: string;
}

export interface ArticleSummary {
  readonly slug: string;
  readonly titulo: string;
  readonly linha_fina: string;
  readonly editoria: EditoriaRef;
  readonly tags: readonly TagRef[];
  readonly publicado_em: DataISO;
  readonly autor: string;
  readonly ficticio: boolean;
  /** Minutos, calculado por readingTime(corpo_md). Não existe no frontmatter. */
  readonly tempo_de_leitura: number;
}

export interface Article extends ArticleSummary {
  readonly titulo_seo: string | null;
  readonly meta_description: string | null;
  readonly palavras_chave: readonly string[];
  /** null nas fictícias; texto não vazio nas reais. */
  readonly origem: string | null;
  /** Corpo exatamente como no arquivo (critério 17). */
  readonly corpo_md: string;
}

export interface Taxonomy {
  readonly slug: string;
  readonly rotulo: string;
  readonly total: number;
}

export interface Paginated<T> {
  readonly itens: readonly T[];
  readonly pagina: number;
  readonly totalPaginas: number;
  readonly total: number;
}
