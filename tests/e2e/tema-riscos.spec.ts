import { expect, test, type Page } from "@playwright/test";
import { esperarHidratacao } from "./helpers";

/**
 * Riscos da história 07 que o tema.spec.ts não cobre (revisor):
 * - em 320px o "Pular" sobrepõe o começo do botão de tema quando está focado
 *   (foco-pular.spec.ts); aqui se prova que, com o foco no botão, nada o cobre e o contorno
 *   cabe na tela;
 * - valor inválido no storage, ponta a ponta (script inline + hidratação).
 */

const botaoDeTema = (page: Page) => page.locator("[data-botao-de-tema]");

for (const largura of [320, 1280]) {
  for (const esquema of ["light", "dark"] as const) {
    test(`${largura}px ${esquema}: com o foco no botão de tema, nada o cobre e o contorno cabe na tela`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: esquema });
      await page.setViewportSize({ width: largura, height: 800 });
      await page.goto("/");
      await esperarHidratacao(page);
      await page.keyboard.press("Tab"); // pular
      await page.keyboard.press("Tab"); // tema
      await expect(botaoDeTema(page)).toBeFocused();

      const r = await botaoDeTema(page).evaluate((botao) => {
        const c = botao.getBoundingClientRect();
        const contorno = parseFloat(getComputedStyle(botao).outlineWidth) || 0;
        // Pontos de amostra: centro e perto dos quatro cantos (2px para dentro).
        const pontos: [number, number][] = [
          [c.left + c.width / 2, c.top + c.height / 2],
          [c.left + 2, c.top + 2],
          [c.right - 2, c.top + 2],
          [c.left + 2, c.bottom - 2],
          [c.right - 2, c.bottom - 2],
        ];
        const cobertos = pontos
          .map(([x, y]) => {
            const el = document.elementFromPoint(x, y);
            return el && botao.contains(el) ? null : (el?.outerHTML ?? "nada");
          })
          .filter((x) => x !== null);
        return {
          cobertos,
          esquerda: c.left - contorno,
          direita: c.right + contorno,
          topo: c.top - contorno,
          larguraDaTela: document.documentElement.clientWidth,
        };
      });
      expect(r.cobertos).toEqual([]);
      expect(r.esquerda).toBeGreaterThanOrEqual(0);
      expect(r.topo).toBeGreaterThanOrEqual(0);
      expect(r.direita).toBeLessThanOrEqual(r.larguraDaTela);
    });
  }
}

test.describe("valor inválido guardado", () => {
  test.use({ colorScheme: "dark" });

  test('localStorage.tema = "azul" segue o sistema e o botão diz sistema', async ({
    page,
  }) => {
    const erros: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error" || m.type() === "warning") erros.push(m.text());
    });
    page.on("pageerror", (e) => erros.push(e.message));
    await page.addInitScript(() => {
      try {
        localStorage.setItem("tema", "azul");
      } catch {
        // about:blank
      }
    });
    await page.goto("/");
    await esperarHidratacao(page);
    await expect(page.locator("html")).not.toHaveAttribute("data-theme");
    await expect(botaoDeTema(page)).toHaveAttribute(
      "aria-label",
      "Tema: sistema. Mudar para claro",
    );
    await botaoDeTema(page).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    expect(await page.evaluate(() => localStorage.getItem("tema"))).toBe(
      "light",
    );
    expect(erros).toEqual([]);
  });
});
