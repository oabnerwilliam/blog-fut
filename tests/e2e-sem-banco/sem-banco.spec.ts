import { expect, test, type Page } from "@playwright/test";

/**
 * Risco 4 do plano v2 (U11): banco fora do ar e nenhuma página em cache. Quem lê o banco
 * mostra o `error.tsx` (pt-BR, um `h1`, "Tentar de novo"), nunca uma tela branca, um 500
 * cru do Proxy ou o stack trace no HTML. O build deste servidor rodou sem banco.
 */

/** Pedaços que só apareceriam se o erro do servidor vazasse para o HTML. */
const VAZAMENTOS = [
  "falha ao ler",
  "fetch failed",
  "TypeError",
  "127.0.0.1:9",
  "repository.ts",
  "    at ",
];

async function conferirTelaDeErro(page: Page): Promise<void> {
  const titulo = page.getByRole("heading", { level: 1 });
  await expect(titulo).toHaveText("Não foi possível carregar esta página");
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Tentar de novo" }),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
  // O cabeçalho e o rodapé do layout continuam: não é tela branca.
  await expect(page.getByRole("banner")).toBeVisible();
  await expect(page.getByRole("contentinfo")).toBeVisible();

  const html = await page.content();
  for (const trecho of VAZAMENTOS) expect(html).not.toContain(trecho);
}

test("a capa sem banco mostra a tela de erro em pt-BR, sem stack", async ({
  page,
}) => {
  const resposta = await page.goto("/");
  expect(resposta?.status()).toBeLessThan(500);
  await conferirTelaDeErro(page);
});

test("o HTML da capa, antes do JavaScript, não traz o erro do servidor", async ({
  request,
}) => {
  const resposta = await request.get("/");
  const html = await resposta.text();
  for (const trecho of VAZAMENTOS) expect(html).not.toContain(trecho);
});

test("uma matéria sem banco: o Proxy passa adiante (nada de 500 dele) e a página mostra o erro", async ({
  page,
}) => {
  const resposta = await page.goto(
    "/materias/psg-balanco-temporada-2026-27-mercado-elenco-curto",
  );
  expect(resposta?.status()).toBeLessThan(500);
  await conferirTelaDeErro(page);
});

test("Tentar de novo, com o banco ainda fora, continua na tela de erro", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Tentar de novo" }).click();
  await conferirTelaDeErro(page);
});
