import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { extrairBloco, lerVariaveis, removerComentarios } from "./helpers/css";

const RAIZ = path.resolve(__dirname, "../..");
const tokensCss = removerComentarios(
  readFileSync(path.join(RAIZ, "src/styles/tokens.css"), "utf8"),
);
const tokensMd = readFileSync(path.join(RAIZ, "docs/design/tokens.md"), "utf8");

const SELETOR_MEDIA = "@media (prefers-color-scheme: dark)";
const SELETOR_ESCURO_SISTEMA = ':root:not([data-theme="light"])';
const SELETOR_ESCURO_FORCADO = ':root[data-theme="dark"]';

const claro = () => lerVariaveis(extrairBloco(tokensCss, ":root"));
const escuroSistema = () =>
  lerVariaveis(
    extrairBloco(
      extrairBloco(tokensCss, SELETOR_MEDIA),
      SELETOR_ESCURO_SISTEMA,
    ),
  );
const escuroForcado = () =>
  lerVariaveis(extrairBloco(tokensCss, SELETOR_ESCURO_FORCADO));

/** Lista da §6 de tokens.md. */
const OBRIGATORIOS = [
  "--color-bg",
  "--color-surface",
  "--color-ink",
  "--color-ink-muted",
  "--color-rule",
  "--color-rule-strong",
  "--color-accent",
  "--color-amber",
  "--color-night",
  "--color-night-ink",
  "--color-night-ink-muted",
  "--color-night-rule",
  "--color-badge-bg",
  "--color-badge-ink",
  "--color-notice-bg",
  "--color-notice-ink",
  "--color-focus",
  "--color-focus-night",
  "--font-display",
  "--font-text",
  "--font-mono",
  "--text-label",
  "--text-nav-index",
  "--text-nav",
  "--text-body",
  "--text-lead",
  "--text-dek",
  "--text-row-title",
  "--text-section",
  "--text-h2",
  "--text-feature",
  "--text-wordmark",
  "--text-h1",
  "--text-display",
  "--text-footer-mark",
  "--space-1",
  "--space-2",
  "--space-3",
  "--space-4",
  "--space-5",
  "--space-6",
  "--space-7",
  "--space-section",
  "--layout-gutter",
  "--layout-max",
  "--layout-measure",
  "--radius",
  "--rule-width",
  "--rule-width-strong",
  "--focus-width",
  "--focus-offset",
  "--tap-min",
];

/** Bloco ```css da §1 ("Cores") de tokens.md. */
function blocoCssDasCores(): string {
  const secao = tokensMd.slice(
    tokensMd.indexOf("## 1. Cores"),
    tokensMd.indexOf("## 2."),
  );
  const achado = secao.match(/```css\n([\s\S]*?)```/);
  if (!achado) throw new Error("Bloco css da §1 não encontrado em tokens.md");
  return removerComentarios(achado[1]);
}

const minusculas = (vars: Record<string, string>) =>
  Object.fromEntries(
    Object.entries(vars).map(([k, v]) => [k, v.toLowerCase()]),
  );

describe("tokens", () => {
  it("define todos os tokens obrigatórios em :root", () => {
    const definidos = Object.keys(claro());
    expect(OBRIGATORIOS.filter((nome) => !definidos.includes(nome))).toEqual(
      [],
    );
  });

  it("o bloco escuro do @media e o [data-theme=dark] têm as mesmas variáveis e valores", () => {
    expect(Object.keys(escuroSistema()).length).toBeGreaterThan(0);
    expect(escuroForcado()).toEqual(escuroSistema());
  });

  it("declara color-scheme claro em :root e escuro nos dois blocos escuros", () => {
    expect(extrairBloco(tokensCss, ":root")).toMatch(/color-scheme:\s*light/);
    expect(
      extrairBloco(
        extrairBloco(tokensCss, SELETOR_MEDIA),
        SELETOR_ESCURO_SISTEMA,
      ),
    ).toMatch(/color-scheme:\s*dark/);
    expect(extrairBloco(tokensCss, SELETOR_ESCURO_FORCADO)).toMatch(
      /color-scheme:\s*dark/,
    );
  });

  it("os valores claro e escuro batem com docs/design/tokens.md", () => {
    const doc = blocoCssDasCores();
    const claroDoc = lerVariaveis(extrairBloco(doc, ":root"));
    const escuroDoc = lerVariaveis(
      extrairBloco(extrairBloco(doc, SELETOR_MEDIA), SELETOR_ESCURO_SISTEMA),
    );
    expect(Object.keys(claroDoc)).toHaveLength(18);

    const claroImpl = minusculas(claro());
    for (const [nome, valor] of Object.entries(claroDoc)) {
      expect(claroImpl[nome], nome).toBe(valor.toLowerCase());
    }
    expect(minusculas(escuroSistema())).toEqual(minusculas(escuroDoc));
  });

  it("--font-display/--font-text/--font-mono referenciam as variáveis do next/font", () => {
    const vars = claro();
    expect(vars["--font-display"]).toMatch(/^var\(--font-instrument-serif\),/);
    expect(vars["--font-text"]).toMatch(/^var\(--font-instrument-sans\),/);
    expect(vars["--font-mono"]).toMatch(/^var\(--font-geist-mono\),/);
  });
});
