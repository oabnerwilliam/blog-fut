import Link from "next/link";
import type { ReactNode } from "react";
import type { ArticleSummary } from "@/lib/content";
import { hrefDaEditoria } from "@/lib/editorias";
import { SeloExemplo } from "@/components/materia/SeloExemplo";

type Props = {
  materia: ArticleSummary;
  /** Classes extras do bloco (posição na grade das linhas, cor da editoria na faixa noturna). */
  className?: string;
  /** Cor do link da editoria: acento no papel, âmbar na faixa noturna. */
  corDaEditoria?: string;
  children?: ReactNode;
};

/**
 * Chapéu das matérias da capa (mockup: .kicker): editoria com link e o selo "Exemplo" das
 * fictícias. Só o link e o selo ficam acima do link esticado do título (`relative z-1`): a
 * área vazia do chapéu continua abrindo a matéria.
 */
export function ChapeuDaCapa({
  materia,
  className = "",
  corDaEditoria = "text-accent",
  children,
}: Props) {
  return (
    <p
      className={`label flex flex-wrap items-center gap-x-[0.8rem] gap-y-[0.35rem] ${className}`}
    >
      <Link
        className={`relative z-1 ${corDaEditoria} hover:underline hover:underline-offset-[0.2em]`}
        href={hrefDaEditoria(materia.editoria.slug)}
      >
        {materia.editoria.rotulo}
      </Link>
      {materia.ficticio && <SeloExemplo className="relative z-1" />}
      {children}
    </p>
  );
}
