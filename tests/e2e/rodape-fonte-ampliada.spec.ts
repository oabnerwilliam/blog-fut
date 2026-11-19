import { expect, test, type Page } from "@playwright/test";

/**
 * QA, história 01: reteste do QA-01 (rodapé estourava a largura com fonte ampliada).
 * - Em 320, 360, 375 e 400px, com fonte raiz padrão, a 175% e a 200%, nos temas claro e
 *   escuro: sem rolagem horizontal, nada além da borda direita, e a marca "ZonaMista"
 *   inteira dentro da coluna (a tinta do texto, não só a caixa do <p>).
 * - Na fonte padrão, de 320 a 1920px, a marca usa exatamente o token --text-footer-mark:
 *   o teto de 27cqi não pode alterar o visual aprovado.
 */

const LARGURAS = [320, 360, 375, 400] as const;
const FONTES = [
  { nome: "padrão", css: null, px: 16 },
  { nome: "175%", css: "175%", px: 28 },
  { nome: "200%", css: "200%", px: 32 },
] as const;

async function aplicarFonte(page: Page, css: string | null, px: number) {
  if (css) {
    await page.addStyleTag({
      content: `html { font-size: ${css} !important; }`,
    });
  }
  expect(
    await page.evaluate(() =>
      parseFloat(getComputedStyle(document.documentElement).fontSize),
    ),
  ).toBe(px);
}

/** Caixa da tinta do texto da marca (Range), que pode vazar do <p> mesmo com o <p> contido. */
const caixasDaMarca = (page: Page) =>
  page.evaluate(() => {
    const p = document.querySelector<HTMLElement>("footer p[aria-hidden='true']")!;
    const range = document.createRange();
    range.selectNodeContents(p);
    const texto = range.getBoundingClientRect();
    const caixa = p.getBoundingClientRect();
    const coluna = p.parentElement!.getBoundingClientRect();
    return {
      texto: { left: texto.left, right: texto.right },
      caixa: { left: caixa.left, right: caixa.right },
      coluna: { left: coluna.left, right: coluna.right },
      scroll: p.scrollWidth,
      client: p.clientWidth,
      fonte: parseFloat(getComputedStyle(p).fontSize),
      innerWidth: window.innerWidth,
    };
  });

for (const largura of LARGURAS) {
  for (const fonte of FONTES) {
    for (const esquema of ["light", "dark"] as const) {
      test.describe(`${largura}px, fonte ${fonte.nome} (${esquema})`, () => {
        test.use({
          viewport: { width: largura, height: 720 },
          colorScheme: esquema,
        });

        test.beforeEach(async ({ page }) => {
          await page.goto("/");
          await aplicarFonte(page, fonte.css, fonte.px);
        });

        test("sem rolagem horizontal e nada além da borda direita", async ({
          page,
        }) => {
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth),
          ).toBeLessThanOrEqual(largura);
          const fora = await page.evaluate(() =>
            Array.from(document.querySelectorAll<HTMLElement>("body *"))
              .filter((el) => {
                if (getComputedStyle(el).display === "none") return false;
                if (el.closest(".sr-only")) return false;
                const r = el.getBoundingClientRect();
                if (r.width === 0 || r.height === 0) return false;
                return r.right > window.innerWidth + 0.5 || r.left < -0.5;
              })
              .filter((el) => !el.matches("a[href='#conteudo']"))
              .map(
                (el) =>
                  `${el.tagName}.${el.className}: ${el.textContent?.trim().slice(0, 30)}`,
              ),
          );
          expect(fora).toEqual([]);
        });

        test("a marca do rodapé cabe inteira na coluna e na tela", async ({
          page,
        }) => {
          await page.getByRole("contentinfo").scrollIntoViewIfNeeded();
          const m = await caixasDaMarca(page);
          expect(m.fonte).toBeGreaterThan(0);
          expect(m.scroll, "texto da marca transborda o <p>").toBeLessThanOrEqual(
            m.client,
          );
          expect(m.texto.left).toBeGreaterThanOrEqual(m.coluna.left - 0.5);
          expect(m.texto.right).toBeLessThanOrEqual(m.coluna.right + 0.5);
          expect(m.texto.right).toBeLessThanOrEqual(m.innerWidth);
          expect(m.caixa.right).toBeLessThanOrEqual(m.innerWidth);
        });

        test("frase e links do rodapé ficam dentro da largura", async ({
          page,
        }) => {
          const rodape = page.getByRole("contentinfo");
          const alvos = [
            rodape.locator("p").nth(1),
            ...(await rodape.getByRole("link").all()),
          ];
          expect(alvos.length).toBeGreaterThan(1);
          for (const alvo of alvos) {
            await alvo.scrollIntoViewIfNeeded();
            await expect(alvo).toBeVisible();
            const caixa = (await alvo.boundingBox())!;
            const nome = (await alvo.textContent())?.trim().slice(0, 40);
            expect(caixa.x, nome).toBeGreaterThanOrEqual(0);
            expect(caixa.x + caixa.width, nome).toBeLessThanOrEqual(largura);
          }
        });
      });
    }
  }
}

test.describe("fonte padrão: a marca do rodapé segue o token aprovado", () => {
  for (const largura of [320, 375, 480, 768, 896, 1024, 1280, 1440, 1920]) {
    test(`${largura}px: tamanho da marca = --text-footer-mark`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: largura, height: 800 });
      await page.goto("/");
      const { marca, token } = await page.evaluate(() => {
        const p = document.querySelector<HTMLElement>(
          "footer p[aria-hidden='true']",
        )!;
        const sonda = document.createElement("div");
        sonda.style.fontSize = "var(--text-footer-mark)";
        document.body.appendChild(sonda);
        const token = parseFloat(getComputedStyle(sonda).fontSize);
        sonda.remove();
        return { marca: parseFloat(getComputedStyle(p).fontSize), token };
      });
      expect(token).toBeGreaterThanOrEqual(56);
      expect(marca).toBeCloseTo(token, 1);
    });
  }
});
