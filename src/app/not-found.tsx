import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";

/** A `not-found` raiz aceita `metadata` (doc do Next 16, "not-found.js > Metadata"). */
export const metadata: Metadata = {
  title: "Página não encontrada",
};

/**
 * 404 do portal. A raiz só tem o layout raiz (sem cabeçalho nem rodapé desde a história
 * 16), então ela monta os do portal: o HTML continua o mesmo de antes. Vale para o
 * `notFound()` das páginas, para o rewrite do Proxy e para o `/admin` desligado.
 */
export default function NaoEncontrada() {
  return (
    <>
      <SiteHeader />
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
      <SiteFooter />
    </>
  );
}
