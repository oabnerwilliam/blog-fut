import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  encontrarCoresArbitrariasEmClasses,
  encontrarCoresLiterais,
} from "./helpers/css";

const RAIZ = path.resolve(__dirname, "../..");
const SRC = path.join(RAIZ, "src");
const ARQUIVO_DE_TOKENS = path.join(SRC, "styles", "tokens.css");
/**
 * Exceção da T02: o `ImageResponse` (prévia do link) não lê CSS, então as cores da arte
 * são literais neste único módulo, cópias dos tokens (conferidas em tests/unit/og/cores.test.ts).
 */
const CORES_DA_PREVIA = path.join(SRC, "lib", "og", "cores.ts");
const PODEM_TER_COR_LITERAL = [ARQUIVO_DE_TOKENS, CORES_DA_PREVIA];

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

  it("o detector de classes Tailwind acha cor arbitrária e paleta padrão (ADR 0007)", () => {
    const achar = (codigo: string) =>
      encontrarCoresArbitrariasEmClasses(codigo);

    // Positivos: hex em valor arbitrário
    for (const classe of [
      "bg-[#fff]",
      "text-[#2638C9]",
      "border-[#000]",
      "border-t-[#c9c7bf]",
      "hover:bg-[#ffb000]",
      "decoration-[#123456]/50",
      "shadow-[0_0_0_3px_#fff]",
    ]) {
      expect(achar(`<p className="flex ${classe}">x</p>`), classe).toHaveLength(
        1,
      );
    }
    // Positivos: função de cor ou nome de cor CSS dentro de [...]
    for (const classe of [
      "bg-[rgb(0,0,0)]",
      "text-[hsl(0_0%_0%)]",
      "fill-[oklch(70%_0.1_200)]",
      "bg-[color:var(--x,red)]",
      "[color:white]",
      "shadow-[0_0_0_2px_white]",
      "outline-[black]",
    ]) {
      expect(achar(`const c = "p-2 ${classe}";`), classe).toHaveLength(1);
    }
    // Positivos: variável com fallback de cor literal, na sintaxe curta do v4
    for (const classe of [
      "bg-(--x,#fff)",
      "text-(--cor,rgb(0,0,0))",
      "border-(color:--x,white)",
      "hover:bg-(--color-bg,#efeee9)",
    ]) {
      expect(achar(`<p className="m-0 ${classe}">x</p>`), classe).toHaveLength(
        1,
      );
    }
    // Positivos: paleta padrão do Tailwind
    for (const classe of [
      "bg-red-500",
      "text-slate-900",
      "md:border-zinc-200/40",
      "text-amber-500",
      "bg-slate",
      "text-white",
      "bg-black/50",
      "ring-gray-300",
    ]) {
      expect(
        achar(`<a className={\`underline ${classe}\`}>x</a>`),
        classe,
      ).toHaveLength(1);
    }
    expect(achar('<p\n  className="bg-red-500"\n>x</p>')).toEqual([
      '2: className="bg-red-500"',
    ]);

    // Negativos: tokens do portal e valores arbitrários sem cor
    for (const codigo of [
      '<p className="bg-bg text-ink border-rule-strong">x</p>',
      '<p className="text-amber hover:text-amber bg-badge-bg">x</p>',
      '<p className="bg-(--color-night) text-(--color-ink)">x</p>',
      '<p className="text-[length:min(var(--text-footer-mark),27cqi)]">x</p>',
      '<p className="shadow-[0_0_0_var(--focus-offset)_var(--color-bg)]">x</p>',
      '<p className="grid-cols-[7fr_5fr] max-w-[46ch] mt-[1.1rem]">x</p>',
      "<p className=\"before:content-['◇'] aria-[current=page]:underline\">x</p>",
      '<p className="[&_:focus-visible]:outline-focus-night">x</p>',
      '<a href="#conteudo">Pular</a>',
      "const lista = EDITORIAS[indice];",
      "<p>Cartão red e camisa white no texto</p>",
      '<p className="whitespace-nowrap text-ink-muted">x</p>',
    ]) {
      expect(achar(codigo), codigo).toEqual([]);
    }
  });

  it("nenhuma classe com cor arbitrária ou paleta padrão em .ts/.tsx de src/", () => {
    const achados = listarArquivos(SRC)
      .filter((arquivo) => /\.tsx?$/.test(arquivo))
      .flatMap((arquivo) => {
        const relativo = path.relative(RAIZ, arquivo).replace(/\\/g, "/");
        return encontrarCoresArbitrariasEmClasses(
          readFileSync(arquivo, "utf8"),
        ).map((achado) => `${relativo}:${achado}`);
      });
    expect(achados).toEqual([]);
  });

  it("nenhuma cor literal em src/ fora de src/styles/tokens.css e src/lib/og/cores.ts", () => {
    const achados = listarArquivos(SRC)
      .filter((arquivo) => !PODEM_TER_COR_LITERAL.includes(arquivo))
      .flatMap((arquivo) => {
        const tipo = arquivo.endsWith(".css") ? "css" : "ts";
        const relativo = path.relative(RAIZ, arquivo).replace(/\\/g, "/");
        return encontrarCoresLiterais(readFileSync(arquivo, "utf8"), tipo).map(
          (achado) => `${relativo}:${achado}`,
        );
      });
    expect(achados).toEqual([]);
    // O caso positivo existe: a exceção tem cor literal de fato.
    expect(
      encontrarCoresLiterais(readFileSync(CORES_DA_PREVIA, "utf8"), "ts"),
    ).not.toEqual([]);
  });
});
