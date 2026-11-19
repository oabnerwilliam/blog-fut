import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { encontrarCoresLiterais } from "./helpers/css";

const RAIZ = path.resolve(__dirname, "../..");
const SRC = path.join(RAIZ, "src");
const ARQUIVO_DE_TOKENS = path.join(SRC, "styles", "tokens.css");

function listarArquivos(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const caminho = path.join(dir, e.name);
    if (e.isDirectory()) return listarArquivos(caminho);
    return /\.(css|ts|tsx)$/.test(e.name) ? [caminho] : [];
  });
}

describe("cores literais", () => {
  it("o detector acha os casos positivos e ignora os negativos", () => {
    // CSS: positivos
    expect(encontrarCoresLiterais(".a { color: #fff; }", "css")).toHaveLength(
      1,
    );
    expect(
      encontrarCoresLiterais(".a { background: #EFEEE9 }", "css"),
    ).toHaveLength(1);
    expect(
      encontrarCoresLiterais(".a { color: rgb(0 0 0); }", "css"),
    ).toHaveLength(1);
    expect(
      encontrarCoresLiterais(".a { color: rgba(0, 0, 0, .5); }", "css"),
    ).toHaveLength(1);
    expect(
      encontrarCoresLiterais(".a { color: oklch(70% 0.1 200); }", "css"),
    ).toHaveLength(1);
    expect(
      encontrarCoresLiterais(".a { color: hsl(0 0% 0%); }", "css"),
    ).toHaveLength(1);
    expect(encontrarCoresLiterais(".a { color: white; }", "css")).toHaveLength(
      1,
    );
    expect(
      encontrarCoresLiterais(".a { border: 1px solid Black }", "css"),
    ).toHaveLength(1);
    expect(encontrarCoresLiterais(".a {\n  color: red;\n}", "css")).toEqual([
      "2: color: red;",
    ]);
    // CSS: negativos
    expect(encontrarCoresLiterais(".a { color: transparent; }", "css")).toEqual(
      [],
    );
    expect(
      encontrarCoresLiterais(".a { color: currentColor; }", "css"),
    ).toEqual([]);
    expect(encontrarCoresLiterais(".a { color: inherit; }", "css")).toEqual([]);
    expect(
      encontrarCoresLiterais(".a { color: var(--color-ink); }", "css"),
    ).toEqual([]);
    expect(
      encontrarCoresLiterais(".a { color: var(--color-tan, initial); }", "css"),
    ).toEqual([]);
    expect(encontrarCoresLiterais('.a { content: "red"; }', "css")).toEqual([]);
    expect(
      encontrarCoresLiterais("/* color: #fff */ .a { color: unset; }", "css"),
    ).toEqual([]);
    expect(
      encontrarCoresLiterais(".red:hover { color: var(--x); }", "css"),
    ).toEqual([]);
    expect(
      encontrarCoresLiterais(
        ".a { font: 500 1rem/1 var(--font-mono); text-wrap: balance; }",
        "css",
      ),
    ).toEqual([]);

    // TS/TSX: positivos
    expect(
      encontrarCoresLiterais('<p style={{ color: "red" }}>x</p>', "ts"),
    ).toHaveLength(1);
    expect(encontrarCoresLiterais('const c = "#fff";', "ts")).toHaveLength(1);
    expect(
      encontrarCoresLiterais('const s = { color: "#2638C9" };', "ts"),
    ).toHaveLength(1);
    expect(
      encontrarCoresLiterais('const b = "1px solid #000";', "ts"),
    ).toHaveLength(1);
    expect(
      encontrarCoresLiterais('const c = "rgb(0 0 0)";', "ts"),
    ).toHaveLength(1);
    expect(
      encontrarCoresLiterais("const c = `oklch(70% 0.1 200)`;", "ts"),
    ).toHaveLength(1);
    // TS/TSX: negativos
    expect(
      encontrarCoresLiterais('<a href="#conteudo">Pular</a>', "ts"),
    ).toEqual([]);
    expect(
      encontrarCoresLiterais('<a href="#conteudo-principal">x</a>', "ts"),
    ).toEqual([]);
    expect(
      encontrarCoresLiterais(
        '<p style={{ color: "var(--color-ink)" }}>x</p>',
        "ts",
      ),
    ).toEqual([]);
    expect(
      encontrarCoresLiterais(
        '<p style={{ color: "currentColor" }}>x</p>',
        "ts",
      ),
    ).toEqual([]);
    expect(
      encontrarCoresLiterais(
        '<p style={{ background: "transparent" }}>x</p>',
        "ts",
      ),
    ).toEqual([]);
    expect(
      encontrarCoresLiterais('const url = "https://x.dev/#fff"; // #fff', "ts"),
    ).toEqual([]);
    expect(
      encontrarCoresLiterais(
        "<p>Vermelho, white paper e red card no texto</p>",
        "ts",
      ),
    ).toEqual([]);
  });

  it("nenhuma cor literal em src/ fora de src/styles/tokens.css", () => {
    const achados = listarArquivos(SRC)
      .filter((arquivo) => arquivo !== ARQUIVO_DE_TOKENS)
      .flatMap((arquivo) => {
        const tipo = arquivo.endsWith(".css") ? "css" : "ts";
        const relativo = path.relative(RAIZ, arquivo).replace(/\\/g, "/");
        return encontrarCoresLiterais(readFileSync(arquivo, "utf8"), tipo).map(
          (achado) => `${relativo}:${achado}`,
        );
      });
    expect(achados).toEqual([]);
  });
});
