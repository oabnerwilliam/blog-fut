import { renderMarkdown } from "@/lib/content";
import styles from "./Prosa.module.css";

type Props = { corpoMd: string };

/**
 * Corpo da matéria. O HTML vem de `renderMarkdown`, já sanitizado (ADR 0004), e o
 * texto não passa por nenhuma troca tipográfica: sai exatamente como está no `.md`.
 */
export async function CorpoDaMateria({ corpoMd }: Props) {
  const html = await renderMarkdown(corpoMd);
  return (
    <div
      className={styles.prosa}
      data-corpo=""
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
