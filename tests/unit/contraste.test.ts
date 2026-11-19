import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  extrairBloco,
  lerVariaveis,
  razaoDeContraste,
  removerComentarios,
} from "./helpers/css";

const RAIZ = path.resolve(__dirname, "../..");
const tokensCss = removerComentarios(
  readFileSync(path.join(RAIZ, "src/styles/tokens.css"), "utf8"),
);
const tokensMd = readFileSync(path.join(RAIZ, "docs/design/tokens.md"), "utf8");

const claro = lerVariaveis(extrairBloco(tokensCss, ":root"));
const escuro = {
  ...claro,
  ...lerVariaveis(extrairBloco(tokensCss, ':root[data-theme="dark"]')),
};
const TEMAS = { claro, escuro } as const;

type Par = { texto: string; fundo: string; minimo: number };

/** Pares das tabelas da §2 de tokens.md ("### Claro" e "### Escuro"). */
function paresDaDocumentacao(tema: "Claro" | "Escuro"): Par[] {
  const secao = tokensMd.slice(
    tokensMd.indexOf("## 2."),
    tokensMd.indexOf("## 3."),
  );
  const inicio = secao.indexOf(`### ${tema}`);
  const fim = secao.indexOf("###", inicio + 4);
  const tabela = secao.slice(inicio, fim === -1 ? undefined : fim);
  return [
    ...tabela.matchAll(
      /^\| `(--[\w-]+)` \/ `(--[\w-]+)`.*\| (\d+(?:,\d+)?):1 \|\s*$/gm,
    ),
  ].map((m) => ({
    texto: m[1],
    fundo: m[2],
    minimo: Number(m[3].replace(",", ".")),
  }));
}

function razao(tema: keyof typeof TEMAS, a: string, b: string): number {
  const vars = TEMAS[tema];
  if (!vars[a] || !vars[b]) throw new Error(`Token ausente: ${a} ou ${b}`);
  return razaoDeContraste(vars[a], vars[b]);
}

describe("contraste dos tokens", () => {
  it("o cálculo de contraste segue a WCAG", () => {
    expect(razaoDeContraste("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(razaoDeContraste("#fff", "#fff")).toBeCloseTo(1, 5);
    expect(razaoDeContraste("#16181D", "#EFEEE9")).toBeCloseTo(15.29, 1);
  });

  for (const [nomeTema, chave] of [
    ["Claro", "claro"],
    ["Escuro", "escuro"],
  ] as const) {
    it(`pares de texto e UI da §2 de tokens.md atingem o mínimo (${chave})`, () => {
      const pares = paresDaDocumentacao(nomeTema);
      expect(pares.length).toBeGreaterThanOrEqual(10);
      const textos = pares.filter((p) => p.minimo === 4.5);
      expect(textos.length).toBeGreaterThanOrEqual(7);
      const abaixo = pares
        .map((p) => ({ ...p, razao: razao(chave, p.texto, p.fundo) }))
        .filter((p) => p.razao < p.minimo)
        .map(
          (p) => `${p.texto}/${p.fundo}: ${p.razao.toFixed(2)} < ${p.minimo}`,
        );
      expect(abaixo).toEqual([]);
    });

    it(`foco >= 3:1 (${chave})`, () => {
      expect(
        razao(chave, "--color-focus", "--color-bg"),
      ).toBeGreaterThanOrEqual(3);
      expect(
        razao(chave, "--color-focus-night", "--color-night"),
      ).toBeGreaterThanOrEqual(3);
      // Link de pular: contorno --color-ink com outline-offset de 3px, ou seja, desenhado sobre o
      // papel (--color-bg) que fica entre o botão âmbar e o contorno. Esse é o fundo adjacente.
      // (--color-ink/--color-amber só passa no claro: 9,69:1; no escuro dá 1,53:1.)
      expect(razao(chave, "--color-ink", "--color-bg")).toBeGreaterThanOrEqual(
        3,
      );
    });

    it(`link de pular e textos do cabeçalho e do rodapé >= 4,5:1 (${chave})`, () => {
      expect(
        razao(chave, "--color-badge-ink", "--color-amber"),
      ).toBeGreaterThanOrEqual(4.5);
      expect(razao(chave, "--color-ink", "--color-bg")).toBeGreaterThanOrEqual(
        4.5,
      );
      expect(
        razao(chave, "--color-ink-muted", "--color-bg"),
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        razao(chave, "--color-accent", "--color-bg"),
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        razao(chave, "--color-night-ink", "--color-night"),
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        razao(chave, "--color-night-ink-muted", "--color-night"),
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        razao(chave, "--color-amber", "--color-night"),
      ).toBeGreaterThanOrEqual(4.5);
    });
  }
});
