import { expect, test, type Page } from "@playwright/test";

/**
 * Regressão visual (história 11). As referências foram geradas com o estilo ainda em
 * CSS Modules, ANTES da migração para Tailwind. Diferença acima da tolerância se corrige
 * no código, nunca regenerando a referência.
 *
 * Exceção: mudança visual intencional, aprovada numa história. Aí só as referências da
 * página que mudou são regeneradas (`--update-snapshots` filtrado pelo nome do teste).
 * - História 04 (capa): `capa-*.png` regeneradas com a capa nova (destaque, Últimas,
 *   Editorias e faixas). As referências da matéria, do 404 e do foco não mudaram.
 * - História 05 (editorias e tags): só ganhou as referências NOVAS de `/editorias/cronica`
 *   (`editoria-cronica-*.png`, em 375px e 1280px). A capa continua idêntica: as referências
 *   dela não foram regeneradas.
 */

/** Tolerância pequena e explícita (critério 1: no máximo 0,01). */
const TOLERANCIA = { maxDiffPixelRatio: 0.01 } as const;

const OPCOES = {
  fullPage: true,
  animations: "disabled",
  caret: "hide",
  ...TOLERANCIA,
} as const;

const PAGINAS = [
  { nome: "capa", url: "/" },
  {
    nome: "materia-ficticia",
    url: "/materias/como-o-atletico-ventania-defende-com-a-bola",
  },
  { nome: "404", url: "/materias/nao-existe" },
] as const;

const LARGURAS = [320, 1280] as const;
const TEMAS = ["light", "dark"] as const;

async function abrir(page: Page, url: string): Promise<void> {
  await page.goto(url);
  await page.evaluate(() => document.fonts.ready);
}

for (const tema of TEMAS) {
  for (const largura of LARGURAS) {
    test.describe(`visual ${tema} ${largura}px`, () => {
      test.use({
        colorScheme: tema,
        viewport: { width: largura, height: 800 },
      });

      for (const { nome, url } of PAGINAS) {
        test(nome, async ({ page }) => {
          await abrir(page, url);
          await expect(page).toHaveScreenshot(
            `${nome}-${tema}-${largura}.png`,
            OPCOES,
          );
        });
      }
    });
  }
}

/** Páginas da história 05, nas larguras pedidas por ela (375px e 1280px). */
const LISTAGENS = [
  { nome: "editoria-cronica", url: "/editorias/cronica" },
] as const;
const LARGURAS_DAS_LISTAGENS = [375, 1280] as const;

for (const tema of TEMAS) {
  for (const largura of LARGURAS_DAS_LISTAGENS) {
    test.describe(`visual listagem ${tema} ${largura}px`, () => {
      test.use({
        colorScheme: tema,
        viewport: { width: largura, height: 800 },
      });

      for (const { nome, url } of LISTAGENS) {
        test(nome, async ({ page }) => {
          await abrir(page, url);
          await expect(page).toHaveScreenshot(
            `${nome}-${tema}-${largura}.png`,
            OPCOES,
          );
        });
      }
    });
  }
}

test.describe("visual foco", () => {
  test.use({ colorScheme: "light", viewport: { width: 1280, height: 800 } });

  test("contorno de foco num link da nav", async ({ page }) => {
    await abrir(page, "/");
    const nav = page.getByRole("navigation", {
      name: "Editorias",
      exact: true,
    });
    await nav.getByRole("link").nth(2).focus();
    // focus() programático após interação de teclado garante :focus-visible.
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    await expect(nav.getByRole("link").nth(2)).toBeFocused();
    await expect(page).toHaveScreenshot("foco-nav-light-1280.png", {
      animations: "disabled",
      caret: "hide",
      ...TOLERANCIA,
    });
  });
});
