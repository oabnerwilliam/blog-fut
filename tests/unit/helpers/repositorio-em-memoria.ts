import type { ArticleRepository } from "@/lib/content";
import {
  buscar,
  contarEditorias,
  contarTags,
  listar,
  montarCatalogo,
  obterPorSlug,
} from "@/lib/content/catalog";
import type { Article } from "@/lib/content/types";
import { rotuloDaEditoria, type Editoria } from "@/lib/editorias";
import { montarArtigo } from "../content/helpers/artigo";

/**
 * Repositório falso em memória, com as mesmas consultas puras do repositório de arquivos
 * (filtro, ordem, paginação e contagens do catálogo). Não lê o disco.
 */
export function repositorioEmMemoria(
  artigos: readonly Article[],
  { mostrarExemplos = true }: { mostrarExemplos?: boolean } = {},
): ArticleRepository {
  const catalogo = montarCatalogo(
    artigos.map((artigo) => ({ arquivo: `${artigo.slug}.md`, artigo })),
    { mostrarExemplos },
  );
  return {
    list: async (opts) => listar(catalogo, opts),
    getBySlug: async (slug) => obterPorSlug(catalogo, slug),
    search: async (query) => buscar(catalogo, query),
    listEditorias: async () => contarEditorias(catalogo),
    listTags: async () => contarTags(catalogo),
  };
}

/** Atalho para montar uma matéria com editoria, tags, data e o flag de fictícia. */
export function artigo(
  slug: string,
  publicado_em: string,
  editoria: Editoria,
  {
    tags = [],
    ficticio = true,
  }: { tags?: { slug: string; rotulo: string }[]; ficticio?: boolean } = {},
): Article {
  return montarArtigo({
    slug,
    titulo: `Título de ${slug}`,
    linha_fina: `Linha fina de ${slug}`,
    editoria: { slug: editoria, rotulo: rotuloDaEditoria(editoria) },
    tags,
    publicado_em,
    ficticio,
    origem: ficticio ? null : `squad-fut/textos/${slug}`,
  });
}
