import type { Metadata } from "next";
import Link from "next/link";

/** A `not-found` raiz aceita `metadata` (doc do Next 16, "not-found.js > Metadata"). */
export const metadata: Metadata = {
  title: "Página não encontrada",
};

/** 404 do portal: renderizada dentro do layout raiz (cabeçalho e rodapé). */
export default function NaoEncontrada() {
  return (
    <main id="conteudo" tabIndex={-1} className="wrap pt-(--space-section)">
      <p className="label text-ink-muted">Erro 404</p>
      <h1 className="mt-[1.1rem] max-w-[18ch] font-display text-h1 leading-[0.93] font-normal tracking-[-0.03em]">
        Página não encontrada
      </h1>
      <p className="mt-(--space-6) max-w-(--layout-measure) font-text text-dek leading-normal font-normal">
        O endereço pode ter mudado ou a matéria não existe mais.
      </p>
      <p className="mt-(--space-5)">
        <Link
          className="text-accent underline decoration-(length:--rule-width) underline-offset-[0.2em] hover:decoration-(length:--rule-width-strong)"
          href="/"
        >
          Voltar para a capa
        </Link>
      </p>
    </main>
  );
}
