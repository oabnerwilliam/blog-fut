import Link from "next/link";
import { Fragment } from "react";
import type { EditoriaDaCapa } from "@/lib/capa";
import { hrefDaEditoria } from "@/lib/editorias";
import { rotuloDaContagem } from "@/lib/listagens";
import { TituloDeSecao } from "./TituloDeSecao";

type Props = { editorias: readonly EditoriaDaCapa[] };

/**
 * Editorias como frase (mockup: .eds): um link por editoria, com a contagem em <sup>.
 * O <sup> ("02") é só visual; o leitor de tela ouve a contagem por extenso do `sr-only`, com
 * espaço antes ("Crônica 2 matérias", e não "Crônica2 matérias").
 * Sem `white-space: nowrap`: os rótulos são uma palavra só, e a contagem não se separa
 * dela; assim, com a fonte a 200% em 320px, a palavra quebra em vez de vazar a tela.
 */
export function EditoriasDaCapa({ editorias }: Props) {
  if (editorias.length === 0) return null;
  return (
    <section aria-labelledby="editorias" className="pt-(--space-section)">
      <div className="wrap">
        <TituloDeSecao complemento="matérias publicadas" id="editorias">
          Editorias
        </TituloDeSecao>
        <p className="font-display text-[length:clamp(2.1rem,1.2rem+4vw,5.25rem)] leading-[1.08] tracking-[-0.025em] text-balance">
          {editorias.map((editoria, i) => (
            <Fragment key={editoria.slug}>
              {/* O espaço depois da barra é o ponto de quebra de linha (como no mockup). */}
              {i > 0 && (
                <>
                  <span aria-hidden="true" className="mx-[0.12em] text-rule">
                    /
                  </span>{" "}
                </>
              )}
              <Link
                className="hover:text-accent"
                href={hrefDaEditoria(editoria.slug)}
              >
                {editoria.rotulo}
                <span className="sr-only">
                  {" "}
                  {rotuloDaContagem(editoria.total)}
                </span>
                <sup
                  aria-hidden="true"
                  className="top-0 ml-[0.15em] align-super font-mono text-[0.8rem] leading-none font-medium tracking-normal text-accent tabular-nums"
                >
                  {String(editoria.total).padStart(2, "0")}
                </sup>
              </Link>
            </Fragment>
          ))}
        </p>
      </div>
    </section>
  );
}
