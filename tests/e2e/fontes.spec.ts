import { expect, test } from "@playwright/test";

test("não requisita fonts.googleapis.com nem fonts.gstatic.com", async ({
  page,
}) => {
  const externas: string[] = [];
  page.on("request", (r) => {
    if (/fonts\.(googleapis|gstatic)\.com/.test(r.url()))
      externas.push(r.url());
  });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  expect(externas).toEqual([]);
  await expect(page.locator('link[href*="fonts.googleapis.com"]')).toHaveCount(
    0,
  );
});

test("carrega fontes de /_next/static/media", async ({ page }) => {
  const fontes: string[] = [];
  page.on("request", (r) => {
    if (r.resourceType() === "font") fontes.push(new URL(r.url()).pathname);
  });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.fonts.ready);
  expect(fontes.length).toBeGreaterThan(0);
  expect(fontes.every((f) => f.startsWith("/_next/static/media/"))).toBe(true);
});

test("h1 em Instrument Serif, parágrafo em Instrument Sans, rótulo em Geist Mono", async ({
  page,
}) => {
  await page.goto("/");
  const familia = (seletor: string) =>
    page
      .locator(seletor)
      .first()
      .evaluate((el) => getComputedStyle(el).fontFamily);

  expect(await familia("main h1")).toMatch(/Instrument[ _]Serif/);
  const paragrafo = await familia("main p:not(.label)");
  expect(paragrafo).toMatch(/Instrument[ _]Sans/);
  expect(paragrafo).not.toMatch(/Serif/);
  expect(await familia("main .label")).toMatch(/Geist[ _]Mono/);
});
