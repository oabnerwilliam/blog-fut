import { rotuloDaEditoria } from "@/lib/editorias";
import { erroNoArquivo } from "./errors";
import { separarFrontmatter } from "./frontmatter";
import { encontrarLinhasDeH1 } from "./markdown";
import { readingTime } from "./reading-time";
import { formatarProblemas, frontmatterSchema } from "./schema";
import type { Article, TagRef } from "./types";

export interface ArtigoCarregado {
  readonly arquivo: string;
  readonly artigo: Article;
}

function slugDoArquivo(arquivo: string): string {
  return arquivo.endsWith(".md") ? arquivo.slice(0, -".md".length) : arquivo;
}

function slugInformado(dados: unknown): unknown {
  return typeof dados === "object" && dados !== null && "slug" in dados
    ? dados.slug
    : undefined;
}

/**
 * Um arquivo (nome + conteúdo) → Article validado. Puro: não lê disco.
 * Junta todos os problemas do arquivo num único ContentError.
 */
export function parseArticleFile(
  arquivo: string,
  conteudo: string,
  rotuloDaTag: (slug: string) => string,
): ArtigoCarregado {
  const { dados, corpo, linhaInicialDoCorpo } = separarFrontmatter(
    arquivo,
    conteudo,
  );

  const problemas: string[] = [];
  const resultado = frontmatterSchema.safeParse(dados);
  if (!resultado.success) {
    problemas.push(...formatarProblemas(resultado.error, dados));
  }

  const slug = slugInformado(dados);
  const esperado = slugDoArquivo(arquivo);
  if (typeof slug === "string" && slug !== esperado) {
    problemas.push(`slug "${slug}" diferente do nome do arquivo "${arquivo}"`);
  }

  for (const linha of encontrarLinhasDeH1(corpo)) {
    problemas.push(
      `h1 (# título) na linha ${linhaInicialDoCorpo + linha - 1}; o título fica no frontmatter`,
    );
  }

  if (!resultado.success || problemas.length > 0) {
    throw erroNoArquivo(arquivo, problemas);
  }

  const fm = resultado.data;
  const tags: readonly TagRef[] = Object.freeze(
    fm.tags.map((tag) =>
      Object.freeze({ slug: tag, rotulo: rotuloDaTag(tag) }),
    ),
  );

  const artigo: Article = Object.freeze({
    slug: fm.slug,
    titulo: fm.titulo,
    linha_fina: fm.linha_fina,
    editoria: Object.freeze({
      slug: fm.editoria,
      rotulo: rotuloDaEditoria(fm.editoria),
    }),
    tags,
    publicado_em: fm.publicado_em,
    autor: fm.autor,
    ficticio: fm.ficticio,
    tempo_de_leitura: readingTime(corpo),
    titulo_seo: fm.titulo_seo ?? null,
    meta_description: fm.meta_description ?? null,
    palavras_chave: Object.freeze([...(fm.palavras_chave ?? [])]),
    origem: fm.origem ? fm.origem : null,
    corpo_md: corpo,
  });

  return { arquivo, artigo };
}
