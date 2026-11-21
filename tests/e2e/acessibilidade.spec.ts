import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { definirTema } from "./helpers";

async function violacoes(page: Page) {
  const resultado = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  return resultado.violations.map((v) => ({
    id: v.id,
    alvos: v.nodes.map((n) => n.target.join(" ")),
  }));
}

/** A capa e a 404 (história 12), nos dois temas do sistema e no tema forçado oposto. */
const PAGINAS = [
  { nome: "capa", url: "/" },
  { nome: "404", url: "/materias/nao-existe" },
] as const;

for (const esquema of ["light", "dark"] as const) {
  test.describe(`sistema ${esquema === "light" ? "claro" : "escuro"}`, () => {
    test.use({ colorScheme: esquema });
    const forcado = esquema === "light" ? "dark" : "light";

    for (const { nome, url } of PAGINAS) {
      test(`sem violações axe na ${nome}: sistema ${esquema === "light" ? "claro" : "escuro"}`, async ({
        page,
      }) => {
        await page.goto(url);
        expect(await violacoes(page)).toEqual([]);
      });

      test(`sem violações axe na ${nome}: data-theme=${forcado}`, async ({
        page,
      }) => {
        await page.goto(url);
        await definirTema(page, forcado);
        expect(await violacoes(page)).toEqual([]);
      });
    }
  });
}

test("sem violações axe com o link de pular focado", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  expect(await violacoes(page)).toEqual([]);
});
