import Link from "next/link";
import type { ArticleSummary } from "@/lib/content";
import { formatarDiaMesCurto } from "@/lib/datas";
import { caminhoDaMateria } from "@/lib/seo";
import { ListaDeMaterias } from "@/components/listagem/ListaDeMaterias";
import { ChapeuDaCapa } from "./ChapeuDaCapa";
import { LINK_ESTICADO, SUBLINHA_NO_HOVER } from "./classes";
import { TituloDeSecao } from "./TituloDeSecao";

type Props = { materias: readonly ArticleSummary[] };

const doisDigitos = (n: number) => String(n).padStart(2, "0");

/**
 * Últimas (mockup: .feature + .rows): a primeira em formato "feature", as demais nas linhas
 * de súmula compartilhadas com as listagens (`ListaDeMaterias`).
 */
export function UltimasDaCapa({ materias }: Props) {
  if (materias.length === 0) return null;
  const [primeira, ...demais] = materias;
  return (
    <section aria-labelledby="ultimas" className="pt-(--space-section)">
      <div className="wrap">
        <TituloDeSecao
          complemento={
            <span className="mono">{doisDigitos(materias.length)}</span>
          }
          id="ultimas"
        >
          Últimas
        </TituloDeSecao>

        <article className="group relative grid grid-cols-[minmax(0,1fr)] gap-[0.9rem] pb-7 grade:grid-cols-[minmax(0,8fr)_minmax(0,4fr)] grade:items-end grade:gap-x-12">
          <ChapeuDaCapa className="grade:col-span-full" materia={primeira} />
          <h3 className="font-display text-feature leading-[0.98] font-normal tracking-[-0.025em]">
            <Link
              className={`${LINK_ESTICADO} ${SUBLINHA_NO_HOVER}`}
              href={caminhoDaMateria(primeira.slug)}
            >
              {primeira.titulo}
            </Link>
          </h3>
          <div className="grade:grid grade:gap-3 grade:pb-[0.4rem]">
            <p className="max-w-[44ch] font-text text-[1.125rem] leading-normal text-pretty text-ink-muted">
              {primeira.linha_fina}
            </p>
            <p className="label text-ink-muted">
              <time className="mono" dateTime={primeira.publicado_em}>
                {formatarDiaMesCurto(primeira.publicado_em)}
              </time>{" "}
              · <span className="mono">{primeira.tempo_de_leitura} min</span>
            </p>
          </div>
        </article>

        <ListaDeMaterias materias={demais} nivelDoTitulo="h3" />
      </div>
    </section>
  );
}
