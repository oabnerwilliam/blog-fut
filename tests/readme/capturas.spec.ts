import { expect, test, type Page } from "@playwright/test";

import { definirTema } from "../e2e/helpers";

/**
 * Gera as imagens do README em `docs/readme/` (tarefa T03).
 * Rode com `pnpm readme:imagens`. Não é um teste de regressão: só tira as fotos.
 */
const DESTINO = "docs/readme";

/** Matéria real (a do PSG): é a que melhor mostra a página no celular. */
const MATERIA = "/materias/psg-balanco-temporada-2026-27-mercado-elenco-curto";

async function preparar(
  page: Page,
  url: string,
  tema: "light" | "dark",
): Promise<void> {
  await page.emulateMedia({ colorScheme: tema, reducedMotion: "reduce" });
  await page.goto(url);
  // Se a fixture mudar de slug, a captura falha aqui em vez de fotografar um 404.
  await expect(page.locator("h1")).toBeVisible();
  await expect(page).not.toHaveTitle(/não encontrad/i);
  await definirTema(page, tema);
  await page.evaluate(() => document.fonts.ready);
}

for (const tema of ["light", "dark"] as const) {
  test(`capa no tema ${tema === "light" ? "claro" : "escuro"}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 860 });
    await preparar(page, "/", tema);
    await page.screenshot({
      path: `${DESTINO}/capa-${tema === "light" ? "claro" : "escuro"}.png`,
      // Página inteira recortada: o destaque e o começo das Últimas.
      fullPage: true,
      clip: { x: 0, y: 0, width: 1280, height: 1500 },
      animations: "disabled",
      caret: "hide",
    });
  });
}

test.describe("matéria no celular", () => {
  test.use({
    viewport: { width: 375, height: 812 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  test("matéria no celular", async ({ page }) => {
    await preparar(page, MATERIA, "light");
    await page.screenshot({
      path: `${DESTINO}/materia-celular.png`,
      // Página inteira recortada: o topo e os primeiros parágrafos do texto.
      fullPage: true,
      clip: { x: 0, y: 0, width: 375, height: 1150 },
      animations: "disabled",
      caret: "hide",
    });
  });
});
