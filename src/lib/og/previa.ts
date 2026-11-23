import type { Article } from "@/lib/content";
import { formatarDataCurta } from "@/lib/datas";
import { EDITORIAS, type Editoria } from "@/lib/editorias";
import { DESCRICAO_DO_PORTAL, NOME_DO_PORTAL, SLOGAN } from "@/lib/site";

/*
 * Lógica pura da prévia do link (T02, direção A · Faixa noturna). As artes em
 * `src/lib/og/artes.tsx` só desenham o que sai daqui.
 */

/** 1200 × 630: a proporção 1,91:1 que WhatsApp, LinkedIn, X e Facebook esperam. */
export const TAMANHO_DA_PREVIA = { width: 1200, height: 630 } as const;

export const TIPO_DA_PREVIA = "image/png";

export const AVISO_DA_FICTICIA = "Conteúdo fictício de demonstração";

export interface ReguaDoTitulo {
  readonly fontSize: number;
  /** Em px: −0,02 em do tamanho da fonte. */
  readonly letterSpacing: number;
  /** Pior caso medido pelo design, mais uma linha de folga. */
  readonly linhasNoMaximo: number;
  /** Só acima de 160 caracteres: rede de segurança para não cortar no meio da linha. */
  readonly lineClamp: number | undefined;
}

function faixa(
  ate: number,
  fontSize: number,
  letterSpacing: number,
  linhasNoMaximo: number,
  lineClamp?: number,
) {
  return { ate, regua: { fontSize, letterSpacing, linhasNoMaximo, lineClamp } };
}

/**
 * Régua do título (README do design, "Régua do título", direções A e B). Cada faixa vai
 * até N caracteres de `titulo.length`, com espaços: fonte (px), letterSpacing (px), linhas
 * no máximo e lineClamp. Em todas, `fontSize × linhasNoMaximo` cabe nos 344 px de altura
 * útil da arte: o título não corta.
 */
const FAIXAS = [
  faixa(45, 112, -2.2, 3),
  faixa(80, 86, -1.7, 4),
  faixa(120, 68, -1.4, 5),
  faixa(160, 56, -1.1, 5),
  faixa(Infinity, 48, -1, 6, 6),
];

export function reguaDoTitulo(titulo: string): ReguaDoTitulo {
  // A última faixa vai até Infinity: o `find` sempre acha.
  return FAIXAS.find(({ ate }) => titulo.length <= ate)!.regua;
}

const doisDigitos = (n: number) => String(n).padStart(2, "0");

/** "analise" → "01": a numeração da nav (posição no array de editorias). */
export function numeroDaEditoria(slug: Editoria): string {
  return doisDigitos(EDITORIAS.findIndex((e) => e.slug === slug) + 1);
}

/** As 7 editorias numeradas, para o rodapé da imagem padrão. */
export const EDITORIAS_DA_PREVIA: readonly {
  readonly numero: string;
  readonly rotulo: string;
}[] = EDITORIAS.map((e, i) => ({
  numero: doisDigitos(i + 1),
  rotulo: e.rotulo,
}));

export interface TextosDaPrevia {
  readonly numero: string;
  readonly editoria: string;
  readonly titulo: string;
  /** "DD.MM.AAAA". */
  readonly data: string;
  readonly ficticio: boolean;
  /** Slogan na real; aviso de demonstração na fictícia. */
  readonly rodape: string;
}

/** O que a arte da matéria mostra. É o `titulo` (o `titulo_seo` fica no `og:title`). */
export function textosDaPrevia(artigo: Article): TextosDaPrevia {
  return {
    numero: numeroDaEditoria(artigo.editoria.slug),
    editoria: artigo.editoria.rotulo,
    titulo: artigo.titulo,
    data: formatarDataCurta(artigo.publicado_em),
    ficticio: artigo.ficticio,
    rodape: artigo.ficticio ? AVISO_DA_FICTICIA : SLOGAN,
  };
}

/** `og:image:alt` da matéria: o título, com o aviso de exemplo nas fictícias. */
export function altDaPrevia(
  artigo: Pick<Article, "titulo" | "ficticio">,
): string {
  return artigo.ficticio ? `Exemplo: ${artigo.titulo}` : artigo.titulo;
}

/** `og:image:alt` da imagem padrão: nome e lema do portal. */
export const ALT_DA_PREVIA_PADRAO = `${NOME_DO_PORTAL}: ${SLOGAN.toLowerCase()}. ${DESCRICAO_DO_PORTAL}`;
