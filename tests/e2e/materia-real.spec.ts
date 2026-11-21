import { readFileSync } from "node:fs";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * Primeira matéria real (história 08): a do PSG, vinda do squad-fut. Critérios 5 e 6:
 * página indexável, com canonical próprio e JSON-LD `NewsArticle`, e no sitemap com a
 * editoria e as tags dela, sem nenhuma fictícia.
 */
const SLUG = "psg-balanco-temporada-2026-27-mercado-elenco-curto";
const URL_DA_MATERIA = `/materias/${SLUG}`;
const TITULO =
  "O mercado enxuto do PSG deu certo até aqui. Falta aguentar até maio";
const ARQUIVO = path.join(process.cwd(), "content", "materias", `${SLUG}.md`);

const TAGS = [
  ["psg", "PSG"],
  ["ligue-1", "Ligue 1"],
  ["champions-league", "Champions League"],
  ["luis-enrique", "Luis Enrique"],
  ["kvaratskhelia", "Kvaratskhelia"],
] as const;

/** Fictícias de content/: nenhuma pode aparecer no sitemap. */
const FICTICIAS = [
  "a-ultima-tarde-do-mirante-velho",
  "como-o-atletico-ventania-defende-com-a-bola",
  "ec-sao-ciriaco-anuncia-reforma-do-estadio",
  "marcelina-arruda-a-goleira-que-le-o-chute",
  "o-radinho-da-arquibancada-norte",
  "o-silencio-de-sao-ciriaco-depois-do-rebaixamento",
  "odalio-brandao-ninguem-ganha-correndo-atras-da-bola",
  "os-campos-de-varzea-que-alimentam-a-taca-das-serras",
];

/** Parágrafos simples do corpo do .md, com as quebras normalizadas para LF. */
function paragrafosDoArquivo(): string[] {
  const texto = readFileSync(ARQUIVO, "utf8").replace(/\r\n/g, "\n");
  const [, , ...resto] = texto.split(/^---\n/m);
  return resto
    .join("---\n")
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

const larguraDoDocumento = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth);

test.describe("matéria real do PSG", () => {
  test("responde 200, sem aviso de fictícia, sem selo e sem noindex", async ({
    page,
  }) => {
    const resposta = await page.goto(URL_DA_MATERIA);
    expect(resposta?.status()).toBe(200);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("h1")).toHaveText(TITULO);
    const artigo = page.locator("article");
    await expect(artigo.getByRole("note")).toHaveCount(0);
    await expect(page.locator("main")).not.toContainText(
      "Conteúdo fictício de demonstração",
    );
    await expect(artigo.getByText("Exemplo", { exact: true })).toHaveCount(0);
    // Sem `robots` próprio: a página entra no índice.
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
  });

  test("canonical próprio, title SEO e JSON-LD NewsArticle", async ({
    page,
  }) => {
    await page.goto(URL_DA_MATERIA);
    await expect(page).toHaveTitle(
      "Balanço do PSG 2026/27: mercado enxuto, liderança e lesões",
    );
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveCount(1);
    const href = (await canonical.getAttribute("href"))!;
    expect(new URL(href).pathname).toBe(URL_DA_MATERIA);

    const scripts = page.locator('script[type="application/ld+json"]');
    await expect(scripts).toHaveCount(1);
    const jsonLd = JSON.parse((await scripts.textContent()) ?? "");
    expect(jsonLd["@type"]).toBe("NewsArticle");
    expect(jsonLd.headline).toBe(TITULO);
    expect(jsonLd.datePublished).toBe("2026-11-19");
    expect(new URL(jsonLd.mainEntityOfPage).pathname).toBe(URL_DA_MATERIA);
  });

  test("editoria, data e as 5 tags com os rótulos certos", async ({ page }) => {
    await page.goto(URL_DA_MATERIA);
    const artigo = page.locator("article");
    await expect(
      artigo.getByRole("link", { name: "Análise", exact: true }),
    ).toHaveAttribute("href", "/editorias/analise");
    await expect(artigo.locator('time[datetime="2026-11-19"]')).toHaveText(
      "19 de novembro de 2026",
    );
    const tags = artigo.getByRole("navigation", { name: "Tags da matéria" });
    await expect(tags.getByRole("link")).toHaveCount(TAGS.length);
    for (const [slug, rotulo] of TAGS) {
      await expect(
        tags.getByRole("link", { name: rotulo, exact: true }),
      ).toHaveAttribute("href", `/tags/${slug}`);
    }
  });

  test("os parágrafos e os intertítulos do corpo são os do .md", async ({
    page,
  }) => {
    await page.goto(URL_DA_MATERIA);
    const corpo = page.locator("article [data-corpo]");
    const doArquivo = paragrafosDoArquivo();
    expect(doArquivo.length).toBeGreaterThan(10);
    expect(await corpo.locator(":scope > p").allTextContents()).toEqual(
      doArquivo,
    );
    await expect(corpo.locator("h2")).toHaveText([
      "A régua do bicampeão",
      "Vender caro, comprar pouco",
      "Um começo torto e uma arrancada",
      "Gols de todo lado, até da defesa",
      "A conta das lesões",
      "Roma, Aston Villa e a janela de janeiro",
    ]);
  });

  for (const esquema of ["light", "dark"] as const) {
    test.describe(`no ${esquema === "light" ? "claro" : "escuro"}`, () => {
      test.use({ colorScheme: esquema });

      for (const largura of [320, 1280]) {
        test(`sem rolagem horizontal e sem violações de axe em ${largura}px`, async ({
          page,
        }) => {
          await page.setViewportSize({ width: largura, height: 800 });
          await page.goto(URL_DA_MATERIA);
          expect(await larguraDoDocumento(page)).toBeLessThanOrEqual(largura);
          expect(await violacoes(page)).toEqual([]);
        });
      }
    });
  }
});

test.describe("listagens da matéria real", () => {
  for (const caminho of [
    "/editorias/analise",
    ...TAGS.map(([slug]) => `/tags/${slug}`),
  ]) {
    test(`${caminho} responde 200, lista o PSG e não tem noindex`, async ({
      page,
    }) => {
      const resposta = await page.goto(caminho);
      expect(resposta?.status()).toBe(200);
      await expect(
        page.locator(`main ol > li a[href="${URL_DA_MATERIA}"]`),
      ).not.toHaveCount(0);
      await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
    });
  }

  test("/tags/psg mostra o rótulo do tags.json, não a humanização", async ({
    page,
  }) => {
    await page.goto("/tags/psg");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("PSG");
    await expect(page).toHaveTitle("Tag: PSG");
  });

  test("uma lista só de fictícias continua com noindex", async ({ page }) => {
    await page.goto("/editorias/cronica");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex/,
    );
  });
});

test.describe("sitemap.xml com a matéria real", () => {
  async function caminhosDoSitemap(
    request: import("@playwright/test").APIRequestContext,
  ) {
    const resposta = await request.get("/sitemap.xml");
    expect(resposta.status()).toBe(200);
    const xml = await resposta.text();
    return [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map(
      (m) => new URL(m[1]).pathname,
    );
  }

  test("lista a capa, o PSG, /editorias/analise e as 5 tags, e nada mais", async ({
    request,
  }) => {
    expect(await caminhosDoSitemap(request)).toEqual([
      "/",
      URL_DA_MATERIA,
      "/editorias/analise",
      ...TAGS.map(([slug]) => `/tags/${slug}`),
    ]);
  });

  test("nenhuma fictícia nem lista só de fictícias", async ({ request }) => {
    const caminhos = await caminhosDoSitemap(request);
    for (const slug of FICTICIAS) {
      expect(caminhos).not.toContain(`/materias/${slug}`);
    }
    for (const lista of [
      "/editorias/cronica",
      "/editorias/noticia",
      "/tags/taca-das-serras",
      "/tags/atletico-ventania",
    ]) {
      expect(caminhos).not.toContain(lista);
    }
  });
});
