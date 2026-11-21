import path from "node:path";
import { lerConfiguracao } from "./config";
import { FileArticleRepository } from "./file-repository";
import type { ArticleRepository } from "./repository";
import { criarClienteAnonimo } from "./supabase/cliente";
import { SupabaseArticleRepositoryEmCache } from "./supabase/repositorio-em-cache";
import { SupabaseArticleRepository } from "./supabase/repository";

export { renderMarkdown } from "./markdown";
export { readingTime } from "./reading-time";
export type {
  Article,
  ArticleSummary,
  DataISO,
  EditoriaRef,
  Paginated,
  TagRef,
  Taxonomy,
} from "./types";
export type { ArticleRepository, ListOptions } from "./repository";

export interface OpcoesDoRepositorio {
  /**
   * Só para o Proxy: ele não aplica a diretiva "use cache", e `cacheTag` lança fora de
   * um escopo de cache (doc `use-cache.md`). Com `files`, não muda nada. A história 14
   * troca a leitura do Proxy por um índice em memória.
   */
  readonly semCache?: boolean;
}

/** Em produção, uma instância por fonte, MOSTRAR_EXEMPLOS e uso de cache. */
const instancias = new Map<string, ArticleRepository>();

/**
 * Porta única de dados das páginas. Valida as variáveis a cada chamada e não lê nada:
 * o conteúdo (disco ou banco) só é lido quando um método do repositório é chamado.
 */
export function getRepository({
  semCache = false,
}: OpcoesDoRepositorio = {}): ArticleRepository {
  const config = lerConfiguracao(process.env);
  const chave = `${config.source}:${config.mostrarExemplos}:${config.source === "supabase" && semCache}`;
  const producao = process.env.NODE_ENV === "production";
  const existente = producao ? instancias.get(chave) : undefined;
  if (existente) return existente;

  let repositorio: ArticleRepository;
  if (config.source === "files") {
    repositorio = new FileArticleRepository({
      contentDir: path.join(process.cwd(), "content"),
      mostrarExemplos: config.mostrarExemplos,
    });
  } else if (semCache) {
    repositorio = new SupabaseArticleRepository({
      client: criarClienteAnonimo(config.supabase),
      mostrarExemplos: config.mostrarExemplos,
    });
  } else {
    repositorio = new SupabaseArticleRepositoryEmCache(
      config.supabase,
      config.mostrarExemplos,
    );
  }

  if (producao) instancias.set(chave, repositorio);
  return repositorio;
}
