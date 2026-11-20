import { renderMarkdown } from "@/lib/content";

type Props = { corpoMd: string };

/**
 * Corpo da matéria. O HTML vem de `renderMarkdown`, já sanitizado (ADR 0004), e o
 * texto não passa por nenhuma troca tipográfica: sai exatamente como está no `.md`.
 * Os estilos do HTML gerado ficam na classe `.prosa` (globals.css, @layer components).
 */
export async function CorpoDaMateria({ corpoMd }: Props) {
  const html = await renderMarkdown(corpoMd);
  return (
    <div
      className="prosa"
      data-corpo=""
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
