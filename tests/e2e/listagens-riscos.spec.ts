import { expect, test, type Page } from "@playwright/test";

/**
 * Revisor, história 05: riscos das listagens que o listagens.spec.ts não cobre.
 * - slugs e queries hostis respondem 404 real (Proxy) com a página do site, nunca 500;
 * - a tag com mais itens (Taça das Serras, 4 fictícias com selo) não rola na horizontal
 *   em 320px no escuro;
 * - `?pagina=1` explícito continua marcando a editoria no cabeçalho;
 * - teclado: os títulos das linhas são alcançáveis por Tab e levam à matéria.
 */

const larguraDoDocumento = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth);

test.describe("404 real com slug ou query hostil", () => {
  for (const caminho of [
    "/tags/..%2F..%2Fpackage",
    "/editorias/..%2Fmaterias",
    "/tags/%3Cscript%3Ealert(1)%3C%2Fscript%3E",
    "/editorias/CRONICA",
    "/editorias/cronica%20",
    "/tags/taca-das-serras%00",
    "/editorias/cronica?pagina=99999999999999999999",
    "/editorias/cronica?pagina=1&pagina=1",
    "/editorias/cronica?pagina=%2B1",
    "/editorias/cronica?pagina=1e0",
    "/tags/taca-das-serras?pagina=-1",
  ]) {
    test(`${caminho} responde 404`, async ({ page }) => {
      const resposta = await page.goto(caminho);
      expect(resposta?.status()).toBe(404);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        "Página não encontrada",
      );
    });
  }

  test("codificação inválida no slug não derruba o servidor", async ({
    request,
  }) => {
    for (const caminho of ["/editorias/%E0%A4%A", "/tags/%E0%A4%A"]) {
      const resposta = await request.get(caminho);
      expect(resposta.status(), caminho).toBeGreaterThanOrEqual(400);
      expect(resposta.status(), caminho).toBeLessThan(500);
    }
  });

  test("nenhum trecho da query volta refletido no HTML do 404", async ({
    request,
  }) => {
    const resposta = await request.get(
      "/editorias/cronica?pagina=%3Cimg%20src%3Dx%20onerror%3Dalert(1)%3E",
    );
    expect(resposta.status()).toBe(404);
    expect(await resposta.text()).not.toContain("<img src=x");
  });
});

test.describe("tag com selo em 320px no escuro", () => {
  test.use({ viewport: { width: 320, height: 720 }, colorScheme: "dark" });

  test("/tags/taca-das-serras não rola na horizontal", async ({ page }) => {
    await page.goto("/tags/taca-das-serras");
    await expect(page.locator("main ol > li")).toHaveCount(4);
    expect(await larguraDoDocumento(page)).toBeLessThanOrEqual(320);
  });
});

test("?pagina=1 explícito marca a editoria no cabeçalho", async ({ page }) => {
  await page.goto("/editorias/cronica?pagina=1");
  const nav = page.getByRole("navigation", { name: "Editorias", exact: true });
  await expect(nav.locator('[aria-current="page"]')).toHaveText("Crônica");
});

test("teclado: Tab alcança o título de uma linha e Enter abre a matéria", async ({
  page,
}) => {
  await page.goto("/editorias/cronica");
  const titulo = page.locator("main ol > li h2 a").first();
  const href = await titulo.getAttribute("href");
  expect(href).toMatch(/^\/materias\//);

  let alcancou = false;
  for (let i = 0; i < 40 && !alcancou; i += 1) {
    await page.keyboard.press("Tab");
    alcancou = await titulo.evaluate((el) => el === document.activeElement);
  }
  expect(alcancou).toBe(true);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(`${href}$`));
});
