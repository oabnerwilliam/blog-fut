import { rotuloDaSituacao } from "@/lib/admin/formatos";
import type { StatusDoPerfil } from "@/lib/auth/servidor";

/** Forma + palavra, nunca só cor (README do design, "Situação"). */
const SIMBOLOS: Record<StatusDoPerfil, string> = {
  pendente: "○",
  aprovado: "●",
  recusado: "✕",
  revogado: "—",
};

export function Situacao({ status }: { status: StatusDoPerfil }) {
  return (
    <span
      className="inline-flex items-baseline gap-[0.45em] font-semibold text-ink"
      data-situacao={status}
    >
      <span aria-hidden="true" className="font-medium">
        {SIMBOLOS[status]}
      </span>
      {rotuloDaSituacao(status)}
    </span>
  );
}
