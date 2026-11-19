import type { Page } from "@playwright/test";

/**
 * Valor computado (`rgb(…)`) de um token de cor na página atual.
 * Cria uma sonda no `body` com `color: var(nome)`, lê a cor computada e remove a sonda.
 */
export async function corDoToken(page: Page, nome: string): Promise<string> {
  return page.evaluate((token) => {
    const sonda = document.createElement("div");
    sonda.style.color = `var(${token})`;
    document.body.appendChild(sonda);
    const cor = getComputedStyle(sonda).color;
    sonda.remove();
    return cor;
  }, nome);
}

/** Força o tema pelo atributo `data-theme` no `<html>` (a história 7 fará isso com um botão). */
export async function definirTema(
  page: Page,
  tema: "light" | "dark",
): Promise<void> {
  await page.evaluate(
    (t) => document.documentElement.setAttribute("data-theme", t),
    tema,
  );
}
