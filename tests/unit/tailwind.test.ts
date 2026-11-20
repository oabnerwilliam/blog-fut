import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { extrairBloco, removerComentarios } from "./helpers/css";

/** História 11 / ADR 0007: estilo em Tailwind v4, tokens como fonte única. */

const RAIZ = path.resolve(__dirname, "../..");
const SRC = path.join(RAIZ, "src");
const globais = removerComentarios(
  readFileSync(path.join(SRC, "app", "globals.css"), "utf8"),
);

function listarArquivos(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const caminho = path.join(dir, e.name);
    return e.isDirectory() ? listarArquivos(caminho) : [caminho];
  });
}

/** Remove os blocos `@at-rule { … }` de nível de cima cujo nome começa por `prefixo`. */
function semBlocos(css: string, prefixo: string): string {
  let saida = css;
  for (;;) {
    const inicio = saida.indexOf(prefixo);
    if (inicio === -1) return saida;
    const abre = saida.indexOf("{", inicio);
    let profundidade = 1;
    let i = abre + 1;
    while (profundidade > 0 && i < saida.length) {
      if (saida[i] === "{") profundidade++;
      else if (saida[i] === "}") profundidade--;
      i++;
    }
    saida = saida.slice(0, inicio) + saida.slice(i);
  }
}

describe("Tailwind v4", () => {
  it("não sobra nenhum *.module.css em src/", () => {
    const modulos = listarArquivos(SRC)
      .filter((arquivo) => arquivo.endsWith(".module.css"))
      .map((arquivo) => path.relative(RAIZ, arquivo).replace(/\\/g, "/"));
    expect(modulos).toEqual([]);
  });

  it("o único CSS além de tokens.css é o globals.css", () => {
    const css = listarArquivos(SRC)
      .filter((arquivo) => arquivo.endsWith(".css"))
      .map((arquivo) => path.relative(SRC, arquivo).replace(/\\/g, "/"))
      .sort();
    expect(css).toEqual(["app/globals.css", "styles/tokens.css"]);
  });

  it("o globals.css importa o Tailwind e desliga paletas, fontes e textos padrão", () => {
    expect(globais).toMatch(/@import\s+"tailwindcss";/);
    const tema = extrairBloco(globais, "@theme");
    expect(tema).toMatch(/--color-\*:\s*initial;/);
    expect(tema).toMatch(/--font-\*:\s*initial;/);
    expect(tema).toMatch(/--text-\*:\s*initial;/);
  });

  it("o @theme dos tokens só aponta para var(--…) e não é reemitido (sem referência circular)", () => {
    const tema = extrairBloco(globais, "@theme inline reference");
    const declaracoes = [...tema.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)];
    expect(declaracoes.length).toBeGreaterThan(0);
    for (const [, nome, valor] of declaracoes) {
      expect(valor.trim(), nome).toBe(`var(${nome})`);
    }
  });

  it("o @theme expõe todas as cores, fontes e tamanhos de texto de tokens.css", () => {
    const tokens = readFileSync(path.join(SRC, "styles", "tokens.css"), "utf8");
    const raiz = extrairBloco(removerComentarios(tokens), ":root");
    const doTokens = [...raiz.matchAll(/(--(?:color|font|text)-[\w-]+)\s*:/g)]
      .map((m) => m[1])
      .sort();
    const tema = extrairBloco(globais, "@theme inline reference");
    const doTema = [...tema.matchAll(/(--[\w-]+)\s*:/g)]
      .map((m) => m[1])
      .sort();
    expect(doTema).toEqual(doTokens);
  });

  it("todo CSS próprio do globals.css fica em @layer base ou @layer components", () => {
    let resto = globais.replace(/@import\s+"tailwindcss";/, "");
    for (const prefixo of ["@theme", "@layer base", "@layer components"]) {
      resto = semBlocos(resto, prefixo);
    }
    expect(resto.trim()).toBe("");
  });
});
