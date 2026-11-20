import { expect, test, type Page } from "@playwright/test";
import { corDoToken, definirTema } from "./helpers";

/**
 * QA, história 01: o contorno de foco do link de pular é --color-ink com outline-offset, e um
 * halo (box-shadow na cor de --color-bg) preenche o vão, de modo que o contorno fica sempre
 * sobre o fundo da página (e não sobre o âmbar nem sobre os glifos do cabeçalho).
 * Aqui isso é conferido no render real: tiramos um screenshot com o link focado e lemos os
 * pixels do contorno, do vão entre o botão e o contorno, e do lado de fora do contorno.
 */

type Rgb = [number, number, number];

function luminancia([r, g, b]: Rgb): number {
  const canal = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
}

function contraste(a: Rgb, b: Rgb): number {
  const [l1, l2] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

const paraRgb = (css: string): Rgb => {
  const m = css.match(/\d+(\.\d+)?/g);
  if (!m || m.length < 3) throw new Error(`cor inesperada: ${css}`);
  return [Number(m[0]), Number(m[1]), Number(m[2])];
};

/** Lê pixels (coordenadas da página) de um screenshot, decodificado num canvas do próprio navegador. */
async function pixels(
  page: Page,
  pontos: { x: number; y: number }[],
): Promise<Rgb[]> {
  const png = (await page.screenshot()).toString("base64");
  return page.evaluate(
    async ({ png, pontos }) => {
      const img = new Image();
      img.src = `data:image/png;base64,${png}`;
      await img.decode();
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      return pontos.map(({ x, y }) => {
        const d = ctx.getImageData(Math.round(x), Math.round(y), 1, 1).data;
        return [d[0], d[1], d[2]] as [number, number, number];
      });
    },
    { png, pontos },
  );
}

const CENARIOS = [
  { nome: "sistema claro", esquema: "light", forcar: null },
  { nome: "sistema escuro", esquema: "dark", forcar: null },
  {
    nome: "data-theme=dark com sistema claro",
    esquema: "light",
    forcar: "dark",
  },
  {
    nome: "data-theme=light com sistema escuro",
    esquema: "dark",
    forcar: "light",
  },
] as const;

for (const largura of [1280, 320]) {
  for (const c of CENARIOS) {
    test.describe(`link de pular focado: ${c.nome}, ${largura}px`, () => {
      test.use({
        colorScheme: c.esquema,
        viewport: { width: largura, height: 720 },
        // Um pixel CSS = um pixel do screenshot: as coordenadas amostradas batem.
        deviceScaleFactor: 1,
      });

      test("o contorno é --color-ink e o que fica dos dois lados dele é o fundo da página, com contraste >= 3:1", async ({
        page,
      }) => {
        await page.goto("/");
        if (c.forcar) await definirTema(page, c.forcar);
        await page.keyboard.press("Tab");
        const pular = page.getByRole("link", { name: "Pular para o conteúdo" });
        await expect(pular).toBeFocused();
        await expect(pular).toBeInViewport();

        const estilo = await pular.evaluate((el) => {
          const s = getComputedStyle(el);
          return {
            cor: s.outlineColor,
            largura: parseFloat(s.outlineWidth),
            offset: parseFloat(s.outlineOffset),
            estilo: s.outlineStyle,
          };
        });
        const tinta = await corDoToken(page, "--color-ink");
        const fundo = await corDoToken(page, "--color-bg");
        const ambar = await corDoToken(page, "--color-amber");
        expect(estilo.estilo).toBe("solid");
        expect(estilo.cor).toBe(tinta);
        // Com offset > 0 existe um vão entre o âmbar e o contorno.
        expect(estilo.offset).toBeGreaterThan(0);

        const caixa = (await pular.boundingBox())!;
        const { largura: w, offset: o } = estilo;
        const rgbTinta = paraRgb(tinta);
        const rgbFundo = paraRgb(fundo);
        const rgbAmbar = paraRgb(ambar);
        const perto = (a: Rgb, b: Rgb) =>
          a.every((v, i) => Math.abs(v - b[i]) <= 2);

        // Percorre os quatro lados, pixel a pixel, em três faixas paralelas à borda do botão:
        // o meio do contorno, o meio do vão (entre o âmbar e o contorno) e 2px fora do contorno.
        const faixas = {
          contorno: o + w / 2,
          vao: o / 2,
          fora: o + w + 2,
        } as const;
        const pontos: {
          x: number;
          y: number;
          faixa: keyof typeof faixas;
          lado: string;
        }[] = [];
        const x0 = Math.ceil(caixa.x);
        const x1 = Math.floor(caixa.x + caixa.width) - 1;
        const y0 = Math.ceil(caixa.y);
        const y1 = Math.floor(caixa.y + caixa.height) - 1;
        for (const faixa of Object.keys(faixas) as (keyof typeof faixas)[]) {
          const d = faixas[faixa];
          for (let x = x0; x <= x1; x++) {
            pontos.push({ x, y: caixa.y - d, faixa, lado: "topo" });
            pontos.push({
              x,
              y: caixa.y + caixa.height + d - 1,
              faixa,
              lado: "base",
            });
          }
          for (let y = y0; y <= y1; y++) {
            pontos.push({ x: caixa.x - d, y, faixa, lado: "esquerda" });
            pontos.push({
              x: caixa.x + caixa.width + d - 1,
              y,
              faixa,
              lado: "direita",
            });
          }
        }
        const cores = await pixels(page, pontos);
        const amostras = pontos.map((p, i) => ({ ...p, cor: cores[i] }));

        // O contorno é inteiro tinta (está acima de tudo: o link tem z-index).
        const contornoErrado = amostras.filter(
          (a) => a.faixa === "contorno" && !perto(a.cor, rgbTinta),
        );
        expect(
          contornoErrado.map((a) => `${a.lado}@${a.x},${a.y}: ${a.cor}`),
        ).toEqual([]);

        // Nenhum pixel do vão é âmbar: o contorno não encosta no botão.
        const vao = amostras.filter((a) => a.faixa === "vao");
        expect(vao.filter((a) => perto(a.cor, rgbAmbar))).toEqual([]);

        // Vão: o fundo da página nos quatro lados. Embaixo o link sobrepõe o cabeçalho, mas o
        // halo na cor de --color-bg cobre os glifos do wordmark/slogan entre o âmbar e o contorno.
        // Lado de fora: em cima e à esquerda só há papel; embaixo, fora do contorno, ficam os
        // glifos do cabeçalho, que não fazem parte do indicador. À direita, em 320px, o link
        // cobre o começo do botão de tema (história 07, "TEMA: …"), e fora do contorno ficam os
        // glifos dele; nas larguras maiores, à direita também só há papel.
        const faixasPorLado = {
          topo: ["vao", "fora"],
          esquerda: ["vao", "fora"],
          direita: largura === 320 ? ["vao"] : ["vao", "fora"],
          base: ["vao"],
        } as const;
        for (const [lado, faixasDoLado] of Object.entries(faixasPorLado)) {
          for (const faixa of faixasDoLado) {
            const todas = amostras.filter(
              (a) => a.faixa === faixa && a.lado === lado,
            );
            const papel = todas.filter((a) => perto(a.cor, rgbFundo));
            expect(
              papel.length / todas.length,
              `fração de fundo em "${faixa}" (${lado})`,
            ).toBeGreaterThanOrEqual(0.95);
          }
        }

        // Contraste do indicador contra o fundo adjacente (WCAG 1.4.11 / critério 10).
        expect(contraste(rgbTinta, rgbFundo)).toBeGreaterThanOrEqual(3);
        // E o contraste que NÃO se aplica (ink sobre âmbar), registrado para comparação.
        test.info().annotations.push({
          type: "contraste",
          description: `ink/bg=${contraste(rgbTinta, rgbFundo).toFixed(2)} ink/amber=${contraste(rgbTinta, rgbAmbar).toFixed(2)}`,
        });
      });
    });
  }
}
