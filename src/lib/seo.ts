import type { Metadata } from "next";
import type { Article } from "@/lib/content";
import type { Editoria } from "@/lib/editorias";
import {
  caminhoDaListagem,
  rotuloDaContagem,
  type Listagem,
} from "@/lib/listagens";
import { NOME_DO_PORTAL } from "@/lib/site";

/** Editorias de opinião e texto autoral: no JSON-LD viram `Article`, não `NewsArticle`. */
const EDITORIAS_AUTORAIS: readonly Editoria[] = ["cronica", "coluna"];

export function caminhoDaMateria(slug: string): `/materias/${string}` {
  return `/materias/${slug}`;
}

/** Metadados da página da matéria (spec 6.5). URLs relativas: o `metadataBase` do layout completa. */
export function metadadosDaMateria(artigo: Article): Metadata {
  const titulo = artigo.titulo_seo ?? artigo.titulo;
  const descricao = artigo.meta_description ?? artigo.linha_fina;
  const url = caminhoDaMateria(artigo.slug);
  return {
    title: titulo,
    description: descricao,
    ...(artigo.palavras_chave.length > 0
      ? { keywords: [...artigo.palavras_chave] }
      : {}),
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: titulo,
      description: descricao,
      url,
      siteName: NOME_DO_PORTAL,
      locale: "pt_BR",
      publishedTime: artigo.publicado_em,
      section: artigo.editoria.rotulo,
      tags: artigo.tags.map((tag) => tag.rotulo),
    },
    twitter: { card: "summary", title: titulo, description: descricao },
    ...(artigo.ficticio ? { robots: { index: false, follow: false } } : {}),
  };
}

/**
 * Metadados de uma página de editoria ou de tag. A página 1 tem o canonical sem query; as
 * outras apontam para si mesmas (`?pagina=N`). Lista só de fictícias leva noindex.
 */
export function metadadosDaListagem(listagem: Listagem): Metadata {
  const { tipo, slug, rotulo, total, pagina, soFicticias } = listagem;
  const nome = tipo === "editoria" ? rotulo : `Tag: ${rotulo}`;
  const titulo = pagina > 1 ? `${nome} · página ${pagina}` : nome;
  const onde =
    tipo === "editoria" ? `da editoria ${rotulo}` : `com a tag ${rotulo}`;
  const descricao = `${rotuloDaContagem(total)} ${onde} na ${NOME_DO_PORTAL}, da mais nova para a mais antiga.`;
  const url = caminhoDaListagem(tipo, slug, pagina);
  return {
    title: titulo,
    description: descricao,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      title: titulo,
      description: descricao,
      url,
      siteName: NOME_DO_PORTAL,
      locale: "pt_BR",
    },
    ...(soFicticias ? { robots: { index: false, follow: false } } : {}),
  };
}

/**
 * Metadados de `/busca`. O canonical nunca leva a query, e a página não entra no índice
 * (cada termo seria uma página rala), mas os buscadores podem seguir os links dela.
 */
export function metadadosDaBusca(termo: string): Metadata {
  return {
    title: termo === "" ? "Busca" : `Busca: ${termo}`,
    alternates: { canonical: "/busca" },
    robots: { index: false, follow: true },
  };
}

/** Dados estruturados (schema.org) da matéria. */
export function jsonLdDaMateria(artigo: Article, base: URL) {
  const organizacao = { "@type": "Organization", name: NOME_DO_PORTAL };
  return {
    "@context": "https://schema.org",
    "@type": EDITORIAS_AUTORAIS.includes(artigo.editoria.slug)
      ? "Article"
      : "NewsArticle",
    headline: artigo.titulo,
    description: artigo.meta_description ?? artigo.linha_fina,
    datePublished: artigo.publicado_em,
    inLanguage: "pt-BR",
    mainEntityOfPage: new URL(caminhoDaMateria(artigo.slug), base).href,
    author: organizacao,
    publisher: organizacao,
  };
}

/** JSON com `<` escapado: um `</script>` vindo do frontmatter não fecha a tag do JSON-LD. */
export function serializarJsonLd(dados: unknown): string {
  return JSON.stringify(dados).replace(/</g, "\\u003c");
}
