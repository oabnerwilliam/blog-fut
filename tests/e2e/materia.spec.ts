import { readFileSync } from "node:fs";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/** Matéria fictícia de exemplo: análise (NewsArticle), com meta_description e palavras-chave. */
const SLUG = "como-o-atletico-ventania-defende-com-a-bola";
const URL_DA_MATERIA = `/materias/${SLUG}`;
const ARQUIVO = path.join(process.cwd(), "content", "materias", `${SLUG}.md`);
const PASTA_DE_SCREENSHOTS = path.join(
  process.cwd(),
  "test-results",
  "materia",
);

/** Corpo do .md: tudo depois da segunda linha `---`. */
function corpoDoArquivo(): string {
  const texto = readFileSync(ARQUIVO, "utf8");
  const [, , ...resto] = texto.split(/^---\r?\n/m);
  return resto.join("---\n");
}

/** Parágrafos simples do .md (sem título, citação, lista ou HTML), exatamente como estão no arquivo. */
function paragrafosDoArquivo(): string[] {
  return corpoDoArquivo()
    .split(/\n\s*\n/)
    .map((bloco) => bloco.replace(/^\n+|\n+$/g, ""))
    .filter((bloco) => bloco !== "" && !/^(#|>|[-*+] |\d+\. |<)/.test(bloco));
}

async function violacoes(page: Page) {
  const resultado = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  return resultado.violations.map((v) => ({
    id: v.id,
    alvos: v.nodes.map((n) => n.target.join(" ")),
  }));
}

test.describe("página da matéria fictícia", () => {
  test("metadados: title, description, og, robots e JSON-LD", async ({
    page,
  }) => {
    await page.goto(URL_DA_MATERIA);
    await expect(page).toHaveTitle(
      "Como o Atlético Ventania aprendeu a defender com a bola",
    );
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      "Análise tática do Atlético Ventania, líder da Taça das Serras, e da posse de bola usada como forma de defesa.",
    );
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute(
      "content",
      "article",
    );
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex, nofollow/,
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      new RegExp(`${URL_DA_MATERIA}$`),
    );

    const scripts = page.locator('script[type="application/ld+json"]');
    await expect(scripts).toHaveCount(1);
    const jsonLd = JSON.parse((await scripts.textContent()) ?? "");
    expect(jsonLd["@type"]).toBe("NewsArticle");
    expect(jsonLd.headline).toBe(
      "Como o Atlético Ventania aprendeu a defender com a bola",
    );
    expect(jsonLd.inLanguage).toBe("pt-BR");
  });

  test("conteúdo: h1 único, editoria, data, leitura, selo, aviso e tags", async ({
    page,
  }) => {
    await page.goto(URL_DA_MATERIA);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("h1")).toHaveText(
      "Como o Atlético Ventania aprendeu a defender com a bola",
    );

    const artigo = page.locator("article");
    await expect(
      artigo.getByRole("link", { name: "Análise", exact: true }),
    ).toHaveAttribute("href", "/editorias/analise");
    await expect(artigo.locator('time[datetime="2026-10-28"]')).toHaveText(
      "28 de outubro de 2026",
    );
    await expect(artigo.getByText(/^\d+ min de leitura$/)).toBeVisible();
    await expect(artigo.getByText("Squad Fut", { exact: true })).toBeVisible();

    await expect(artigo.getByText("Exemplo", { exact: true })).toBeVisible();
    const aviso = artigo.getByRole("note");
    await expect(aviso).toContainText("Conteúdo fictício de demonstração");

    const tags = artigo.getByRole("navigation", { name: "Tags da matéria" });
    for (const [slug, rotulo] of [
      ["atletico-ventania", "Atlético Ventania"],
      ["taca-das-serras", "Taça das Serras"],
      ["uniao-porto-ametista", "União Porto Ametista"],
    ]) {
      await expect(
        tags.getByRole("link", { name: rotulo, exact: true }),
      ).toHaveAttribute("href", `/tags/${slug}`);
    }

    // O aviso vem antes do corpo.
    const avisoAntesDoCorpo = await page.evaluate(() => {
      const nota = document.querySelector('article [role="note"]');
      const corpo = document.querySelector("article [data-corpo]");
      return Boolean(
        nota &&
        corpo &&
        nota.compareDocumentPosition(corpo) & Node.DOCUMENT_POSITION_FOLLOWING,
      );
    });
    expect(avisoAntesDoCorpo).toBe(true);
  });

  test("o texto do corpo é idêntico ao do .md", async ({ page }) => {
    await page.goto(URL_DA_MATERIA);
    const renderizados = await page
      .locator("article [data-corpo] > p")
      .allTextContents();
    const doArquivo = paragrafosDoArquivo();
    expect(doArquivo.length).toBeGreaterThan(3);
    expect(renderizados).toEqual(doArquivo);
  });

  test("sem rolagem horizontal em 320px", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto(URL_DA_MATERIA);
    const larguras = await page.evaluate(() => ({
      conteudo: document.documentElement.scrollWidth,
      janela: document.documentElement.clientWidth,
    }));
    expect(larguras.conteudo).toBeLessThanOrEqual(larguras.janela);
  });

  for (const tema of ["light", "dark"] as const) {
    const nome = tema === "light" ? "claro" : "escuro";

    test(`sem violações axe e screenshots: tema ${nome}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: tema });
      for (const largura of [320, 1280]) {
        await page.setViewportSize({ width: largura, height: 900 });
        await page.goto(URL_DA_MATERIA);
        expect(await violacoes(page)).toEqual([]);
        await page.screenshot({
          path: path.join(
            PASTA_DE_SCREENSHOTS,
            `materia-${largura}-${nome}.png`,
          ),
          fullPage: true,
        });
      }
    });
  }
});

test.describe("matéria inexistente", () => {
  for (const caminho of [
    "/materias/nao-existe",
    "/materias/PSG",
    "/materias/..%2F..%2Fpackage",
  ]) {
    test(`${caminho} responde 404 com a página do site`, async ({ page }) => {
      const resposta = await page.goto(caminho);
      expect(resposta?.status()).toBe(404);
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator("h1")).toHaveText("Página não encontrada");
      await expect(
        page.getByRole("main").getByRole("link", { name: /capa/i }),
      ).toHaveAttribute("href", "/");
      await expect(page.locator("header").first()).toBeVisible();
      await expect(page.locator("footer")).toBeVisible();
    });
  }

  test("a 404 tem o <title> próprio", async ({ page }) => {
    await page.goto("/materias/nao-existe");
    await expect(page).toHaveTitle("Página não encontrada");
  });

  test("a página de 404 passa no axe", async ({ page }) => {
    await page.goto("/materias/nao-existe");
    expect(await violacoes(page)).toEqual([]);
  });
});
