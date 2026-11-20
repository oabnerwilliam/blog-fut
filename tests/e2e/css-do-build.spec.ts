import { expect, test, type Page } from "@playwright/test";

/**
 * O CSS que o leitor baixa (história 11, ADR 0007). Os testes unitários olham o código-fonte;
 * este olha o resultado do build, que é o que o Tailwind realmente gerou.
 */

async function cssDaPagina(page: Page, url: string): Promise<string> {
  await page.goto(url);
  const hrefs = await page
    .locator('link[rel="stylesheet"]')
    .evaluateAll((links) => links.map((l) => (l as HTMLLinkElement).href));
  expect(hrefs.length).toBeGreaterThan(0);
  const textos = await Promise.all(
    hrefs.map(async (href) => (await page.request.get(href)).text()),
  );
  return textos.join("\n");
}

/** Pares "seletor { declarações }" de nível mais interno (sem regras aninhadas). */
function regras(css: string): { seletor: string; corpo: string }[] {
  return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({
    seletor: m[1].trim(),
    corpo: m[2],
  }));
}

const COR_LITERAL =
  /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color-mix)\(|:\s*(?:white|black|red|blue|green)\b/i;

test("nenhum utilitário de valor arbitrário no CSS do build tem cor literal", async ({
  page,
}) => {
  const css = await cssDaPagina(
    page,
    "/materias/como-o-atletico-ventania-defende-com-a-bola",
  );
  // Utilitário arbitrário: seletor com `\[` ou `\(` escapados (`.bg-\[\#fff\]`, `.bg-\(--x\)`).
  const comCor = regras(css)
    .filter(({ seletor }) => /\\[[(]/.test(seletor))
    .filter(({ corpo }) => COR_LITERAL.test(corpo))
    .map(({ seletor, corpo }) => `${seletor}{${corpo}}`);
  expect(comCor).toEqual([]);
});

test("as paletas e as fontes padrão do Tailwind não chegam ao CSS do build", async ({
  page,
}) => {
  const css = await cssDaPagina(page, "/");
  expect(css).not.toMatch(
    /--color-(?:red|slate|gray|zinc|blue|white|black)[\w-]*\s*:/,
  );
  expect(css).not.toMatch(/--font-(?:sans|serif)\s*:/);
  expect(css).not.toMatch(/\.font-sans\b|\.bg-red-500\b|\.text-xl\b/);
  // Sem referência circular de token (`--color-bg: var(--color-bg)`).
  for (const [, nome, alvo] of css.matchAll(
    /(--[\w-]+)\s*:\s*var\((--[\w-]+)\)/g,
  )) {
    expect(alvo, nome).not.toBe(nome);
  }
});
