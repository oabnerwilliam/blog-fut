import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * Busca (história 06), com o conteúdo real de content/ (hoje, oito fictícias). Três delas
 * citam São Ciríaco; nenhuma cita São Paulo.
 */

const SAO_CIRIACO = [
  "EC São Ciríaco anuncia reforma do estádio e vai mandar jogos longe de casa",
  "A última tarde do Mirante Velho",
  "O silêncio de São Ciríaco depois do rebaixamento que não aconteceu",
];

const SUGESTAO =
  "Procure pelo nome de um clube, de um jogador ou de uma competição.";

async function violacoes(page: Page) {
  const resultado = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  return resultado.violations.map((v) => ({
    id: v.id,
    alvos: v.nodes.map((n) => n.target.join(" ")),
  }));
}

const larguraDoDocumento = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth);

const titulos = (page: Page) =>
  page.locator("main ol > li").getByRole("heading", { level: 2 });

const campoDoCabecalho = (page: Page) =>
  page
    .getByRole("search", { name: "Buscar no portal" })
    .getByRole("searchbox", { name: "Buscar matérias" });

const formularioDaPagina = (page: Page) =>
  page.getByRole("search", { name: "Buscar matérias no acervo" });

const buscar = (page: Page, termo: string) =>
  page.goto(`/busca?q=${encodeURIComponent(termo)}`);

for (const largura of [320, 1280]) {
  test.describe(`busca em ${largura}px`, () => {
    test.use({ viewport: { width: largura, height: 800 } });

    test("Enter no campo do cabeçalho leva a /busca?q= com os resultados", async ({
      page,
    }) => {
      await page.goto("/");
      const campo = campoDoCabecalho(page);
      await expect(campo).toBeVisible();
      await expect(campo).toHaveValue("");
      await campo.fill("são ciríaco");
      await campo.press("Enter");
      await expect(page).toHaveURL(/\/busca\?q=s%C3%A3o\+cir%C3%ADaco$/);
      await expect(titulos(page)).toHaveText(SAO_CIRIACO);
      await expect(page.locator("main")).toContainText(
        "3 resultados para “são ciríaco”",
      );
      // O campo da página vem preenchido; o do cabeçalho, sempre vazio.
      await expect(
        formularioDaPagina(page).getByRole("searchbox", {
          name: "O que você procura?",
        }),
      ).toHaveValue("são ciríaco");
      await expect(campoDoCabecalho(page)).toHaveValue("");
    });

    test("acento e maiúsculas não mudam o resultado", async ({ page }) => {
      for (const termo of ["sao ciriaco", "SÃO CIRÍACO", "São Ciríaco"]) {
        await buscar(page, termo);
        await expect(titulos(page), termo).toHaveText(SAO_CIRIACO);
      }
      const semResultado: string[] = [];
      for (const termo of ["sao paulo", "SÃO PAULO", "São Paulo"]) {
        await buscar(page, termo);
        await expect(page.locator("main")).toContainText(
          `Nenhuma matéria encontrada para “${termo}”.`,
        );
        semResultado.push(...(await titulos(page).allInnerTexts()));
      }
      expect(semResultado).toEqual([]);
    });

    test("com resultado: um h1, contagem no singular, selo Exemplo e sem rolagem", async ({
      page,
    }) => {
      const resposta = await buscar(page, "Mirante Velho");
      expect(resposta?.status()).toBe(200);
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("Busca");
      await expect(page).toHaveTitle("Busca: Mirante Velho");
      await expect(page.locator("main")).toContainText(
        "1 resultado para “Mirante Velho”",
      );
      const item = page.locator("main ol > li");
      await expect(item).toHaveCount(1);
      await expect(item.getByText("Exemplo", { exact: true })).toBeVisible();
      expect(await larguraDoDocumento(page)).toBeLessThanOrEqual(largura);
    });

    for (const url of ["/busca", "/busca?q=%20%20"]) {
      test(`estado vazio em ${url}: sugestão e editorias, sem erro`, async ({
        page,
      }) => {
        const resposta = await page.goto(url);
        expect(resposta?.status()).toBe(200);
        await expect(page.locator("h1")).toHaveCount(1);
        await expect(page).toHaveTitle("Busca");
        const main = page.locator("main");
        await expect(main).toContainText(SUGESTAO);
        await expect(main).not.toContainText("Nenhuma matéria");
        await expect(main).not.toContainText("resultado");
        await expect(main.locator("ol")).toHaveCount(0);
        await expect(
          main.getByRole("heading", { level: 2, name: "Editorias" }),
        ).toBeVisible();
        await expect(
          main.getByRole("link", { name: /^Crônica 2 matérias$/ }),
        ).toHaveAttribute("href", "/editorias/cronica");
        await expect(
          formularioDaPagina(page).getByRole("searchbox"),
        ).toHaveValue("");
        expect(await larguraDoDocumento(page)).toBeLessThanOrEqual(largura);
      });
    }

    test("sem resultado: mensagem própria e a mesma sugestão", async ({
      page,
    }) => {
      const resposta = await page.goto("/busca?q=zzzzqqq");
      expect(resposta?.status()).toBe(200);
      const main = page.locator("main");
      await expect(main).toContainText(
        "Nenhuma matéria encontrada para “zzzzqqq”.",
      );
      await expect(main).toContainText(SUGESTAO);
      await expect(main.locator("ol")).toHaveCount(0);
      await expect(page.locator("h1")).toHaveCount(1);
      expect(await larguraDoDocumento(page)).toBeLessThanOrEqual(largura);
    });

    test("o termo aparece como texto, nunca como HTML", async ({ page }) => {
      let dialogos = 0;
      page.on("dialog", async (dialogo) => {
        dialogos += 1;
        await dialogo.dismiss();
      });
      const termo = "<script>alert(1)</script>";
      await buscar(page, termo);
      await expect(page.locator("main")).toContainText(
        `Nenhuma matéria encontrada para “${termo}”.`,
      );
      await expect(page.locator("main script")).toHaveCount(0);
      expect(dialogos).toBe(0);
    });

    test("termo longo é cortado em 100 caracteres e não vaza a tela", async ({
      page,
    }) => {
      await buscar(page, "x".repeat(150));
      await expect(page.locator("main")).toContainText(
        `Nenhuma matéria encontrada para “${"x".repeat(100)}”.`,
      );
      await expect(page.locator("main")).not.toContainText("x".repeat(101));
      expect(await larguraDoDocumento(page)).toBeLessThanOrEqual(largura);
    });

    test("o campo do cabeçalho não causa rolagem horizontal na capa", async ({
      page,
    }) => {
      await page.goto("/");
      await expect(campoDoCabecalho(page)).toBeVisible();
      expect(await larguraDoDocumento(page)).toBeLessThanOrEqual(largura);
    });
  });
}

test.describe("metadados da busca", () => {
  test("noindex, follow e canonical sem query", async ({ page }) => {
    await buscar(page, "ventania");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      "noindex, follow",
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      /\/busca$/,
    );
  });
});

for (const esquema of ["light", "dark"] as const) {
  test.describe(`axe na busca no ${esquema === "light" ? "claro" : "escuro"}`, () => {
    test.use({ colorScheme: esquema });

    for (const largura of [320, 1280]) {
      for (const url of [
        "/busca",
        "/busca?q=zzzzqqq",
        "/busca?q=sao+ciriaco",
      ]) {
        test(`${url} sem violações em ${largura}px`, async ({ page }) => {
          await page.setViewportSize({ width: largura, height: 800 });
          await page.goto(url);
          await expect(page.locator("h1")).toHaveCount(1);
          // Espera o trecho que chega por streaming antes de analisar.
          await expect(
            page.locator("main").getByText(/resultados? para|Procure pelo/),
          ).toBeVisible();
          expect(await violacoes(page)).toEqual([]);
        });
      }
    }
  });
}
