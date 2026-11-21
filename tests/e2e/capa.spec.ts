import { expect, test, type Page } from "@playwright/test";
import { corDoToken } from "./helpers";

/**
 * Capa da história 04, com o conteúdo real de content/. Desde a história 08 há uma matéria
 * real, a do PSG (2026-11-19), que ocupa o destaque. As oito fictícias vão para Últimas
 * (a mais recente é a análise do Atlético Ventania, 2026-10-28). Análise e Crônica têm 2
 * matérias cada e ganham faixa.
 */
const DESTAQUE = {
  slug: "psg-balanco-temporada-2026-27-mercado-elenco-curto",
  titulo: "O mercado enxuto do PSG deu certo até aqui. Falta aguentar até maio",
};
const FICTICIA_MAIS_RECENTE = {
  slug: "como-o-atletico-ventania-defende-com-a-bola",
  titulo: "Como o Atlético Ventania aprendeu a defender com a bola",
};

const larguraDoDocumento = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth);

for (const largura of [320, 1280]) {
  test.describe(`capa em ${largura}px`, () => {
    test.use({ viewport: { width: largura, height: 800 } });

    test.beforeEach(async ({ page }) => {
      await page.goto("/");
    });

    test("um único h1, visualmente oculto, com o nome do portal", async ({
      page,
    }) => {
      await expect(page.locator("h1")).toHaveCount(1);
      const h1 = page.getByRole("heading", { level: 1 });
      await expect(h1).toHaveText("Zona Mista: futebol depois do apito");
      await expect(h1).toHaveClass(/\bsr-only\b/);
    });

    test("cada seção tem um h2 ligado por aria-labelledby", async ({
      page,
    }) => {
      const secoes = page.locator("main section");
      const total = await secoes.count();
      expect(total).toBe(5); // destaque, Últimas, Editorias, faixas de Análise e Crônica
      for (let i = 0; i < total; i++) {
        const id = await secoes.nth(i).getAttribute("aria-labelledby");
        expect(id).toBeTruthy();
        await expect(page.locator(`h2#${id}`)).toHaveCount(1);
        await expect(secoes.nth(i).locator(`h2#${id}`)).toHaveCount(1);
      }
      for (const nome of ["Últimas", "Editorias", "Análise", "Crônica"]) {
        await expect(
          page.getByRole("region", { name: nome, exact: true }),
        ).toBeVisible();
      }
    });

    test("o destaque é a matéria real (PSG), sem selo, com ficha e foco âmbar", async ({
      page,
    }) => {
      const destaque = page.getByRole("region", { name: DESTAQUE.titulo });
      await expect(destaque).toBeVisible();
      const titulo = destaque.getByRole("heading", { level: 2 });
      await expect(titulo).toHaveText(DESTAQUE.titulo);
      await expect(titulo.getByRole("link")).toHaveAttribute(
        "href",
        `/materias/${DESTAQUE.slug}`,
      );
      // Matéria real: sem selo "Exemplo" (história 08, critério 4).
      await expect(destaque.getByText("Exemplo")).toHaveCount(0);
      await expect(
        destaque.getByText("Destaque", { exact: true }),
      ).toBeVisible();
      await expect(
        destaque.getByRole("link", { name: "Análise", exact: true }),
      ).toHaveAttribute("href", "/editorias/analise");
      await expect(destaque.locator("dl dt")).toHaveText([
        "Por",
        "Data",
        "Leitura",
      ]);
      await expect(destaque.locator("dl dd").first()).not.toBeEmpty();
      await expect(destaque.locator("dl time")).toHaveAttribute(
        "datetime",
        "2026-11-19",
      );
      await expect(destaque.locator("dl time")).toHaveText("19.11.2026");
      await expect(destaque.locator("dl")).toContainText(/\d+ min/);
      expect(
        await destaque.evaluate((el) => getComputedStyle(el).backgroundColor),
      ).toBe(await corDoToken(page, "--color-night"));
    });

    test("Últimas não repete o destaque e tem a contagem em dois dígitos", async ({
      page,
    }) => {
      const ultimas = page.getByRole("region", { name: "Últimas" });
      const titulos = ultimas.getByRole("heading", { level: 3 });
      await expect(titulos).toHaveCount(8);
      await expect(titulos).not.toContainText([DESTAQUE.titulo]);
      await expect(
        ultimas.locator(`a[href="/materias/${DESTAQUE.slug}"]`),
      ).toHaveCount(0);
      await expect(ultimas.locator("h2 + .label")).toHaveText("08");
      // A primeira fora da <ol> (feature: a fictícia mais recente), as outras sete em linhas.
      await expect(ultimas.locator("article h3").first()).toHaveText(
        FICTICIA_MAIS_RECENTE.titulo,
      );
      await expect(ultimas.locator("ol > li")).toHaveCount(7);
      await expect(ultimas.locator("ol > li").first()).toContainText("25.10");
    });

    test("nenhuma fictícia ocupa o destaque", async ({ page }) => {
      // Aqui só o caso do conteúdo de hoje; a regra geral (fictícia nunca no destaque
      // enquanto houver real) está no teste unitário de capa.ts.
      const destaque = page.locator("section[aria-labelledby='destaque']");
      await expect(destaque).toHaveCount(1);
      // O único link de matéria do destaque aponta para a real.
      const hrefs = await destaque
        .locator('a[href^="/materias/"]')
        .evaluateAll((els) => els.map((el) => el.getAttribute("href")));
      expect(hrefs).toEqual([`/materias/${DESTAQUE.slug}`]);
      await expect(destaque).not.toContainText(FICTICIA_MAIS_RECENTE.titulo);
    });

    test("Editorias: um link por editoria com matéria e a contagem acessível", async ({
      page,
    }) => {
      const editorias = page.getByRole("region", { name: "Editorias" });
      const links = editorias.getByRole("link");
      await expect(links).toHaveCount(7);
      await expect(
        editorias.getByRole("link", { name: /^Crônica/ }),
      ).toHaveAttribute("href", "/editorias/cronica");
      // A contagem por extenso fica num sr-only; o <sup> ("02") é só visual (história 05).
      await expect(
        editorias.getByRole("link", { name: /^Análise/ }),
      ).toHaveAttribute("href", "/editorias/analise");
      // Análise (PSG + Ventania) e Crônica têm 2; as outras cinco, 1.
      await expect(
        editorias.locator(".sr-only", { hasText: /^ 2 matérias$/ }),
      ).toHaveCount(2);
      await expect(
        editorias.locator(".sr-only", { hasText: /^ 1 matéria$/ }),
      ).toHaveCount(5);
      await expect(editorias.locator('sup[aria-hidden="true"]')).toHaveCount(7);
      await expect(editorias.locator("sup[aria-label]")).toHaveCount(0);
      // 6 barras entre as editorias + 7 contagens em <sup>.
      await expect(editorias.locator('[aria-hidden="true"]')).toHaveCount(13);
    });

    test("as faixas são Análise e Crônica, nessa ordem", async ({ page }) => {
      const faixas = page.locator("section[data-faixa]");
      await expect(faixas).toHaveCount(2);
      expect(
        await faixas.evaluateAll((els) =>
          els.map((el) => el.getAttribute("data-faixa")),
        ),
      ).toEqual(["analise", "cronica"]);
    });

    test("a faixa de Análise traz o PSG sem selo e a fictícia com selo", async ({
      page,
    }) => {
      const faixa = page.getByRole("region", { name: "Análise", exact: true });
      await expect(
        faixa.getByRole("link", { name: "Ver todas →" }),
      ).toHaveAttribute("href", "/editorias/analise");
      const itens = faixa.locator("article");
      await expect(itens).toHaveCount(2);
      await expect(itens.first().locator("h3 a")).toHaveAttribute(
        "href",
        `/materias/${DESTAQUE.slug}`,
      );
      await expect(itens.first().locator("time")).toHaveAttribute(
        "datetime",
        "2026-11-19",
      );
      await expect(itens.first().getByText("Exemplo")).toHaveCount(0);
      await expect(itens.nth(1).locator("h3 a")).toHaveAttribute(
        "href",
        `/materias/${FICTICIA_MAIS_RECENTE.slug}`,
      );
      await expect(
        itens.nth(1).getByText("Exemplo", { exact: true }),
      ).toBeVisible();
    });

    test("a faixa de Crônica traz as duas crônicas com selo", async ({
      page,
    }) => {
      const faixa = page.getByRole("region", { name: "Crônica", exact: true });
      await expect(
        faixa.getByRole("link", { name: "Ver todas →" }),
      ).toHaveAttribute("href", "/editorias/cronica");
      const itens = faixa.locator("article");
      await expect(itens).toHaveCount(2);
      await expect(itens.first().locator("time")).toHaveAttribute(
        "datetime",
        "2026-10-25",
      );
      // Espaço sr-only entre dia e mês: o texto é lido "25 out" (história 05).
      await expect(itens.first().locator("time")).toHaveText("25 out");
      await expect(
        itens.first().getByText("Exemplo", { exact: true }),
      ).toBeVisible();
    });

    test("nada de rolagem horizontal", async ({ page }) => {
      expect(await larguraDoDocumento(page)).toBeLessThanOrEqual(largura);
    });

    test("clicar no título de uma linha de Últimas abre a matéria com status 200", async ({
      page,
    }) => {
      const linha = page
        .getByRole("region", { name: "Últimas" })
        .locator("ol > li")
        .first();
      const link = linha.getByRole("heading", { level: 3 }).getByRole("link");
      const href = await link.getAttribute("href");
      expect(href).toMatch(/^\/materias\/[a-z0-9-]+$/);
      const titulo = (await link.textContent())!;
      await link.click();
      await expect(page).toHaveURL(href!);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(titulo);
      // Carga direta da mesma URL: passa pelo proxy e precisa responder 200.
      const resposta = await page.reload();
      expect(resposta?.status()).toBe(200);
    });

    test("o link da editoria numa linha continua clicável acima do link esticado", async ({
      page,
    }) => {
      const linha = page
        .getByRole("region", { name: "Últimas" })
        .locator("ol > li")
        .first();
      const editoria = linha.locator("p.label a").first();
      await editoria.scrollIntoViewIfNeeded();
      const caixa = (await editoria.boundingBox())!;
      const alvo = await page.evaluate(
        ({ x, y }) =>
          document.elementFromPoint(x, y)?.closest("a")?.getAttribute("href"),
        { x: caixa.x + caixa.width / 2, y: caixa.y + caixa.height / 2 },
      );
      expect(alvo).toBe(await editoria.getAttribute("href"));
    });
  });
}
