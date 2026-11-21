import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { TAG_MATERIAS, TAG_TAGS, tagDaMateria } from "../cache";
import { validarPaginacao } from "../catalog";
import type { ConexaoSupabase } from "../config";
import type { ArticleRepository, ListOptions } from "../repository";
import { SLUG_REGEX } from "../schema";
import { termosDaBusca } from "../search";
import type { Article, ArticleSummary, Paginated, Taxonomy } from "../types";
import { criarClienteAnonimo } from "./cliente";
import { desembrulhar, lerProtegido, type Leitura } from "./leitura-protegida";
import { SupabaseArticleRepository } from "./repository";

/*
 * Cache Components com o banco (história 13, critério 9; ADR 0008).
 *
 * No Next 16, o prerender recusa leitura de rede sem cache fora de <Suspense>. Cada
 * leitura do Supabase roda numa função "use cache", com etiqueta e cacheLife("max"): a
 * página continua estática e a história 14 invalida pelas etiquetas.
 *
 * As funções recebem só valores serializáveis (conexão, flag, opções), que viram a chave
 * do cache. O repositório e o cliente são criados dentro delas.
 *
 * Banco fora do ar (U11): a leitura que falha não lança dentro do cache. `lerProtegido`
 * devolve a falha com vida zero (fora do prerender, nunca guardada), e `desembrulhar`
 * relança fora dele. Ver `leitura-protegida.ts`.
 */

function repositorio(
  conexao: ConexaoSupabase,
  mostrarExemplos: boolean,
): SupabaseArticleRepository {
  return new SupabaseArticleRepository({
    client: criarClienteAnonimo(conexao),
    mostrarExemplos,
  });
}

async function listarEmCache(
  conexao: ConexaoSupabase,
  mostrarExemplos: boolean,
  opts: ListOptions,
): Promise<Leitura<Paginated<ArticleSummary>>> {
  "use cache";
  cacheLife("max");
  cacheTag(TAG_MATERIAS, TAG_TAGS);
  return lerProtegido(
    () => repositorio(conexao, mostrarExemplos).list(opts),
    cacheLife,
  );
}

async function obterEmCache(
  conexao: ConexaoSupabase,
  mostrarExemplos: boolean,
  slug: string,
): Promise<Leitura<Article | null>> {
  "use cache";
  cacheLife("max");
  cacheTag(tagDaMateria(slug), TAG_TAGS);
  return lerProtegido(
    () => repositorio(conexao, mostrarExemplos).getBySlug(slug),
    cacheLife,
  );
}

async function buscarEmCache(
  conexao: ConexaoSupabase,
  mostrarExemplos: boolean,
  termos: readonly string[],
): Promise<Leitura<ArticleSummary[]>> {
  "use cache";
  cacheLife("max");
  cacheTag(TAG_MATERIAS, TAG_TAGS);
  return lerProtegido(
    () => repositorio(conexao, mostrarExemplos).search(termos.join(" ")),
    cacheLife,
  );
}

async function editoriasEmCache(
  conexao: ConexaoSupabase,
  mostrarExemplos: boolean,
): Promise<Leitura<Taxonomy[]>> {
  "use cache";
  cacheLife("max");
  cacheTag(TAG_MATERIAS);
  return lerProtegido(
    () => repositorio(conexao, mostrarExemplos).listEditorias(),
    cacheLife,
  );
}

async function tagsEmCache(
  conexao: ConexaoSupabase,
  mostrarExemplos: boolean,
): Promise<Leitura<Taxonomy[]>> {
  "use cache";
  cacheLife("max");
  cacheTag(TAG_MATERIAS, TAG_TAGS);
  return lerProtegido(
    () => repositorio(conexao, mostrarExemplos).listTags(),
    cacheLife,
  );
}

/**
 * O que é decidido sem banco (RangeError, slug malformado, busca vazia) fica fora do
 * cache, igual ao SupabaseArticleRepository: nem chega a criar entrada.
 */
export class SupabaseArticleRepositoryEmCache implements ArticleRepository {
  readonly #conexao: ConexaoSupabase;
  readonly #mostrarExemplos: boolean;

  constructor(conexao: ConexaoSupabase, mostrarExemplos: boolean) {
    this.#conexao = conexao;
    this.#mostrarExemplos = mostrarExemplos;
  }

  async list(opts: ListOptions = {}): Promise<Paginated<ArticleSummary>> {
    const { pagina, tamanho } = validarPaginacao(opts);
    return desembrulhar(
      await listarEmCache(this.#conexao, this.#mostrarExemplos, {
        editoria: opts.editoria,
        tag: opts.tag,
        page: pagina,
        pageSize: tamanho,
      }),
    );
  }

  async getBySlug(slug: string): Promise<Article | null> {
    if (!SLUG_REGEX.test(slug)) return null;
    return desembrulhar(
      await obterEmCache(this.#conexao, this.#mostrarExemplos, slug),
    );
  }

  async search(query: string): Promise<ArticleSummary[]> {
    const termos = termosDaBusca(query);
    if (termos.length === 0) return [];
    return desembrulhar(
      await buscarEmCache(this.#conexao, this.#mostrarExemplos, termos),
    );
  }

  async listEditorias(): Promise<Taxonomy[]> {
    return desembrulhar(
      await editoriasEmCache(this.#conexao, this.#mostrarExemplos),
    );
  }

  async listTags(): Promise<Taxonomy[]> {
    return desembrulhar(
      await tagsEmCache(this.#conexao, this.#mostrarExemplos),
    );
  }
}
