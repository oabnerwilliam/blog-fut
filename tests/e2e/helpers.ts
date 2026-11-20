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

/**
 * Força o tema pelo atributo `data-theme` no `<html>`, sem passar pelo botão nem pelo storage
 * (o botão da história 07 é testado em tema.spec.ts).
 */
export async function definirTema(
  page: Page,
  tema: "light" | "dark",
): Promise<void> {
  await page.evaluate(
    (t) => document.documentElement.setAttribute("data-theme", t),
    tema,
  );
}

/**
 * Espera o React hidratar o botão de tema (história 07). Antes disso, Enter e clique não fazem
 * nada. O React marca o elemento hidratado com uma propriedade `__reactProps…`.
 */
export async function esperarHidratacao(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const botao = document.querySelector("[data-botao-de-tema]");
    return (
      !!botao && Object.keys(botao).some((k) => k.startsWith("__reactProps"))
    );
  });
}
