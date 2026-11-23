import { notFound } from "next/navigation";
import { ImageResponse } from "next/og";
import { getRepository } from "@/lib/content";
import { paramsDasMaterias } from "@/lib/materias";
import { ArteDaMateria } from "@/lib/og/artes";
import { fontesDaPrevia } from "@/lib/og/fontes";
import {
  ALT_DA_PREVIA_PADRAO,
  TAMANHO_DA_PREVIA,
  TIPO_DA_PREVIA,
  textosDaPrevia,
} from "@/lib/og/previa";

/*
 * Prévia do link da matéria (T02): a imagem que WhatsApp, LinkedIn e X mostram. Rota de
 * imagem de metadados (`opengraph-image`), gerada no build para cada matéria, como a
 * página. A leitura passa por `getRepository().getBySlug`, que no Supabase roda em
 * "use cache" com a etiqueta `materia:<slug>`: a imagem prerenderizada herda a etiqueta e
 * é refeita quando o painel ou o webhook invalidam a matéria.
 */

export const size = TAMANHO_DA_PREVIA;
export const contentType = TIPO_DA_PREVIA;
/** Só um padrão: o `og:image:alt` com o título vem do `generateMetadata` da página. */
export const alt = ALT_DA_PREVIA_PADRAO;

/** As mesmas matérias da página. Slug fora da lista renderiza sob demanda. */
export async function generateStaticParams() {
  return paramsDasMaterias(getRepository());
}

export default async function ImagemDaMateria({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const artigo = await getRepository().getBySlug(slug);
  if (!artigo) notFound();
  return new ImageResponse(<ArteDaMateria textos={textosDaPrevia(artigo)} />, {
    ...TAMANHO_DA_PREVIA,
    fonts: fontesDaPrevia(),
  });
}
