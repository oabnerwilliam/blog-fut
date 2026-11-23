import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from "@playwright/test";
import { lerUrlDoSite } from "../../src/lib/site";

/*
 * Prévia do link (T02): as tags Open Graph e Twitter no HTML e a imagem em si. As imagens
 * baixadas ficam em test-results/og/ para conferência visual.
 */

const SITE_URL = lerUrlDoSite(process.env);
const PASTA = path.join(process.cwd(), "test-results", "og");
const LIMITE_DO_WHATSAPP = 300 * 1024;

const REAL = {
  slug: "psg-balanco-temporada-2026-27-mercado-elenco-curto",
  titulo: "O mercado enxuto do PSG deu certo até aqui. Falta aguentar até maio",
};
const FICTICIA = {
  slug: "como-o-atletico-ventania-defende-com-a-bola",
  titulo: "Como o Atlético Ventania aprendeu a defender com a bola",
};
/** O maior título do acervo (117 caracteres): faixa de 68 px. */
const TITULO_LONGO = "odalio-brandao-ninguem-ganha-correndo-atras-da-bola";
const ALT_PADRAO =
  "Zona Mista: futebol depois do apito. Análise, crônica e reportagem de futebol apuradas pelo squad-fut.";

async function meta(page: Page, chave: string): Promise<string[]> {
  return page
    .locator(`meta[property="${chave}"], meta[name="${chave}"]`)
    .evaluateAll((els) => els.map((el) => el.getAttribute("content") ?? ""));
}

interface Previa {
  url: URL;
  alt: string;
}

/** Confere as tags da prévia na página e devolve a URL e o alt da imagem. */
async function previaDaPagina(page: Page, caminho: string): Promise<Previa> {
  const resposta = await page.goto(caminho);
  expect(resposta?.status()).toBe(200);

  const imagens = await meta(page, "og:image");
  expect(imagens, "uma única og:image").toHaveLength(1);
  const url = new URL(imagens[0]);
  // URL absoluta a partir do SITE_URL (metadataBase).
  expect(imagens[0].startsWith(SITE_URL.origin + "/")).toBe(true);
  expect(await meta(page, "og:image:width")).toEqual(["1200"]);
  expect(await meta(page, "og:image:height")).toEqual(["630"]);
  expect(await meta(page, "og:image:type")).toEqual(["image/png"]);
  const [alt] = await meta(page, "og:image:alt");

  expect(await meta(page, "twitter:card")).toEqual(["summary_large_image"]);
  expect(await meta(page, "twitter:image")).toEqual([imagens[0]]);
  expect(await meta(page, "twitter:image:alt")).toEqual([alt]);
  return { url, alt };
}

/** Baixa a imagem do servidor de teste (o SITE_URL pode apontar para outra porta). */
async function baixar(
  request: APIRequestContext,
  url: URL,
  nome: string,
): Promise<Buffer> {
  const resposta = await request.get(url.pathname + url.search);
  expect(resposta.status()).toBe(200);
  expect(resposta.headers()["content-type"]).toBe("image/png");
  const corpo = await resposta.body();
  expect(corpo.byteLength).toBeLessThan(LIMITE_DO_WHATSAPP);
  // Assinatura PNG e dimensões do cabeçalho IHDR.
  expect(corpo.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  expect(corpo.readUInt32BE(16)).toBe(1200);
  expect(corpo.readUInt32BE(20)).toBe(630);
  mkdirSync(PASTA, { recursive: true });
  writeFileSync(path.join(PASTA, `${nome}.png`), corpo);
  return corpo;
}

test.describe("prévia do link (T02)", () => {
  test("matéria real: imagem própria, com o título no alt", async ({
    page,
    request,
  }) => {
    const { url, alt } = await previaDaPagina(page, `/materias/${REAL.slug}`);
    expect(url.pathname).toMatch(
      new RegExp(`^/materias/${REAL.slug}/opengraph-image`),
    );
    expect(alt).toBe(REAL.titulo);
    await baixar(request, url, "materia-real");
  });

  test("matéria fictícia: imagem própria, alt com o aviso de exemplo", async ({
    page,
    request,
  }) => {
    const { url, alt } = await previaDaPagina(
      page,
      `/materias/${FICTICIA.slug}`,
    );
    expect(url.pathname).toMatch(
      new RegExp(`^/materias/${FICTICIA.slug}/opengraph-image`),
    );
    expect(alt).toBe(`Exemplo: ${FICTICIA.titulo}`);
    await baixar(request, url, "materia-ficticia");
  });

  test("matéria com o título mais longo do acervo", async ({
    page,
    request,
  }) => {
    const { url } = await previaDaPagina(page, `/materias/${TITULO_LONGO}`);
    await baixar(request, url, "materia-titulo-longo");
  });

  test("capa, busca, editoria e tag usam a imagem padrão do portal", async ({
    page,
    request,
  }) => {
    const urls = new Set<string>();
    for (const caminho of [
      "/",
      "/busca",
      "/editorias/analise",
      "/tags/psg",
      "/editorias/analise?pagina=1",
    ]) {
      const { url, alt } = await previaDaPagina(page, caminho);
      expect(url.pathname, caminho).toMatch(/^\/opengraph-image/);
      expect(alt, caminho).toBe(ALT_PADRAO);
      urls.add(url.href);
    }
    expect(urls.size).toBe(1);
    await baixar(request, new URL([...urls][0]), "padrao");
  });

  test("imagem de matéria inexistente responde 404", async ({
    page,
    request,
  }) => {
    const { url } = await previaDaPagina(page, `/materias/${REAL.slug}`);
    const inexistente = url.pathname.replace(
      REAL.slug,
      "materia-que-nao-existe",
    );
    const resposta = await request.get(inexistente);
    expect(resposta.status()).toBe(404);
  });
});
