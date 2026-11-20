import { expect, test, type Page } from "@playwright/test";
import { corDoToken } from "./helpers";

/** Riscos da revisão da história 03: foco visível na faixa noturna e nas tags, nos dois temas. */
const URL_DA_MATERIA = "/materias/como-o-atletico-ventania-defende-com-a-bola";

const contornoAtivo = (page: Page) =>
  page.evaluate(() => {
    const s = getComputedStyle(document.activeElement as HTMLElement);
    return {
      estilo: s.outlineStyle,
      largura: s.outlineWidth,
      cor: s.outlineColor,
    };
  });

/**
 * Avança com Tab até um link do `<article>` com o `href` pedido (no máximo 40 passos).
 * Só conta links dentro do artigo: o menu do cabeçalho também aponta para as editorias.
 */
async function tabAte(page: Page, href: string) {
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press("Tab");
    const atual = await page.evaluate(() => {
      const el = document.activeElement;
      return el?.closest("article") ? el.getAttribute("href") : null;
    });
    if (atual === href) return;
  }
  throw new Error(`Tab não chegou a ${href}`);
}

for (const esquema of ["light", "dark"] as const) {
  test.describe(`matéria: foco por teclado (${esquema})`, () => {
    test.use({ colorScheme: esquema });

    test("link da editoria na faixa noturna usa --color-focus-night", async ({
      page,
    }) => {
      await page.goto(URL_DA_MATERIA);
      const focoNoturno = await corDoToken(page, "--color-focus-night");
      await tabAte(page, "/editorias/analise");
      await expect(
        page
          .locator("article")
          .getByRole("link", { name: "Análise", exact: true }),
      ).toBeFocused();
      expect(await contornoAtivo(page)).toEqual({
        estilo: "solid",
        largura: "3px",
        cor: focoNoturno,
      });
    });

    test("links das tags recebem foco com contorno do token de foco", async ({
      page,
    }) => {
      await page.goto(URL_DA_MATERIA);
      const foco = await corDoToken(page, "--color-focus");
      await tabAte(page, "/tags/atletico-ventania");
      expect(await contornoAtivo(page)).toEqual({
        estilo: "solid",
        largura: "3px",
        cor: foco,
      });
    });
  });
}
