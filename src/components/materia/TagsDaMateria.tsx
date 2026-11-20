import Link from "next/link";
import type { TagRef } from "@/lib/content";

type Props = { tags: readonly TagRef[] };

/** Tags no fim do texto. As páginas `/tags/<slug>` são da história 5. */
export function TagsDaMateria({ tags }: Props) {
  if (tags.length === 0) return null;
  return (
    <nav
      className="mt-(--space-6) grid gap-(--space-2) border-t-(length:--rule-width) border-rule-strong pt-(--space-4)"
      aria-label="Tags da matéria"
    >
      <p className="label text-ink-muted">Tags</p>
      <ul className="flex flex-wrap gap-x-5">
        {tags.map((tag) => (
          <li key={tag.slug}>
            <Link
              className="inline-flex min-h-(--tap-min) items-center font-text text-[1rem] leading-[1.3] font-medium text-accent underline decoration-(length:--rule-width) underline-offset-[0.2em] hover:decoration-(length:--rule-width-strong)"
              href={`/tags/${tag.slug}`}
            >
              {tag.rotulo}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
