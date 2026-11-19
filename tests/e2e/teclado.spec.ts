import { expect, test, type Page } from "@playwright/test";
import { EDITORIAS, hrefDaEditoria } from "../../src/lib/editorias";
import { corDoToken } from "./helpers";

const ORDEM = [
  "#conteudo",
  "/",
  ...EDITORIAS.map((e) => hrefDaEditoria(e.slug)),
];

const hrefAtivo = (page: Page) =>
  page.evaluate(() => document.activeElement?.getAttribute("href") ?? null);

const contornoAtivo = (page: Page) =>
  page.evaluate(() => {
    const el = document.activeElement as HTMLElement;
    const s = getComputedStyle(el);
    return {
      estilo: s.outlineStyle,
      largura: s.outlineWidth,
      cor: s.outlineColor,
    };
  });

test("o primeiro Tab foca o link de pular, e ele fica visível", async ({
  page,
}) => {
  await page.goto("/");
  const pular = page.getByRole("link", { name: "Pular para o conteúdo" });
  await expect(pular).not.toBeInViewport();
  await page.keyboard.press("Tab");
  await expect(pular).toBeFocused();
  await expect(pular).toBeInViewport();
});

test("Enter no link de pular leva ao main", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#conteudo$/);
  await expect(page.locator("main#conteudo")).toBeFocused();
});

for (const esquema of ["light", "dark"] as const) {
  test.describe(`foco (${esquema})`, () => {
    test.use({ colorScheme: esquema });

    test("ordem de Tab: pular, nome, 7 editorias", async ({ page }) => {
      await page.goto("/");
      const visitados: (string | null)[] = [];
      for (let i = 0; i < ORDEM.length; i++) {
        await page.keyboard.press("Tab");
        visitados.push(await hrefAtivo(page));
      }
      expect(visitados).toEqual(ORDEM);
    });

    test("cada um tem contorno sólido de 3px na cor do token de foco", async ({
      page,
    }) => {
      await page.goto("/");
      const foco = await corDoToken(page, "--color-focus");
      const tinta = await corDoToken(page, "--color-ink");

      await page.keyboard.press("Tab");
      expect(await contornoAtivo(page)).toEqual({
        estilo: "solid",
        largura: "3px",
        cor: tinta,
      });

      for (let i = 1; i < ORDEM.length; i++) {
        await page.keyboard.press("Tab");
        const href = await hrefAtivo(page);
        expect(await contornoAtivo(page), `foco em ${href}`).toEqual({
          estilo: "solid",
          largura: "3px",
          cor: foco,
        });
      }
    });

    test("links do rodapé usam --color-focus-night", async ({ page }) => {
      await page.goto("/");
      const focoNoturno = await corDoToken(page, "--color-focus-night");
      const links = page
        .getByRole("navigation", { name: "Editorias no rodapé" })
        .getByRole("link");
      await expect(links).toHaveCount(7);
      // Chega ao primeiro link do rodapé por teclado, para valer o :focus-visible.
      await links.last().focus();
      await page.keyboard.press("Shift+Tab");
      await page.keyboard.press("Tab");
      await expect(links.last()).toBeFocused();
      expect(await contornoAtivo(page)).toEqual({
        estilo: "solid",
        largura: "3px",
        cor: focoNoturno,
      });
    });
  });
}
