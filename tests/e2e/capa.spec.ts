import { expect, test } from "@playwright/test";
import { corDoToken } from "./helpers";

test("a capa tem um único h1", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(page.locator("h1")).toHaveCount(1);
});

test("tem parágrafo, link e texto secundário", async ({ page }) => {
  await page.goto("/");
  const main = page.locator("main#conteudo");
  await expect(main).toHaveAttribute("tabindex", "-1");

  await expect(main.locator("p:not(.label)").first()).toContainText(
    "squad-fut",
  );

  const link = main.getByRole("link");
  await expect(link.first()).toBeVisible();
  const corDoLink = await link
    .first()
    .evaluate((el) => getComputedStyle(el).color);
  expect(corDoLink).toBe(await corDoToken(page, "--color-accent"));

  const secundario = main.locator(".label").first();
  await expect(secundario).toBeVisible();
  const corSecundaria = await secundario.evaluate(
    (el) => getComputedStyle(el).color,
  );
  expect(corSecundaria).toBe(await corDoToken(page, "--color-ink-muted"));
});
