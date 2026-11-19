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

for (const esquema of ["light", "dark"] as const) {
  test.describe(`sistema ${esquema === "light" ? "claro" : "escuro"}`, () => {
    test.use({ colorScheme: esquema });

    test(`sem violações axe na capa: sistema ${esquema === "light" ? "claro" : "escuro"}`, async ({
      page,
    }) => {
      await page.goto("/");
      expect(await violacoes(page)).toEqual([]);
    });

    const forcado = esquema === "light" ? "dark" : "light";
    test(`sem violações axe na capa: data-theme=${forcado}`, async ({
      page,
    }) => {
      await page.goto("/");
      await definirTema(page, forcado);
      expect(await violacoes(page)).toEqual([]);
    });
  });
}

test("sem violações axe com o link de pular focado", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  expect(await violacoes(page)).toEqual([]);
});
