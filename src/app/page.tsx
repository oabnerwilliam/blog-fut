import Link from "next/link";
import { hrefDaEditoria } from "@/lib/editorias";

/** Capa provisória: só mostra os tokens. A capa real (destaque e grade) é da história 4. */
export default function Home() {
  return (
    <main id="conteudo" tabIndex={-1} className="wrap pt-(--space-section)">
      <p className="label text-ink-muted">◇ Edição zero</p>
      <h1 className="mt-[1.1rem] max-w-[17ch] font-display text-display leading-[0.92] font-normal tracking-[-0.03em]">
        A Zona Mista abre em breve
      </h1>
      <p className="mt-(--space-6) max-w-(--layout-measure) font-text text-dek leading-normal font-normal text-pretty">
        Análise, crônica e reportagem de futebol, apuradas e escritas pelo
        squad-fut. As primeiras matérias estão sendo preparadas.
      </p>
      <p className="mt-(--space-5)">
        <Link
          className="text-accent underline decoration-(length:--rule-width) underline-offset-[0.2em] hover:decoration-(length:--rule-width-strong)"
          href={hrefDaEditoria("analise")}
        >
          Conheça a editoria de Análise
        </Link>
      </p>
    </main>
  );
}
