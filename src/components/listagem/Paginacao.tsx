import Link from "next/link";
import { caminhoDaListagem, type Listagem } from "@/lib/listagens";

type Props = { listagem: Listagem };

const LINK =
  "inline-flex min-h-(--tap-min) items-center text-accent hover:underline hover:underline-offset-[0.2em]";

/**
 * Navegação entre as páginas de uma editoria ou tag. Só aparece com mais de uma página.
 * "Página N de M" é texto: a página atual nunca vira link. Na primeira não há
 * "Anteriores"; na última não há "Próximas". Em telas estreitas, os itens quebram de linha.
 */
export function Paginacao({ listagem }: Props) {
  const { tipo, slug, pagina, totalPaginas } = listagem;
  if (totalPaginas <= 1) return null;
  return (
    <nav
      aria-label="Paginação"
      className="label mt-(--space-6) flex flex-wrap items-center justify-between gap-x-6 gap-y-2"
    >
      {pagina > 1 && (
        <Link className={LINK} href={caminhoDaListagem(tipo, slug, pagina - 1)}>
          ← Anteriores
        </Link>
      )}
      <span className="mono text-ink-muted">
        Página {pagina} de {totalPaginas}
      </span>
      {pagina < totalPaginas && (
        <Link className={LINK} href={caminhoDaListagem(tipo, slug, pagina + 1)}>
          Próximas →
        </Link>
      )}
    </nav>
  );
}
