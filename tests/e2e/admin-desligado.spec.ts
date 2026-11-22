import { expect, test } from "@playwright/test";

/**
 * U14 (história 16, critério 10): com `ADMIN_HABILITADO` desligado, como nos previews da
 * Vercel e nesta suíte (`playwright.config.ts` fixa `false`), todo `/admin/**` responde
 * 404 de verdade, com a página de não encontrado do site. Quem responde é o Proxy.
 */
const CAMINHOS = [
  "/admin",
  "/admin/entrar",
  "/admin/acessos",
  "/admin/materias",
  "/admin/materias/00000000-0000-4000-8000-000000000001/historico",
  "/admin/auth/callback?code=qualquer",
];

for (const caminho of CAMINHOS) {
  test(`${caminho} responde 404 com o admin desligado`, async ({ page }) => {
    const resposta = await page.goto(caminho);
    expect(resposta?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByText("Entrar com Google")).toHaveCount(0);
  });
}

test("o site público não tem link para o /admin", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('a[href^="/admin"]')).toHaveCount(0);
});
