import { expect, test, type Page } from "@playwright/test";
import { EDITORIAS, hrefDaEditoria } from "../../src/lib/editorias";
import { corDoToken, definirTema } from "./helpers";

/**
 * QA, história 01 (Foco de revisão, item 4: tela de 320px).
 * - Tab por todos os links em 320px, com tema do sistema e com data-theme forçado.
 * - Fonte raiz a 200% (aproximação do zoom de texto) em 320px: nada some, nada vaza.
 */

const VIEWPORT = { width: 320, height: 720 };

const larguraDoDocumento = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth);

const fundoDoBody = (page: Page) =>
  page.evaluate(() => getComputedStyle(document.body).backgroundColor);

const CENARIOS = [
  { nome: "sistema claro", esquema: "light", forcar: null },
  { nome: "sistema escuro", esquema: "dark", forcar: null },
  {
    nome: "data-theme=dark com sistema claro",
    esquema: "light",
    forcar: "dark",
  },
  {
    nome: "data-theme=light com sistema escuro",
    esquema: "dark",
    forcar: "light",
  },
] as const;

for (const c of CENARIOS) {
  test.describe(`320px, Tab por todos os links: ${c.nome}`, () => {
    test.use({ viewport: VIEWPORT, colorScheme: c.esquema });

    test("cada link focado fica na tela, com contorno do token e sem rolagem horizontal", async ({
      page,
    }) => {
      await page.goto("/");
      const fundoSistema = await fundoDoBody(page);
      if (c.forcar) {
        await definirTema(page, c.forcar);
        // O atributo mudou mesmo o tema.
        expect(await fundoDoBody(page)).not.toBe(fundoSistema);
      }
      expect(await fundoDoBody(page)).toBe(
        await corDoToken(page, "--color-bg"),
      );

      const foco = await corDoToken(page, "--color-focus");
      const tinta = await corDoToken(page, "--color-ink");
      const focoNoturno = await corDoToken(page, "--color-focus-night");

      const todos = await page.evaluate(
        () =>
          Array.from(
            document.querySelectorAll<HTMLElement>(
              "a[href], button, input, select, textarea, [tabindex]:not([tabindex='-1'])",
            ),
          ).length,
      );
      // cabeçalho (pular, tema, nome, campo e botão de busca, 7 editorias) + rodapé + na capa:
      // destaque (2), Últimas (2 por matéria, 7 matérias), Editorias (7) e a faixa de
      // Crônica (Ver todas + 2 títulos).
      expect(todos).toBeGreaterThanOrEqual(12 + 7 + 2 + 14 + 7 + 3);

      const visitados: string[] = [];
      for (let i = 0; i < todos; i++) {
        await page.keyboard.press("Tab");
        const info = await page.evaluate(() => {
          const el = document.activeElement as HTMLElement;
          const r = el.getBoundingClientRect();
          const s = getComputedStyle(el);
          return {
            href: el.getAttribute("href") ?? el.tagName,
            // Faixas noturnas: rodapé e destaque da capa usam o foco âmbar.
            noturno: !!el.closest("footer, [data-secao='destaque']"),
            esquerda: r.left,
            direita: r.right,
            topo: r.top,
            base: r.bottom,
            altura: r.height,
            estilo: s.outlineStyle,
            largura: s.outlineWidth,
            cor: s.outlineColor,
          };
        });
        visitados.push(info.href);
        const rotulo = `Tab ${i + 1} (${info.href})`;
        expect(info.altura, rotulo).toBeGreaterThan(0);
        expect(info.esquerda, rotulo).toBeGreaterThanOrEqual(0);
        expect(info.direita, rotulo).toBeLessThanOrEqual(VIEWPORT.width);
        // O navegador rola até o foco: ele precisa estar dentro da viewport.
        expect(info.topo, rotulo).toBeGreaterThanOrEqual(0);
        expect(info.base, rotulo).toBeLessThanOrEqual(VIEWPORT.height);
        const esperado = i === 0 ? tinta : info.noturno ? focoNoturno : foco;
        expect(
          { estilo: info.estilo, largura: info.largura, cor: info.cor },
          rotulo,
        ).toEqual({ estilo: "solid", largura: "3px", cor: esperado });
        expect(await larguraDoDocumento(page), rotulo).toBeLessThanOrEqual(
          VIEWPORT.width,
        );
      }

      expect(visitados.slice(0, 12)).toEqual([
        "#conteudo",
        "BUTTON",
        "/",
        "INPUT",
        "BUTTON",
        ...EDITORIAS.map((e) => hrefDaEditoria(e.slug)),
      ]);
    });
  });
}

for (const esquema of ["light", "dark"] as const) {
  test.describe(`320px com fonte raiz a 200% (${esquema})`, () => {
    test.use({ viewport: VIEWPORT, colorScheme: esquema });

    test.beforeEach(async ({ page }) => {
      await page.goto("/");
      await page.addStyleTag({
        content: "html { font-size: 200% !important; }",
      });
      expect(
        await page.evaluate(() =>
          parseFloat(getComputedStyle(document.documentElement).fontSize),
        ),
      ).toBe(32);
    });

    test("sem rolagem horizontal da página", async ({ page }) => {
      expect(await larguraDoDocumento(page)).toBeLessThanOrEqual(
        VIEWPORT.width,
      );
    });

    test("nome do portal, editorias, títulos das seções, linha fina do destaque, todos os links da capa e rodapé continuam visíveis e dentro da largura", async ({
      page,
    }) => {
      const main = page.getByRole("main");
      const alvos = [
        page.getByRole("link", { name: "Zona Mista, página inicial" }),
        ...EDITORIAS.map((e) =>
          page
            .getByRole("navigation", { name: "Editorias", exact: true })
            .getByRole("link", { name: e.rotulo, exact: true }),
        ),
        ...(await main.getByRole("heading", { level: 2 }).all()),
        main.locator("[data-secao='destaque'] p:not(.label)"),
        ...(await main.getByRole("link").all()),
        page.getByRole("contentinfo"),
      ];
      // O h1 da capa é visualmente oculto (sr-only), mas existe.
      await expect(main.getByRole("heading", { level: 1 })).toHaveCount(1);
      expect(alvos.length).toBeGreaterThan(1 + 7 + 4 + 1 + 26);
      for (const alvo of alvos) {
        await alvo.scrollIntoViewIfNeeded();
        await expect(alvo).toBeVisible();
        const caixa = (await alvo.boundingBox())!;
        const nome = (await alvo.textContent())?.trim().slice(0, 40);
        expect(caixa.width, nome).toBeGreaterThan(0);
        expect(caixa.x, nome).toBeGreaterThanOrEqual(0);
        expect(caixa.x + caixa.width, nome).toBeLessThanOrEqual(VIEWPORT.width);
      }
    });

    test("nenhum texto fica cortado por overflow horizontal escondido", async ({
      page,
    }) => {
      const cortados = await page.evaluate(() =>
        Array.from(document.querySelectorAll<HTMLElement>("body *"))
          .filter((el) => {
            const s = getComputedStyle(el);
            if (s.display === "none" || el.closest(".sr-only")) return false;
            const r = el.getBoundingClientRect();
            if (r.width === 0 || r.height === 0) return false;
            return r.right > window.innerWidth + 0.5 || r.left < -0.5;
          })
          .filter((el) => !el.matches("a[href='#conteudo']")) // fora da tela até receber foco
          .map(
            (el) =>
              `${el.tagName}.${el.className}: ${el.textContent?.trim().slice(0, 30)}`,
          ),
      );
      expect(cortados).toEqual([]);
    });
  });
}

/**
 * Zoom do navegador a 200% numa janela de 640px dá uma viewport de 320 CSS px: é o mesmo
 * layout dos testes de 320px acima (e de responsivo.spec.ts). Aqui fica o outro sentido de
 * "200%": só o texto ampliado (WCAG 1.4.4), em larguras de tablet e desktop.
 */
for (const largura of [640, 1280]) {
  for (const esquema of ["light", "dark"] as const) {
    test.describe(`${largura}px com fonte raiz a 200% (${esquema})`, () => {
      test.use({
        viewport: { width: largura, height: 800 },
        colorScheme: esquema,
      });

      test("sem rolagem horizontal e com os títulos das seções e as editorias dentro da largura", async ({
        page,
      }) => {
        await page.goto("/");
        await page.addStyleTag({
          content: "html { font-size: 200% !important; }",
        });
        expect(await larguraDoDocumento(page)).toBeLessThanOrEqual(largura);
        const alvos = [
          ...(await page
            .getByRole("main")
            .getByRole("heading", { level: 2 })
            .all()),
          ...EDITORIAS.map((e) =>
            page
              .getByRole("navigation", { name: "Editorias", exact: true })
              .getByRole("link", { name: e.rotulo, exact: true }),
          ),
        ];
        for (const alvo of alvos) {
          await expect(alvo).toBeVisible();
          const caixa = (await alvo.boundingBox())!;
          expect(caixa.x).toBeGreaterThanOrEqual(0);
          expect(caixa.x + caixa.width).toBeLessThanOrEqual(largura);
        }
      });
    });
  }
}
