import { expect, test } from "@playwright/test";
import { corDoToken } from "./helpers";

/**
 * Elementos que o sanitizador aceita (ADR 0004) e que nenhuma matéria atual usa. O preflight
 * do Tailwind muda o estilo deles; a `.prosa` devolve o comportamento anterior (ADR 0007).
 * O HTML é injetado no corpo de uma matéria, para medir o estilo real da `.prosa`.
 */

const URL = "/materias/como-o-atletico-ventania-defende-com-a-bola";

const HTML = `
  <p id="antes">Parágrafo.</p>
  <hr id="hr">
  <p>Texto com <code id="code">codigo()</code> no meio.</p>
  <pre id="pre"><code>linha 1
linha 2</code></pre>
  <h4 id="h4">Quarto nível</h4>
  <h5 id="h5">Quinto nível</h5>
  <h6 id="h6">Sexto nível</h6>
  <p><img id="img" alt="" width="4000" height="10" src="data:image/gif;base64,R0lGODlhAQABAAAAACw="></p>
`;

test.use({ viewport: { width: 320, height: 800 } });

test("a prosa devolve hr, code/pre e h4–h6 ao comportamento anterior ao preflight", async ({
  page,
}) => {
  await page.goto(URL);
  await page.locator("article [data-corpo]").evaluate((el, html) => {
    el.innerHTML = html;
  }, HTML);

  const estilo = (id: string) =>
    page.locator(`#${id}`).evaluate((el) => {
      const s = getComputedStyle(el);
      const corpo = getComputedStyle(el.closest("[data-corpo]")!);
      return {
        margemTopo: parseFloat(s.marginTop),
        margemBaixo: parseFloat(s.marginBottom),
        bordaTopo: parseFloat(s.borderTopWidth),
        corDaBorda: s.borderTopColor,
        estiloDaBorda: s.borderTopStyle,
        fonte: parseFloat(s.fontSize),
        fonteDoCorpo: parseFloat(corpo.fontSize),
        familia: s.fontFamily,
        larguraMaxima: s.maxWidth,
        largura: el.getBoundingClientRect().width,
        larguraDoCorpo: el.closest("[data-corpo]")!.getBoundingClientRect()
          .width,
        overflowX: s.overflowX,
      };
    });

  // hr: fio na cor de linha do tema, com respiro em cima e embaixo.
  const hr = await estilo("hr");
  expect(hr.margemTopo).toBeGreaterThan(0);
  expect(hr.margemBaixo).toBeGreaterThan(0);
  expect(hr.bordaTopo).toBeGreaterThanOrEqual(1);
  expect(hr.estiloDaBorda).toBe("solid");
  expect(hr.corDaBorda).toBe(await corDoToken(page, "--color-rule"));

  // code: fonte mono do token, menor que o texto corrido (como o monospace do navegador).
  const code = await estilo("code");
  expect(code.familia).toMatch(/Geist[ _]Mono/);
  expect(code.fonte).toBeLessThan(code.fonteDoCorpo);

  // pre: volta a ter margem e não alarga a página no 320px.
  const pre = await estilo("pre");
  expect(pre.margemBaixo).toBeGreaterThan(0);
  expect(pre.overflowX).toBe("auto");

  // h4–h6: h5 e h6 voltam a ser menores que o texto (no preflight, herdam o tamanho).
  const [h4, h5, h6] = await Promise.all(["h4", "h5", "h6"].map(estilo));
  expect(h5.fonte).toBeLessThan(h4.fonte);
  expect(h6.fonte).toBeLessThan(h5.fonte);

  // img: max-width 100% do preflight fica (melhoria aceita).
  const img = await estilo("img");
  expect(img.larguraMaxima).toBe("100%");
  expect(img.largura).toBeLessThanOrEqual(img.larguraDoCorpo);

  // Nada disso cria rolagem horizontal.
  const rola = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(rola).toBe(false);
});
