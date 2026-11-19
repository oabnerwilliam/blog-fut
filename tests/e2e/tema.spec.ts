import { expect, test, type Page } from "@playwright/test";
import { corDoToken, definirTema } from "./helpers";

const fundoDoBody = (page: Page) =>
  page.evaluate(() => getComputedStyle(document.body).backgroundColor);
const corDoBody = (page: Page) =>
  page.evaluate(() => getComputedStyle(document.body).color);

/** Fundo do body sem atributo, num navegador com o esquema dado. */
async function fundoDoSistema(
  page: Page,
  esquema: "light" | "dark",
): Promise<string> {
  await page.emulateMedia({ colorScheme: esquema });
  await page.goto("/");
  return fundoDoBody(page);
}

test.describe("sistema escuro", () => {
  test.use({ colorScheme: "dark" });

  test("sem data-theme, sistema escuro mostra o tema escuro", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator("html")).not.toHaveAttribute("data-theme");
    const fundo = await fundoDoBody(page);
    expect(fundo).toBe(await corDoToken(page, "--color-bg"));
    expect(await corDoBody(page)).toBe(await corDoToken(page, "--color-ink"));

    const claro = await fundoDoSistema(page, "light");
    expect(fundo).not.toBe(claro);
  });

  test("data-theme=light vence sistema escuro", async ({ page }) => {
    await page.goto("/");
    const fundoEscuro = await fundoDoBody(page);
    await definirTema(page, "light");
    const forcado = await fundoDoBody(page);
    expect(forcado).not.toBe(fundoEscuro);
    expect(forcado).toBe(await corDoToken(page, "--color-bg"));

    expect(forcado).toBe(await fundoDoSistema(page, "light"));
  });
});

test.describe("sistema claro", () => {
  test.use({ colorScheme: "light" });

  test("sem data-theme, sistema claro mostra o tema claro", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator("html")).not.toHaveAttribute("data-theme");
    const fundo = await fundoDoBody(page);
    expect(fundo).toBe(await corDoToken(page, "--color-bg"));
    expect(await corDoBody(page)).toBe(await corDoToken(page, "--color-ink"));

    const escuro = await fundoDoSistema(page, "dark");
    expect(fundo).not.toBe(escuro);
  });

  test("data-theme=dark vence sistema claro", async ({ page }) => {
    await page.goto("/");
    const fundoClaro = await fundoDoBody(page);
    await definirTema(page, "dark");
    const forcado = await fundoDoBody(page);
    expect(forcado).not.toBe(fundoClaro);
    expect(forcado).toBe(await corDoToken(page, "--color-bg"));

    expect(forcado).toBe(await fundoDoSistema(page, "dark"));
  });
});
