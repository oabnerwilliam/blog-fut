import Link from "next/link";
import type { Article } from "@/lib/content";
import { formatarData } from "@/lib/datas";
import { hrefDaEditoria } from "@/lib/editorias";
import { SeloExemplo } from "./SeloExemplo";

type Props = { artigo: Article };

/**
 * Topo da matéria na faixa noturna: chapéu, título (h1), linha fina e ficha
 * (mockup variacao-2/materia.html: .night .art__head). Dentro da faixa, o foco usa o âmbar.
 */
export function CabecalhoDaMateria({ artigo }: Props) {
  return (
    <header className="mt-[clamp(1.25rem,3vw,2rem)] bg-night pt-[clamp(2rem,5vw,4rem)] pb-[clamp(2rem,4vw,3rem)] text-night-ink [&_:focus-visible]:outline-focus-night">
      <div className="wrap">
        <p className="label flex flex-wrap items-center gap-x-[0.8rem] gap-y-[0.35rem]">
          <Link
            className="text-amber hover:underline hover:underline-offset-[0.2em]"
            href={hrefDaEditoria(artigo.editoria.slug)}
          >
            {artigo.editoria.rotulo}
          </Link>
          {artigo.ficticio && <SeloExemplo />}
        </p>
        <h1 className="mt-[1.1rem] max-w-[18ch] font-display text-h1 leading-[0.93] font-normal tracking-[-0.03em]">
          {artigo.titulo}
        </h1>
        <div className="mt-[clamp(1.5rem,3vw,2.5rem)] grid gap-5 border-t-(length:--rule-width) border-night-rule pt-[1.1rem] grade:grid-cols-[minmax(0,8fr)_minmax(0,4fr)] grade:gap-x-12">
          <p className="max-w-[50ch] font-text text-[length:clamp(1.125rem,1rem+0.5vw,1.375rem)] leading-[1.45] font-medium text-pretty">
            {artigo.linha_fina}
          </p>
          <dl className="label grid grid-cols-[auto_1fr] content-start gap-x-4 gap-y-[0.3rem]">
            <dt className="text-night-ink-muted">Por</dt>
            <dd>{artigo.autor}</dd>
            <dt className="text-night-ink-muted">Data</dt>
            <dd className="mono">
              <time dateTime={artigo.publicado_em}>
                {formatarData(artigo.publicado_em)}
              </time>
            </dd>
            <dt className="text-night-ink-muted">Leitura</dt>
            <dd className="mono">{artigo.tempo_de_leitura} min de leitura</dd>
          </dl>
        </div>
      </div>
    </header>
  );
}
