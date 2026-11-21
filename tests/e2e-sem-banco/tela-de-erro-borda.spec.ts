import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { definirTema } from "../e2e/helpers";

/**
 * Revisão da história 14: a tela nova (`error.tsx`) nas regras de borda da v1, que o
 * `sem-banco.spec.ts` não cobre. Contraste AA (axe) nos dois temas e com o tema forçado,
 * 320px sem rolagem horizontal e o botão "Tentar de novo" alcançável pelo teclado, com
 * foco visível.
 */
const TITULO = "Não foi possível carregar esta página";

for (const esquema of ["light", "dark"] as const) {
  const nome = esquema === "light" ? "claro" : "escuro";
  const forcado = esquema === "light" ? "dark" : "light";

  test.describe(`tela de erro, sistema ${nome}`, () => {
    test.use({ colorScheme: esquema });

    test(`sem violações axe (sistema ${nome} e data-theme=${forcado})`, async ({
      page,
    }) => {
      await page.goto("/");
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(TITULO);
      for (const tema of [null, forcado] as const) {
        if (tema) await definirTema(page, tema);
        const { violations } = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa"])
          .analyze();
        expect(
          violations.map((v) => v.id),
          `tema ${tema ?? esquema}`,
        ).toEqual([]);
      }
    });

    test.describe("320px", () => {
      test.use({ viewport: { width: 320, height: 720 } });

      test("sem rolagem horizontal e o botão chega pelo teclado com foco visível", async ({
        page,
      }) => {
        await page.goto("/");
        await expect(page.getByRole("heading", { level: 1 })).toHaveText(
          TITULO,
        );
        const largura = await page.evaluate(() => ({
          rolagem: document.documentElement.scrollWidth,
          janela: document.documentElement.clientWidth,
        }));
        expect(largura.rolagem).toBeLessThanOrEqual(largura.janela);

        const botao = page.getByRole("button", { name: "Tentar de novo" });
        let alcancou = false;
        for (let i = 0; i < 40 && !alcancou; i++) {
          await page.keyboard.press("Tab");
          alcancou = await botao.evaluate(
            (el) => el === document.activeElement,
          );
        }
        expect(alcancou).toBe(true);
        const contorno = await botao.evaluate((el) => {
          const estilo = getComputedStyle(el);
          return {
            estilo: estilo.outlineStyle,
            largura: parseFloat(estilo.outlineWidth),
            sombra: estilo.boxShadow,
          };
        });
        const temFoco =
          (contorno.estilo !== "none" && contorno.largura > 0) ||
          contorno.sombra !== "none";
        expect(temFoco).toBe(true);
      });
    });
  });
}
