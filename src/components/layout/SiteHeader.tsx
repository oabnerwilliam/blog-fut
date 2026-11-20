import Link from "next/link";
import { BuscaDoCabecalho } from "@/components/busca/CampoDeBusca";
import { NOME_DO_PORTAL, SLOGAN, SLOGAN_LONGO } from "@/lib/site";
import { EditoriasNav } from "./EditoriasNav";

export type SiteHeaderProps = {
  /**
   * Data da edição (`publicado_em` da matéria mais recente). Entra na história 4, com
   * `formatarEdicao`. Nesta história o layout não a passa e a linha de cima mostra só o slogan.
   */
  edicao?: Date;
};

/** Cabeçalho sobre o papel (tokens.md §5.2). */
// `edicao` é contrato da história 4; por ora o parâmetro é recebido e ignorado.
export function SiteHeader(_: SiteHeaderProps) {
  return (
    <header className="pt-[0.9rem]">
      <div className="wrap">
        {/* Linha de cima. Sem a data da edição (história 4), só o slogan, à esquerda. */}
        <p className="label flex justify-between gap-4 border-b-(length:--rule-width) border-rule pb-[0.65rem] text-ink-muted">
          <span>{SLOGAN}</span>
        </p>
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3 pt-[0.6rem] pb-[0.2rem]">
          <Link
            className="pb-[0.08em] font-display text-wordmark leading-[0.82] font-normal tracking-[-0.035em] whitespace-nowrap text-ink"
            href="/"
            aria-label={`${NOME_DO_PORTAL}, página inicial`}
          >
            Zona<i className="ml-[0.1em] tracking-[-0.045em] italic">Mista</i>
          </Link>
          {/*
           * Coluna lateral (mockup 06: .mast__side): slogan longo e campo de busca. Abaixo de
           * 48rem, ocupa a linha toda embaixo do wordmark, e o slogan some; a partir de 48rem,
           * fica à direita do wordmark, alinhada à base dele.
           */}
          <div className="grid flex-[1_1_100%] gap-[0.6rem] pb-[0.55rem] md:flex-[0_1_22rem] md:justify-items-end">
            <p className="label hidden text-right text-ink-muted md:block">
              {SLOGAN_LONGO[0]}
              <br />
              {SLOGAN_LONGO[1]}
            </p>
            <BuscaDoCabecalho />
          </div>
        </div>
      </div>
      <EditoriasNav rotulo="Editorias" variante="cabecalho" />
    </header>
  );
}
