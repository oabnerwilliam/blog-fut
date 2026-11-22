import type { Marcador } from "@/lib/admin/telas";
import type { StatusDaMateria } from "@/lib/admin/tipos";

/**
 * Status e marcadores do painel de matérias (README de docs/design/17-painel). Forma e
 * palavra, nunca só cor; os símbolos ficam `aria-hidden`, e a palavra basta.
 */

const STATUS: Record<StatusDaMateria, { simbolo: string; rotulo: string }> = {
  publicado: { simbolo: "●", rotulo: "Publicado" },
  rascunho: { simbolo: "○", rotulo: "Rascunho" },
};

/** `rotulo` troca a palavra ("Sai como rascunho", na criação, história 18). */
export function SituacaoDaMateria({
  status,
  rotulo: outroRotulo,
}: {
  status: StatusDaMateria;
  rotulo?: string;
}) {
  const { simbolo } = STATUS[status];
  const rotulo = outroRotulo ?? STATUS[status].rotulo;
  return (
    <span
      className="inline-flex items-baseline gap-[0.45em] font-semibold text-ink"
      data-status={status}
    >
      <span aria-hidden="true" className="font-medium">
        {simbolo}
      </span>
      {rotulo}
    </span>
  );
}

const MARCADORES: Record<
  Marcador | "alteracoes",
  { simbolo: string; rotulo: string; tracejado: boolean }
> = {
  alteracoes: {
    simbolo: "◐",
    rotulo: "Alterações não publicadas",
    tracejado: true,
  },
  "em-edicao": { simbolo: "◐", rotulo: "Em edição", tracejado: true },
  publicada: { simbolo: "●", rotulo: "Publicada", tracejado: false },
  "texto-do-squad": {
    simbolo: "◇",
    rotulo: "Texto do squad",
    tracejado: false,
  },
};

/**
 * Marcador sem fundo (como o "VOCÊ" da 16): filete tracejado para o que ainda não está no
 * site, contínuo para o que está.
 */
export function Marca({ tipo }: { tipo: Marcador | "alteracoes" }) {
  const { simbolo, rotulo, tracejado } = MARCADORES[tipo];
  return (
    <span
      className={`inline-flex max-w-full items-center gap-[0.4em] border-(length:--rule-width) border-rule-strong px-[0.45rem] py-[0.28rem] font-mono text-[0.625rem] leading-[1.2] font-semibold tracking-[0.08em] text-ink uppercase ${tracejado ? "border-dashed" : ""}`}
      data-marca={tipo}
    >
      <span aria-hidden="true" className="text-[1.1em]">
        {simbolo}
      </span>
      {rotulo}
    </span>
  );
}
