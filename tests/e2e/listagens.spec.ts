import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * Páginas de editoria e de tag (história 05), com o conteúdo real de content/ (oito
 * fictícias e, desde a história 08, a matéria real do PSG): Crônica tem 2 matérias, a tag
 * Taça das Serras tem 4 e a Liga do Planalto Azul (sem rótulo no tags.json) tem 2.
 */

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

const itens = (page: Page) => page.locator("main ol > li");

for (const largura of [320, 1280]) {
  test.describe(`listagens em ${largura}px`, () => {
    test.use({ viewport: { width: largura, height: 800 } });

    test("/editorias/cronica: um h1, chapéu, contagem e 2 itens do mais novo ao mais antigo", async ({
      page,
    }) => {
      const resposta = await page.goto("/editorias/cronica");
      expect(resposta?.status()).toBe(200);
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        "Crônica",
      );
      const cabecalho = page.locator("main header");
      await expect(
        cabecalho.getByText("Editoria", { exact: true }),
      ).toBeVisible();
      await expect(
        cabecalho.getByText("2 matérias", { exact: true }),
      ).toBeVisible();

      await expect(itens(page)).toHaveCount(2);
      const datas = await itens(page)
        .locator("time")
        .evaluateAll((els) => els.map((el) => el.getAttribute("datetime")!));
      expect(datas).toEqual(["2026-10-25", "2026-10-18"]);
      expect([...datas].sort().reverse()).toEqual(datas);

      // Título h2 com link, editoria, selo, minutos e linha fina em cada linha.
      for (let i = 0; i < 2; i++) {
        const item = itens(page).nth(i);
        const titulo = item.getByRole("heading", { level: 2 });
        await expect(titulo.getByRole("link")).toHaveAttribute(
          "href",
          /^\/materias\/[a-z0-9-]+$/,
        );
        await expect(item.getByText("Exemplo", { exact: true })).toBeVisible();
        await expect(
          item.getByRole("link", { name: "Crônica", exact: true }),
        ).toHaveAttribute("href", "/editorias/cronica");
        await expect(item).toContainText(/\d+ min/);
        await expect(item.locator("p:not(.label)")).not.toBeEmpty();
      }
      // Uma página só: sem paginação.
      await expect(
        page.getByRole("navigation", { name: "Paginação" }),
      ).toHaveCount(0);
    });

    test("/editorias/cronica: nada de rolagem horizontal", async ({ page }) => {
      await page.goto("/editorias/cronica");
      expect(await larguraDoDocumento(page)).toBeLessThanOrEqual(largura);
    });

    test("/tags/taca-das-serras: 4 itens e o rótulo do tags.json", async ({
      page,
    }) => {
      const resposta = await page.goto("/tags/taca-das-serras");
      expect(resposta?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        "Taça das Serras",
      );
      await expect(
        page.locator("main header").getByText("Tag", { exact: true }),
      ).toBeVisible();
      await expect(page.locator("main header")).toContainText("4 matérias");
      await expect(itens(page)).toHaveCount(4);
      await expect(page).toHaveTitle("Tag: Taça das Serras");
      expect(await larguraDoDocumento(page)).toBeLessThanOrEqual(largura);
    });

    test("/tags/liga-do-planalto-azul: rótulo humanizado", async ({ page }) => {
      await page.goto("/tags/liga-do-planalto-azul");
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        "Liga do Planalto Azul",
      );
      await expect(itens(page)).toHaveCount(2);
    });
  });
}

for (const esquema of ["light", "dark"] as const) {
  test.describe(`axe em /editorias/cronica no ${esquema === "light" ? "claro" : "escuro"}`, () => {
    test.use({ colorScheme: esquema });

    for (const largura of [320, 1280]) {
      test(`sem violações em ${largura}px`, async ({ page }) => {
        await page.setViewportSize({ width: largura, height: 800 });
        await page.goto("/editorias/cronica");
        expect(await violacoes(page)).toEqual([]);
      });
    }
  });
}

test.describe("metadados da listagem", () => {
  test("título, canonical sem query e noindex (só fictícias)", async ({
    page,
  }) => {
    for (const url of ["/editorias/cronica", "/editorias/cronica?pagina=1"]) {
      await page.goto(url);
      await expect(page).toHaveTitle("Crônica");
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        "href",
        /\/editorias\/cronica$/,
      );
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
        "content",
        /noindex/,
      );
    }
  });

  test("?pagina=1 responde 200 com o mesmo conteúdo da página sem query", async ({
    page,
  }) => {
    await page.goto("/editorias/cronica");
    const semQuery = await page.locator("main").innerText();
    const resposta = await page.goto("/editorias/cronica?pagina=1");
    expect(resposta?.status()).toBe(200);
    expect(await page.locator("main").innerText()).toBe(semQuery);
  });
});

test.describe("404 real nas listagens", () => {
  for (const caminho of [
    "/editorias/inexistente",
    "/tags/nao-existe",
    "/tags/%C3%87%C3%87",
    "/editorias/cronica?pagina=0",
    "/editorias/cronica?pagina=abc",
    "/editorias/cronica?pagina=99",
    "/tags/taca-das-serras?pagina=2",
  ]) {
    test(`${caminho} responde 404 com a página do site`, async ({ page }) => {
      const resposta = await page.goto(caminho);
      expect(resposta?.status()).toBe(404);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        "Página não encontrada",
      );
    });
  }

  test("a 404 de uma listagem tem o <title> próprio", async ({ page }) => {
    await page.goto("/editorias/inexistente");
    await expect(page).toHaveTitle("Página não encontrada");
  });

  test("a 404 de uma listagem não marca editoria no cabeçalho", async ({
    page,
  }) => {
    await page.goto("/editorias/cronica?pagina=99");
    const nav = page.getByRole("navigation", {
      name: "Editorias",
      exact: true,
    });
    await expect(nav.locator('[aria-current="page"]')).toHaveCount(0);
  });
});

test.describe("links que levam às listagens", () => {
  test("tags da matéria e editorias da capa e da matéria respondem 200", async ({
    page,
    request,
  }) => {
    const hrefs = new Set<string>();
    await page.goto("/");
    for (const href of await page
      .locator('main a[href^="/editorias/"]')
      .evaluateAll((els) => els.map((el) => el.getAttribute("href")!))) {
      hrefs.add(href);
    }
    await page.goto("/materias/como-o-atletico-ventania-defende-com-a-bola");
    for (const href of await page
      .locator('main a[href^="/editorias/"], main a[href^="/tags/"]')
      .evaluateAll((els) => els.map((el) => el.getAttribute("href")!))) {
      hrefs.add(href);
    }
    expect([...hrefs]).toEqual(
      expect.arrayContaining([
        "/editorias/analise",
        "/editorias/cronica",
        "/tags/atletico-ventania",
        "/tags/taca-das-serras",
        "/tags/uniao-porto-ametista",
      ]),
    );
    for (const href of hrefs) {
      expect((await request.get(href)).status(), href).toBe(200);
    }
  });
});

test.describe("nav de editorias do cabeçalho", () => {
  const nav = (page: Page) =>
    page.getByRole("navigation", { name: "Editorias", exact: true });

  test("marca a editoria aberta com aria-current", async ({ page }) => {
    await page.goto("/editorias/cronica");
    const atual = nav(page).locator('[aria-current="page"]');
    await expect(atual).toHaveCount(1);
    await expect(atual).toHaveText("Crônica");
    await expect(atual).toHaveAttribute("href", "/editorias/cronica");
    // O rodapé não marca.
    await expect(
      page
        .getByRole("navigation", { name: "Editorias no rodapé" })
        .locator("[aria-current]"),
    ).toHaveCount(0);
  });

  test("na capa, na matéria e numa tag, nenhum link fica marcado", async ({
    page,
  }) => {
    for (const url of [
      "/",
      "/materias/como-o-atletico-ventania-defende-com-a-bola",
      "/tags/taca-das-serras",
    ]) {
      await page.goto(url);
      await expect(nav(page).locator("[aria-current]"), url).toHaveCount(0);
    }
  });

  test("a marca acompanha a navegação no cliente", async ({ page }) => {
    await page.goto("/editorias/cronica");
    await nav(page).getByRole("link", { name: "Análise" }).click();
    await expect(page).toHaveURL("/editorias/analise");
    await expect(nav(page).locator('[aria-current="page"]')).toHaveText(
      "Análise",
    );
  });
});

test.describe("sitemap.xml e robots.txt", () => {
  // Desde a história 08 há uma matéria real (PSG); o conteúdo do sitemap com ela é
  // conferido em materia-real.spec.ts.
  test("o sitemap abre pela capa, com a data da matéria real mais recente", async ({
    request,
  }) => {
    const resposta = await request.get("/sitemap.xml");
    expect(resposta.status()).toBe(200);
    const xml = await resposta.text();
    const urls = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => m[1]);
    expect(urls.length).toBeGreaterThan(1);
    const loc = /<loc>([^<]*)<\/loc>/.exec(urls[0])![1];
    expect(new URL(loc).pathname).toBe("/");
    expect(urls[0]).toMatch(/<lastmod>2026-11-19/);
  });

  test("o robots.txt permite tudo e aponta para o sitemap", async ({
    request,
  }) => {
    const resposta = await request.get("/robots.txt");
    expect(resposta.status()).toBe(200);
    const texto = await resposta.text();
    expect(texto).toMatch(/User-Agent: \*/i);
    expect(texto).toMatch(/^Allow: \/$/m);
    expect(texto).not.toMatch(/Disallow/);
    expect(texto).toMatch(/^Sitemap: https?:\/\/[^\s]+\/sitemap\.xml$/m);
  });
});
