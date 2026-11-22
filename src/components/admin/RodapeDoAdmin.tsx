import Link from "next/link";
import { ANO_DO_COLOFAO, NOME_DO_PORTAL } from "@/lib/site";

/** Colofão do admin no papel, sem a faixa noturna (README do design, "Rodapé do admin"). */
export function RodapeDoAdmin() {
  return (
    <footer className="mt-[clamp(3rem,7vw,6rem)] border-t-(length:--rule-width) border-rule-strong">
      <div className="wrap label flex flex-wrap items-center justify-between gap-x-8 gap-y-1 pt-[0.6rem] pb-6 text-ink-muted">
        <span>
          © <span className="mono">{ANO_DO_COLOFAO}</span> {NOME_DO_PORTAL} ·
          Admin
        </span>
        <Link
          className="inline-flex min-h-(--tap-min) items-center text-accent hover:underline hover:underline-offset-[0.25em]"
          href="/"
        >
          Ir para o portal →
        </Link>
      </div>
    </footer>
  );
}
