import type { Metadata } from "next";
import type { Article } from "@/lib/content";
import type { Editoria } from "@/lib/editorias";
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
