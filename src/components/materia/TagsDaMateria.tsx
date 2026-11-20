import Link from "next/link";
import type { TagRef } from "@/lib/content";
import styles from "./TagsDaMateria.module.css";

type Props = { tags: readonly TagRef[] };

/** Tags no fim do texto. As páginas `/tags/<slug>` são da história 5. */
export function TagsDaMateria({ tags }: Props) {
  if (tags.length === 0) return null;
  return (
    <nav className={styles.tags} aria-label="Tags da matéria">
      <p className={`label ${styles.rotulo}`}>Tags</p>
      <ul className={styles.lista}>
        {tags.map((tag) => (
          <li key={tag.slug}>
            <Link className={styles.link} href={`/tags/${tag.slug}`}>
              {tag.rotulo}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
