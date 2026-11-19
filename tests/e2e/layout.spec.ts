import { expect, test } from "@playwright/test";
import { EDITORIAS, hrefDaEditoria } from "../../src/lib/editorias";

test("o nome do portal é link para /", async ({ page }) => {
  await page.goto("/");
  const nome = page
    .getByRole("banner")
    .getByRole("link", { name: "Zona Mista, página inicial" });
  await expect(nome).toHaveCount(1);
  await expect(nome).toHaveAttribute("href", "/");
  await expect(nome).toBeVisible();
});

test("o wordmark não é h1", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("banner").getByRole("heading", { level: 1 }),
  ).toHaveCount(0);
});

test("nav Editorias tem os 7 links na ordem, com rótulo e destino", async ({
  page,
}) => {
  await page.goto("/");
  const nav = page
    .getByRole("banner")
    .getByRole("navigation", { name: "Editorias", exact: true });
  const links = nav.getByRole("link");
  await expect(links).toHaveCount(7);
  await expect(links).toHaveText(EDITORIAS.map((e) => e.rotulo));
  for (const [i, { slug, rotulo }] of EDITORIAS.entries()) {
    await expect(links.nth(i)).toHaveAccessibleName(rotulo);
    await expect(links.nth(i)).toHaveAttribute("href", hrefDaEditoria(slug));
  }
});

test("rodapé tem o nome do portal e a frase do squad-fut", async ({ page }) => {
  await page.goto("/");
  const rodape = page.getByRole("contentinfo");
  await expect(rodape).toContainText("Zona Mista");
  await expect(rodape).toContainText(/produzidas pelo squad-fut/);
  const nav = rodape.getByRole("navigation", { name: "Editorias no rodapé" });
  await expect(nav.getByRole("link")).toHaveText(
    EDITORIAS.map((e) => e.rotulo),
  );
});
