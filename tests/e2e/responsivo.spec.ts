import { expect, test } from "@playwright/test";

for (const esquema of ["light", "dark"] as const) {
  test.describe(`320px (${esquema})`, () => {
    test.use({ viewport: { width: 320, height: 720 }, colorScheme: esquema });

    test("sem rolagem horizontal", async ({ page }) => {
      await page.goto("/");
      const largura = await page.evaluate(
        () => document.documentElement.scrollWidth,
      );
      expect(largura).toBeLessThanOrEqual(320);
    });

    test("margem lateral >= 16px", async ({ page }) => {
      await page.goto("/");
      const main = page.getByRole("main");
      for (const alvo of [
        main.getByRole("heading", { level: 1 }),
        main.locator("p").nth(1),
      ]) {
        const caixa = await alvo.boundingBox();
        expect(caixa).not.toBeNull();
        expect(caixa!.x).toBeGreaterThanOrEqual(16);
        expect(caixa!.x + caixa!.width).toBeLessThanOrEqual(304);
      }
    });

    test("os 7 links de editoria estão visíveis e dentro da viewport", async ({
      page,
    }) => {
      await page.goto("/");
      const links = page
        .getByRole("navigation", { name: "Editorias", exact: true })
        .getByRole("link");
      await expect(links).toHaveCount(7);
      for (let i = 0; i < 7; i++) {
        const link = links.nth(i);
        await expect(link).toBeVisible();
        const caixa = await link.boundingBox();
        expect(caixa!.x).toBeGreaterThanOrEqual(0);
        expect(caixa!.x + caixa!.width).toBeLessThanOrEqual(320);
        expect(caixa!.height).toBeGreaterThanOrEqual(40);
      }
    });
  });
}
