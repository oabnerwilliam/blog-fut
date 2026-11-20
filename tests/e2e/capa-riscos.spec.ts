import { expect, test, type Page } from "@playwright/test";

/**
 * Riscos da capa (história 04) que o capa.spec.ts não cobre:
 * - o link esticado (::after) abre a matéria ao clicar fora do título (feature, linha e faixa);
 * - o nome acessível dos links de Editorias usa a contagem por extenso do <sup aria-label>;
 * - no tema escuro, 320px continua sem rolagem horizontal.
 */

/** Clica num ponto do elemento que não é o título e devolve o href que o clique alcança. */
async function hrefNoPonto(page: Page, seletor: string) {
  const alvo = page.locator(seletor).first();
  await alvo.scrollIntoViewIfNeeded();
  const caixa = (await alvo.boundingBox())!;
  return page.evaluate(
    ({ x, y }) =>
      document.elementFromPoint(x, y)?.closest("a")?.getAttribute("href") ??
      null,
    { x: caixa.x + caixa.width / 2, y: caixa.y + caixa.height / 2 },
  );
}

test.describe("link esticado da capa (1280px)", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("a linha fina da feature, a linha fina de uma linha e o dia da faixa abrem a matéria", async ({
    page,
  }) => {
    await page.goto("/");
    const ultimas = "section[aria-labelledby='ultimas']";

    const feature = await page
      .locator(`${ultimas} article h3 a`)
      .getAttribute("href");
    expect(await hrefNoPonto(page, `${ultimas} article p:not(.label)`)).toBe(
      feature,
    );

    const linha = await page
      .locator(`${ultimas} ol > li h3 a`)
      .first()
      .getAttribute("href");
    expect(await hrefNoPonto(page, `${ultimas} ol > li p:not(.label)`)).toBe(
      linha,
    );

    const faixa = "section[data-faixa='cronica'] article";
    const item = await page
      .locator(`${faixa} h3 a`)
      .first()
      .getAttribute("href");
    expect(await hrefNoPonto(page, `${faixa} time`)).toBe(item);
  });

  test("clicar na linha fina da feature navega para a matéria", async ({
    page,
  }) => {
    await page.goto("/");
    const feature = page.locator("section[aria-labelledby='ultimas'] article");
    const href = (await feature.locator("h3 a").getAttribute("href"))!;
    // O ::after cobre o parágrafo, então o clique é por coordenada (como o do leitor).
    const linhaFina = feature.locator("p:not(.label)").first();
    await linhaFina.scrollIntoViewIfNeeded();
    const caixa = (await linhaFina.boundingBox())!;
    await page.mouse.click(
      caixa.x + caixa.width / 2,
      caixa.y + caixa.height / 2,
    );
    await expect(page).toHaveURL(href);
  });
});

test("os links de Editorias têm a contagem por extenso no nome acessível", async ({
  page,
}) => {
  await page.goto("/");
  const editorias = page.getByRole("region", { name: "Editorias" });
  // Hoje o nome sai colado ("Crônica2 matérias"), como no mockup; o espaço é opcional aqui.
  await expect(
    editorias.getByRole("link", { name: /^Crônica\s?2 matérias$/ }),
  ).toHaveAttribute("href", "/editorias/cronica");
  await expect(
    editorias.getByRole("link", { name: /^Análise\s?1 matéria$/ }),
  ).toHaveAttribute("href", "/editorias/analise");
});

test.describe("capa no escuro em 320px", () => {
  test.use({ viewport: { width: 320, height: 800 }, colorScheme: "dark" });

  test("sem rolagem horizontal", async ({ page }) => {
    await page.goto("/");
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(320);
  });
});
