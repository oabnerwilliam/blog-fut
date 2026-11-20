import Link from "next/link";
import type { ArticleSummary } from "@/lib/content";
import { formatarDiaMesCurto } from "@/lib/datas";
import { caminhoDaMateria } from "@/lib/seo";
import { ChapeuDaCapa } from "./ChapeuDaCapa";
import { LINK_ESTICADO, SUBLINHA_NO_HOVER } from "./classes";
import { TituloDeSecao } from "./TituloDeSecao";

type Props = { materias: readonly ArticleSummary[] };

const doisDigitos = (n: number) => String(n).padStart(2, "0");

/** Últimas (mockup: .feature + .rows): a primeira em formato "feature", as demais em linhas de súmula. */
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

        {/*
         * Linhas: a data ocupa uma coluna à esquerda (mockup). Se a lista ficar mais estreita
         * que 10rem (fonte do leitor ampliada numa tela de 320px), a data sobe para cima do
         * chapéu, para o selo "Exemplo" não vazar a tela. O `rem` da container query segue a
         * fonte do leitor; o de uma media query não seguiria.
         */}
        {demais.length > 0 && (
          <ol className="@container border-b-(length:--rule-width) border-rule-strong">
            {demais.map((materia) => (
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
                <h3 className="font-display text-row-title leading-[1.06] font-normal tracking-[-0.012em] grade:col-start-3 grade:row-start-1">
                  <Link
                    className={`${LINK_ESTICADO} ${SUBLINHA_NO_HOVER}`}
                    href={caminhoDaMateria(materia.slug)}
                  >
                    {materia.titulo}
                  </Link>
                </h3>
                <p className="hidden font-text text-[0.9375rem] leading-[1.45] text-ink-muted grade:col-start-4 grade:row-start-1 grade:block">
                  {materia.linha_fina}
                </p>
                <span className="label mono col-start-2 text-ink-muted grade:col-start-5 grade:row-start-1 grade:text-right @max-[10rem]:col-start-1">
                  {materia.tempo_de_leitura} min
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
