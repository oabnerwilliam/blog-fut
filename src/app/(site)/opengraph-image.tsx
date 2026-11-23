import { ImageResponse } from "next/og";
import { ArtePadrao } from "@/lib/og/artes";
import { fontesDaPrevia } from "@/lib/og/fontes";
import {
  ALT_DA_PREVIA_PADRAO,
  TAMANHO_DA_PREVIA,
  TIPO_DA_PREVIA,
} from "@/lib/og/previa";

/*
 * Prévia padrão do portal (T02): capa e busca a herdam do segmento `(site)`; editorias e
 * tags a repassam no próprio `openGraph` (o `openGraph` de uma página substitui o do
 * segmento de cima). A matéria tem a dela, em `materias/[slug]/opengraph-image.tsx`.
 * Não lê dados: é gerada uma vez, no build.
 */

export const size = TAMANHO_DA_PREVIA;
export const contentType = TIPO_DA_PREVIA;
export const alt = ALT_DA_PREVIA_PADRAO;

export default function ImagemPadrao() {
  return new ImageResponse(<ArtePadrao />, {
    ...TAMANHO_DA_PREVIA,
    fonts: fontesDaPrevia(),
  });
}
