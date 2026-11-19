import path from "node:path";
import { lerConfiguracao } from "./config";
import { FileArticleRepository } from "./file-repository";
import type { ArticleRepository } from "./repository";

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

/** Em produção, uma instância por valor de MOSTRAR_EXEMPLOS (o conteúdo só muda a cada build). */
const instancias = new Map<boolean, ArticleRepository>();

/**
 * Porta única de dados das páginas. Valida as variáveis a cada chamada e não lê o
 * disco: o conteúdo só é carregado quando um método do repositório é chamado.
 */
export function getRepository(): ArticleRepository {
  const { mostrarExemplos } = lerConfiguracao(process.env);
  const producao = process.env.NODE_ENV === "production";
  const existente = producao ? instancias.get(mostrarExemplos) : undefined;
  if (existente) return existente;
  const repositorio = new FileArticleRepository({
    contentDir: path.join(process.cwd(), "content"),
    mostrarExemplos,
  });
  if (producao) instancias.set(mostrarExemplos, repositorio);
  return repositorio;
}
