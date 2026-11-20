import { expect, test, type Page } from "@playwright/test";
import { corDoToken, definirTema, esperarHidratacao } from "./helpers";

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

/* ===== História 07: botão de tema ===== */

const botaoDeTema = (page: Page) => page.locator("[data-botao-de-tema]");
const temaDoHtml = (page: Page) =>
  page.evaluate(() => document.documentElement.getAttribute("data-theme"));
const temaGuardado = (page: Page) =>
  page.evaluate(() => localStorage.getItem("tema"));

/**
 * Texto visível do botão: o `innerText` ignora os rótulos com `visibility: hidden` e aplica o
 * `text-transform` do `.label` (maiúsculas).
 */
const textoVisivel = (page: Page) =>
  botaoDeTema(page).evaluate((el) =>
    (el as HTMLElement).innerText.replace(/\s+/g, " ").trim(),
  );

/** Erros e avisos de console e exceções da página, desde o começo da navegação. */
function coletarErros(page: Page): string[] {
  const erros: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning") erros.push(m.text());
  });
  page.on("pageerror", (e) => erros.push(e.message));
  return erros;
}

/**
 * Roda no navegador antes de qualquer script da página. Guarda a escolha e registra, desde a
 * criação do documento, cada mudança de `data-theme` no `<html>` e a entrada do `<body>` no DOM,
 * na ordem em que aconteceram (registros do MutationObserver). Registra também o tema em cada
 * `requestAnimationFrame` (o callback roda antes do paint do frame) e o tema e o fundo do body
 * no DOMContentLoaded.
 */
function observarPrimeiroPaint({ guardado }: { guardado: string }) {
  try {
    localStorage.setItem("tema", guardado);
  } catch {
    // Documento sem storage (about:blank).
  }
  const w = window as unknown as Record<string, unknown>;
  const eventos: string[] = [];
  const frames: string[] = [];
  w.__eventos = eventos;
  w.__frames = frames;
  new MutationObserver((registros) => {
    for (const r of registros) {
      if (r.type === "attributes")
        eventos.push(
          `tema:${(r.target as Element).getAttribute("data-theme")}`,
        );
      for (const n of Array.from(r.addedNodes))
        if (n.nodeName === "BODY") eventos.push("body");
    }
  }).observe(document, {
    attributes: true,
    attributeFilter: ["data-theme"],
    childList: true,
    subtree: true,
  });
  const quadro = () => {
    frames.push(String(document.documentElement?.getAttribute("data-theme")));
    if (frames.length < 10) requestAnimationFrame(quadro);
  };
  requestAnimationFrame(quadro);
  document.addEventListener("DOMContentLoaded", () => {
    w.__temaNoDcl = document.documentElement.getAttribute("data-theme");
    w.__fundoNoDcl = getComputedStyle(document.body).backgroundColor;
  });
}

for (const { sistema, escolha } of [
  { sistema: "light", escolha: "dark" },
  { sistema: "dark", escolha: "light" },
] as const) {
  test.describe(`sem piscar: sistema ${sistema}, escolha ${escolha}`, () => {
    test.use({ colorScheme: sistema });

    test("o data-theme guardado já está no <html> antes do <body> e em todos os frames", async ({
      page,
    }) => {
      const erros = coletarErros(page);
      await page.addInitScript(observarPrimeiroPaint, { guardado: escolha });
      await page.goto("/");
      await esperarHidratacao(page);
      const r = await page.evaluate(() => {
        const w = window as unknown as Record<string, unknown>;
        return {
          eventos: w.__eventos as string[],
          frames: w.__frames as string[],
          dcl: w.__temaNoDcl,
          fundoNoDcl: w.__fundoNoDcl,
        };
      });
      // O atributo é posto uma vez só, antes de o <body> existir, e nunca muda depois
      // (nem na hidratação).
      expect(r.eventos[0]).toBe(`tema:${escolha}`);
      expect(r.eventos.filter((e) => e.startsWith("tema:"))).toEqual([
        `tema:${escolha}`,
      ]);
      expect(r.eventos).toContain("body");
      expect(r.dcl).toBe(escolha);
      expect(r.frames.length).toBeGreaterThan(0);
      expect(new Set(r.frames)).toEqual(new Set([escolha]));
      // O fundo no DOMContentLoaded já é o do tema escolhido, e não o do sistema.
      const fundoNoDcl = r.fundoNoDcl;
      expect(fundoNoDcl).toBe(await fundoDoBody(page));
      expect(erros).toEqual([]);
      // Contraprova: sem o atributo, o fundo seria o do sistema, que é outro.
      await page.evaluate(() =>
        document.documentElement.removeAttribute("data-theme"),
      );
      expect(fundoNoDcl).not.toBe(await fundoDoBody(page));
    });
  });
}

test.describe("botão de tema", () => {
  test.use({ colorScheme: "light" });

  test("ciclo pelo teclado: Tab até o botão e Enter três vezes", async ({
    page,
  }) => {
    const erros = coletarErros(page);
    await page.goto("/");
    await esperarHidratacao(page);
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await expect(botaoDeTema(page)).toBeFocused();
    await expect(botaoDeTema(page)).toHaveAttribute(
      "aria-label",
      "Tema: sistema. Mudar para claro",
    );
    expect(await textoVisivel(page)).toBe("TEMA: SISTEMA");

    const passos = [
      {
        tema: "light",
        texto: "Tema: claro",
        nome: "Tema: claro. Mudar para escuro",
      },
      {
        tema: "dark",
        texto: "Tema: escuro",
        nome: "Tema: escuro. Mudar para sistema",
      },
      {
        tema: null,
        texto: "Tema: sistema",
        nome: "Tema: sistema. Mudar para claro",
      },
    ];
    for (const p of passos) {
      await page.keyboard.press("Enter");
      await expect(botaoDeTema(page)).toHaveAttribute("aria-label", p.nome);
      expect(await temaDoHtml(page)).toBe(p.tema);
      expect(await textoVisivel(page)).toBe(p.texto.toUpperCase());
      // O nome acessível começa pelo texto visível (WCAG 2.5.3).
      expect(p.nome.startsWith(p.texto)).toBe(true);
      expect(await temaGuardado(page)).toBe(p.tema);
    }
    await expect(botaoDeTema(page)).toBeFocused();
    expect(erros).toEqual([]);
  });

  test("é um button type=button com área de toque mínima", async ({ page }) => {
    await page.goto("/");
    const botao = page.getByRole("button", { name: /^Tema: / });
    await expect(botao).toHaveAttribute("type", "button");
    const caixa = (await botao.boundingBox())!;
    expect(caixa.height).toBeGreaterThanOrEqual(40);
    expect(caixa.width).toBeGreaterThanOrEqual(40);
  });

  test("escolher sistema tira o data-theme e volta a seguir o prefers-color-scheme", async ({
    page,
  }) => {
    await page.goto("/");
    await esperarHidratacao(page);
    const claro = await fundoDoBody(page);
    await botaoDeTema(page).click(); // claro
    await botaoDeTema(page).click(); // escuro
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    expect(await fundoDoBody(page)).not.toBe(claro);
    await botaoDeTema(page).click(); // sistema
    await expect(page.locator("html")).not.toHaveAttribute("data-theme");
    expect(await fundoDoBody(page)).toBe(claro);
    await page.emulateMedia({ colorScheme: "dark" });
    expect(await fundoDoBody(page)).not.toBe(claro);
  });

  test("a escolha persiste ao navegar para uma matéria e uma editoria, e ao recarregar", async ({
    page,
  }) => {
    await page.goto("/");
    await esperarHidratacao(page);
    await botaoDeTema(page).click();
    await botaoDeTema(page).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    const escuro = await fundoDoBody(page);
    expect(await temaGuardado(page)).toBe("dark");

    // Navegação pelo app: link da capa para uma matéria.
    await page.locator("main a[href^='/materias/']").first().click();
    await expect(page).toHaveURL(/\/materias\//);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    expect(await fundoDoBody(page)).toBe(escuro);
    await expect(botaoDeTema(page)).toHaveAttribute(
      "aria-label",
      "Tema: escuro. Mudar para sistema",
    );

    // Link da nav para uma editoria.
    await page
      .getByRole("navigation", { name: "Editorias", exact: true })
      .getByRole("link")
      .first()
      .click();
    await expect(page).toHaveURL(/\/editorias\//);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    expect(await fundoDoBody(page)).toBe(escuro);

    // Documento novo: quem aplica o tema é o script inline.
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    expect(await fundoDoBody(page)).toBe(escuro);
    await page.goto("/materias/como-o-atletico-ventania-defende-com-a-bola");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await esperarHidratacao(page);
    await expect(botaoDeTema(page)).toHaveAttribute(
      "aria-label",
      "Tema: escuro. Mudar para sistema",
    );
    expect(await textoVisivel(page)).toBe("TEMA: ESCURO");
  });

  test.describe("com o localStorage bloqueado", () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(() => {
        Object.defineProperty(window, "localStorage", {
          configurable: true,
          get() {
            throw new DOMException("bloqueado", "SecurityError");
          },
        });
      });
    });

    test("a página abre sem erro no console e o botão ainda alterna", async ({
      page,
    }) => {
      const erros = coletarErros(page);
      await page.goto("/");
      await expect(page.locator("html")).toHaveAttribute("data-js", "");
      await expect(page.locator("html")).not.toHaveAttribute("data-theme");
      await esperarHidratacao(page);
      await expect(botaoDeTema(page)).toBeVisible();
      await botaoDeTema(page).click();
      await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
      await botaoDeTema(page).click();
      await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
      await botaoDeTema(page).click();
      await expect(page.locator("html")).not.toHaveAttribute("data-theme");
      expect(erros).toEqual([]);
    });
  });
});

test.describe("sem JavaScript", () => {
  test.use({ javaScriptEnabled: false, colorScheme: "dark" });

  test("o botão não aparece, e o tema segue o sistema", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).not.toHaveAttribute("data-js");
    await expect(botaoDeTema(page)).toHaveCount(1);
    await expect(botaoDeTema(page)).toBeHidden();
    expect(await fundoDoBody(page)).toBe(await corDoToken(page, "--color-bg"));
  });
});
