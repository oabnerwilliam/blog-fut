import type { Article } from "@/lib/content/types";
import { SLUGS_DE_EDITORIA, rotuloDaEditoria } from "@/lib/editorias";

const EDITORIA_PADRAO = SLUGS_DE_EDITORIA[0];

/** Monta um Article válido em memória, para testes que não passam pelo parse. */
export function montarArtigo(parcial: Partial<Article> = {}): Article {
  return {
    slug: "materia-teste",
    titulo: "Título de teste",
    linha_fina: "Linha fina de teste",
    editoria: {
      slug: EDITORIA_PADRAO,
      rotulo: rotuloDaEditoria(EDITORIA_PADRAO),
    },
    tags: [{ slug: "fc-aurora", rotulo: "FC Aurora" }],
    publicado_em: "2026-10-01",
    autor: "Squad Fut",
    ficticio: false,
    tempo_de_leitura: 1,
    titulo_seo: null,
    meta_description: null,
    palavras_chave: [],
    origem: "squad-fut/textos/teste",
    fonte: "squad",
    corpo_md: "Corpo de teste.\n",
    ...parcial,
  };
}
