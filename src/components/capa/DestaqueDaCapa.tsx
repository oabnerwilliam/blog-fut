import Link from "next/link";
import type { ArticleSummary } from "@/lib/content";
import { formatarDataCurta } from "@/lib/datas";
import { caminhoDaMateria } from "@/lib/seo";
import { ChapeuDaCapa } from "./ChapeuDaCapa";

type Props = { materia: ArticleSummary };

/**
 * Destaque na faixa noturna (mockup variacao-2/capa.html: .night.lead). O título é o h2 da
 * seção. Dentro da faixa, o foco usa o âmbar, como no topo da matéria e no rodapé.
 */
export function DestaqueDaCapa({ materia }: Props) {
  return (
    <section
      aria-labelledby="destaque"
      className="mt-[clamp(1.25rem,3vw,2rem)] bg-night pt-[clamp(2rem,5vw,4rem)] pb-[clamp(2.25rem,5vw,4rem)] text-night-ink [&_:focus-visible]:outline-focus-night"
      data-secao="destaque"
    >
      <div className="wrap">
        <ChapeuDaCapa corDaEditoria="text-amber" materia={materia}>
          <span className="text-night-ink-muted">Destaque</span>
        </ChapeuDaCapa>
        <h2
          className="mt-[1.1rem] max-w-[17ch] font-display text-display leading-[0.92] font-normal tracking-[-0.03em]"
          id="destaque"
        >
          <Link
            className="hover:underline hover:decoration-[length:0.04em] hover:underline-offset-[0.1em]"
            href={caminhoDaMateria(materia.slug)}
          >
            {materia.titulo}
          </Link>
        </h2>
        <div className="mt-[clamp(1.5rem,3vw,2.5rem)] grid gap-5 border-t-(length:--rule-width) border-night-rule pt-[1.1rem] grade:grid-cols-[minmax(0,8fr)_minmax(0,4fr)] grade:gap-x-12">
          <p className="max-w-[54ch] font-text text-dek leading-normal font-normal text-pretty">
            {materia.linha_fina}
          </p>
          <dl className="label grid grid-cols-[auto_1fr] content-start gap-x-4 gap-y-[0.3rem]">
            <dt className="text-night-ink-muted">Por</dt>
            <dd>{materia.autor}</dd>
            <dt className="text-night-ink-muted">Data</dt>
            <dd className="mono">
              <time dateTime={materia.publicado_em}>
                {formatarDataCurta(materia.publicado_em)}
              </time>
            </dd>
            <dt className="text-night-ink-muted">Leitura</dt>
            <dd className="mono">{materia.tempo_de_leitura} min</dd>
          </dl>
        </div>
      </div>
    </section>
  );
}
