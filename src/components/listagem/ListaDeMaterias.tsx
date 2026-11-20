import Link from "next/link";
import { ChapeuDaCapa } from "@/components/capa/ChapeuDaCapa";
import { LINK_ESTICADO, SUBLINHA_NO_HOVER } from "@/components/capa/classes";
import type { ArticleSummary } from "@/lib/content";
import { formatarDiaMesCurto } from "@/lib/datas";
import { caminhoDaMateria } from "@/lib/seo";

type Props = {
  materias: readonly ArticleSummary[];
  /** h3 nas Últimas da capa (abaixo do h2 da seção); h2 nas listagens (abaixo do h1). */
  nivelDoTitulo: "h2" | "h3";
};

/**
 * Linhas de súmula (mockup variacao-2/capa.html: .rows), usadas nas Últimas da capa e nas
 * páginas de editoria e de tag. A data ocupa uma coluna à esquerda (mockup). Se a lista
 * ficar mais estreita que 10rem (fonte do leitor ampliada numa tela de 320px), a data sobe
 * para cima do chapéu, para o selo "Exemplo" não vazar a tela. O `rem` da container query
 * segue a fonte do leitor; o de uma media query não seguiria.
 */
export function ListaDeMaterias({ materias, nivelDoTitulo: Titulo }: Props) {
  if (materias.length === 0) return null;
  return (
    <ol className="@container border-b-(length:--rule-width) border-rule-strong">
      {materias.map((materia) => (
        <li
          className="group relative grid grid-cols-[3.4rem_minmax(0,1fr)] gap-x-4 gap-y-[0.35rem] border-t-(length:--rule-width) border-rule pt-4 pb-[1.1rem] first:border-rule-strong grade:grid-cols-[5.5rem_10rem_minmax(0,1fr)_minmax(0,22rem)_4rem] grade:items-baseline grade:gap-5 grade:py-[1.1rem] @max-[10rem]:grid-cols-[minmax(0,1fr)]"
          key={materia.slug}
        >
          <time
            className="label mono row-span-2 pt-[0.35rem] text-ink-muted grade:row-auto grade:pt-0 @max-[10rem]:row-span-1 @max-[10rem]:pt-0"
            dateTime={materia.publicado_em}
          >
            {formatarDiaMesCurto(materia.publicado_em)}
          </time>
          <ChapeuDaCapa
            className="col-start-2 grade:row-start-1 grade:flex-col grade:items-start grade:gap-2 @max-[10rem]:col-start-1"
            materia={materia}
          />
          <Titulo className="font-display text-row-title leading-[1.06] font-normal tracking-[-0.012em] grade:col-start-3 grade:row-start-1">
            <Link
              className={`${LINK_ESTICADO} ${SUBLINHA_NO_HOVER}`}
              href={caminhoDaMateria(materia.slug)}
            >
              {materia.titulo}
            </Link>
          </Titulo>
          <p className="hidden font-text text-[0.9375rem] leading-[1.45] text-ink-muted grade:col-start-4 grade:row-start-1 grade:block">
            {materia.linha_fina}
          </p>
          <span className="label mono col-start-2 text-ink-muted grade:col-start-5 grade:row-start-1 grade:text-right @max-[10rem]:col-start-1">
            {materia.tempo_de_leitura} min
          </span>
        </li>
      ))}
    </ol>
  );
}
