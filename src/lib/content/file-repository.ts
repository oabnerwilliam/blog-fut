import "server-only";
import {
  buscar,
  contarEditorias,
  contarTags,
  listar,
  montarCatalogo,
  obterPorSlug,
  type Catalogo,
} from "./catalog";
import { carregarArtigosDoDisco } from "./disco";
import type { ArticleRepository, ListOptions } from "./repository";
import type { Aviso } from "./tags";
import type { Article, ArticleSummary, Paginated, Taxonomy } from "./types";

export interface FileRepositoryOptions {
  /** Pasta que contém materias/ e tags.json. */
  readonly contentDir: string;
  readonly mostrarExemplos: boolean;
  /** Padrão: console.warn. */
  readonly avisar?: Aviso;
}

/** Repositório de arquivos: lê o disco uma vez (na 1ª consulta) e responde da memória. */
export class FileArticleRepository implements ArticleRepository {
  readonly #opcoes: FileRepositoryOptions;
  #catalogo: Catalogo | null = null;

  constructor(opcoes: FileRepositoryOptions) {
    this.#opcoes = opcoes;
  }

  /** Memorizado na instância. Uma falha não é memorizada: a próxima chamada tenta de novo. */
  #obterCatalogo(): Catalogo {
    if (this.#catalogo === null) {
      const {
        contentDir,
        mostrarExemplos,
        avisar = console.warn,
      } = this.#opcoes;
      this.#catalogo = montarCatalogo(
        carregarArtigosDoDisco(contentDir, avisar),
        { mostrarExemplos },
      );
    }
    return this.#catalogo;
  }

  async list(opts?: ListOptions): Promise<Paginated<ArticleSummary>> {
    return listar(this.#obterCatalogo(), opts);
  }

  async getBySlug(slug: string): Promise<Article | null> {
    return obterPorSlug(this.#obterCatalogo(), slug);
  }

  async search(query: string): Promise<ArticleSummary[]> {
    return buscar(this.#obterCatalogo(), query);
  }

  async listEditorias(): Promise<Taxonomy[]> {
    return contarEditorias(this.#obterCatalogo());
  }

  async listTags(): Promise<Taxonomy[]> {
    return contarTags(this.#obterCatalogo());
  }
}
