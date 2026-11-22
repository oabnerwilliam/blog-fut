import "server-only";
import { renderMarkdown } from "@/lib/content/markdown";
import { recusaDoPainel } from "./painel";
import { TAMANHO_MAXIMO_DO_CORPO, type ResultadoDoPainel } from "./tipos";

/**
 * A prévia do editor (história 18, critério 4): o markdown do `textarea` vira o HTML do
 * **mesmo** `renderMarkdown` do site, com o esquema de sanitização do ADR 0004 (sem
 * `<script>`, `on*` nem `javascript:`). Assim o que o admin vê na prévia é o que o leitor
 * vai ver, e o HTML que chega ao navegador já está limpo: é só ele que a tela injeta com
 * `dangerouslySetInnerHTML`.
 *
 * O limite é o do `corpo_md` da 17 (`TAMANHO_MAXIMO_DO_CORPO`): um texto maior nem é
 * renderizado (a criação também recusaria).
 *
 * Quem chama é a action `previsualizar` (`materias.ts`), depois do `exigirAdmin()`.
 */
export async function renderizarPrevia(
  md: unknown,
): Promise<ResultadoDoPainel<{ html: string }>> {
  if (typeof md !== "string") {
    return recusaDoPainel("campos_invalidos", {
      errosDosCampos: { corpo_md: "o corpo precisa ser um texto" },
    });
  }
  if (md.length > TAMANHO_MAXIMO_DO_CORPO) {
    return recusaDoPainel("campos_invalidos", {
      errosDosCampos: {
        corpo_md: `passa de ${TAMANHO_MAXIMO_DO_CORPO.toLocaleString("pt-BR")} caracteres`,
      },
    });
  }
  return { ok: true, html: await renderMarkdown(md) };
}
