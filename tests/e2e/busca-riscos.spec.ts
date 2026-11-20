import { expect, test } from "@playwright/test";

/**
 * Riscos da história 06 (busca) que o `busca.spec.ts` não cobre: o termo hostil refletido
 * no `<title>` e no HTML cru, o formulário da própria página, o envio sem JavaScript e a
 * `/busca` fora do sitemap.
 */

const HOSTIL = "<script>alert(1)</script>";
const HOSTIL_ATRIBUTO = `"><img src=x onerror=alert(2)>`;

test("termo hostil: <title> literal e HTML cru sem a tag injetada", async ({
  page,
  request,
}) => {
  let dialogos = 0;
  page.on("dialog", async (d) => {
    dialogos += 1;
    await d.dismiss();
  });
  for (const termo of [HOSTIL, HOSTIL_ATRIBUTO]) {
    const url = `/busca?q=${encodeURIComponent(termo)}`;
    await page.goto(url);
    await expect(page.locator("main")).toContainText(
      `Nenhuma matéria encontrada para “${termo}”.`,
    );
    expect(await page.title()).toContain(`Busca: ${termo}`);
    // O campo da página guarda o termo como valor, não como marcação.
    await expect(
      page
        .getByRole("search", { name: "Buscar matérias no acervo" })
        .getByRole("searchbox"),
    ).toHaveValue(termo);
    await expect(page.locator("img[src='x']")).toHaveCount(0);

    const html = await (await request.get(url)).text();
    expect(html).not.toContain(HOSTIL);
    expect(html).not.toContain("<img src=x");
  }
  expect(dialogos).toBe(0);
});

test("o formulário da página refaz a busca com Enter", async ({ page }) => {
  await page.goto("/busca?q=zzzzqqq");
  const campo = page
    .getByRole("search", { name: "Buscar matérias no acervo" })
    .getByRole("searchbox", { name: "O que você procura?" });
  await expect(campo).toHaveValue("zzzzqqq");
  await campo.fill("Mirante Velho");
  await campo.press("Enter");
  await expect(page).toHaveURL(/\/busca\?q=Mirante\+Velho$/);
  await expect(page.locator("main")).toContainText(
    "1 resultado para “Mirante Velho”",
  );
});

test.describe("sem JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("o campo do cabeçalho envia para /busca?q=", async ({ page }) => {
    await page.goto("/");
    const campo = page
      .getByRole("search", { name: "Buscar no portal" })
      .getByRole("searchbox", { name: "Buscar matérias" });
    await campo.fill("Mirante Velho");
    await campo.press("Enter");
    await expect(page).toHaveURL(/\/busca\?q=Mirante\+Velho$/);
    await expect(page.locator("h1")).toHaveText("Busca");
  });

  // Revisão da história 06: sem JS, o trecho que depende da query chega por streaming num
  // `<div hidden>` que ninguém revela, e o fallback fica para sempre. Por isso o fallback
  // do resultado leva um `<noscript>` com o aviso.
  // O `toContainText` do Playwright pula o conteúdo de `<noscript>` mesmo quando ele é
  // renderizado; o `innerText` segue o que está na tela.
  test("sem JS, o leitor vê o resultado ou um aviso", async ({ page }) => {
    await page.goto("/busca?q=Mirante+Velho");
    expect(await page.locator("main").innerText()).toMatch(
      /1 resultado para “Mirante Velho”|Ative o JavaScript para ver os resultados da busca\./,
    );
    await expect(page.locator("main noscript p")).toBeVisible();
  });

  test("com JS, o aviso de <noscript> não aparece", async ({ browser }) => {
    const contexto = await browser.newContext({ javaScriptEnabled: true });
    const comJs = await contexto.newPage();
    await comJs.goto("/busca?q=Mirante+Velho");
    await expect(comJs.locator("main")).toContainText(
      "1 resultado para “Mirante Velho”",
    );
    expect(await comJs.locator("main").innerText()).not.toContain(
      "Ative o JavaScript",
    );
    await contexto.close();
  });
});

test("/busca fica fora do sitemap", async ({ request }) => {
  const xml = await (await request.get("/sitemap.xml")).text();
  expect(xml).toContain("<urlset");
  expect(xml).not.toContain("/busca");
});
