import Link from "next/link";
import { SeloExemplo } from "@/components/materia/SeloExemplo";
import type { FaixaDaCapa } from "@/lib/capa";
import { formatarDiaMes } from "@/lib/datas";
import { hrefDaEditoria } from "@/lib/editorias";
import { caminhoDaMateria } from "@/lib/seo";
import { LINK_ESTICADO, SUBLINHA_NO_HOVER } from "./classes";
import { TituloDeSecao } from "./TituloDeSecao";

type Props = { faixa: FaixaDaCapa };

/** Faixa de uma editoria (mockup: .trio): as três mais recentes, em colunas a partir de 48rem. */
export function FaixaDaEditoria({ faixa }: Props) {
  const { editoria, itens } = faixa;
  const id = `faixa-${editoria.slug}`;
  return (
    <section
      aria-labelledby={id}
      className="pt-(--space-section)"
      data-faixa={editoria.slug}
    >
      <div className="wrap">
        <TituloDeSecao
          complemento={
            <Link
              className="hover:text-accent"
              href={hrefDaEditoria(editoria.slug)}
            >
              Ver todas →
            </Link>
          }
          id={id}
        >
          {editoria.rotulo}
        </TituloDeSecao>
        <div className="grid grid-cols-[minmax(0,1fr)] border-t-(length:--rule-width) border-rule-strong md:grid-cols-3">
          {itens.map((materia) => {
            const { dia, mes } = formatarDiaMes(materia.publicado_em);
            return (
              <article
                className="group relative grid grid-cols-[minmax(0,1fr)] content-start gap-3 border-b-(length:--rule-width) border-rule pt-[1.1rem] pb-[1.4rem] md:border-b-0 md:pr-6 md:not-first:pl-6 md:not-first:shadow-[inset_1px_0_0_var(--color-rule)]"
                key={materia.slug}
              >
                <p className="font-display text-[3.25rem] leading-[0.9] tracking-[-0.02em] lining-nums tabular-nums">
                  <time dateTime={materia.publicado_em}>
                    {dia}
                    {/* Espaço só para o leitor de tela ("25 out"); o vão visual é a margem do <small>. */}
                    <span className="sr-only"> </span>
                    <small className="ml-[0.35rem] align-[0.9em] font-mono text-label leading-none font-medium tracking-[0.08em] text-ink-muted uppercase">
                      {mes}
                    </small>
                  </time>
                </p>
                <h3 className="font-display text-[1.6rem] leading-[1.1] font-normal tracking-[-0.01em] italic">
                  <Link
                    className={`${LINK_ESTICADO} ${SUBLINHA_NO_HOVER}`}
                    href={caminhoDaMateria(materia.slug)}
                  >
                    {materia.titulo}
                  </Link>
                </h3>
                <p className="label flex flex-wrap items-center gap-[0.6rem]">
                  {materia.ficticio && <SeloExemplo />}
                  <span className="mono text-ink-muted">
                    {materia.tempo_de_leitura} min
                  </span>
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
