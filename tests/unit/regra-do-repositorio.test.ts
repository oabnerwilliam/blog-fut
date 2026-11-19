import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SLUGS_DE_EDITORIA } from "@/lib/editorias";
import {
  encontrarCaminhosParaContent,
  encontrarImportsDeFs,
  encontrarLiterais,
  listarCodigo,
} from "./helpers/regra-do-repositorio";

const RAIZ = path.resolve(__dirname, "../..");
const SRC = path.join(RAIZ, "src");
const CAMADA_DE_CONTEUDO = path.join(SRC, "lib", "content");

const relativo = (arquivo: string) =>
  path.relative(RAIZ, arquivo).replace(/\\/g, "/");

function achadosEm(
  arquivos: readonly string[],
  detector: (codigo: string) => string[],
): string[] {
  return arquivos.flatMap((arquivo) =>
    detector(readFileSync(arquivo, "utf8")).map(
      (achado) => `${relativo(arquivo)}:${achado}`,
    ),
  );
}

const foraDaCamada = () =>
  listarCodigo(SRC).filter(
    (arquivo) => !arquivo.startsWith(CAMADA_DE_CONTEUDO + path.sep),
  );

describe("regra do repositório", () => {
  it("os detectores acham os casos positivos e ignoram os negativos", () => {
    // fs: positivos
    for (const codigo of [
      'import { readFileSync } from "fs";',
      "import fs from 'node:fs';",
      'import { readFile } from "fs/promises";',
      'import * as fsp from "node:fs/promises";',
      'const fs = require("fs");',
      'const fs = await import("node:fs");',
      'import "node:fs";',
    ]) {
      expect(encontrarImportsDeFs(codigo), codigo).toHaveLength(1);
    }
    // fs: negativos
    for (const codigo of [
      'import { x } from "./fs-utils";',
      'import { y } from "fsevents";',
      'const texto = "fs";',
      'import { getRepository } from "@/lib/content";',
    ]) {
      expect(encontrarImportsDeFs(codigo), codigo).toEqual([]);
    }

    // content/: positivos
    for (const codigo of [
      'path.join(process.cwd(), "content")',
      'readFileSync("content/materias/a.md")',
      "const p = './content/tags.json';",
      'const q = "../content";',
      "const r = `content/${slug}.md`;",
    ]) {
      expect(encontrarCaminhosParaContent(codigo), codigo).toHaveLength(1);
    }
    // content/: negativos
    for (const codigo of [
      'import { getRepository } from "@/lib/content";',
      'const x = "contentDir";',
      '<meta name="x" content="y" />',
      'const t = "conteúdo";',
      'href="#conteudo"',
    ]) {
      expect(encontrarCaminhosParaContent(codigo), codigo).toEqual([]);
    }

    // literais
    expect(encontrarLiterais('const e = "analise";', ["analise"])).toHaveLength(
      1,
    );
    expect(encontrarLiterais("const e = 'analise';", ["analise"])).toHaveLength(
      1,
    );
    expect(encontrarLiterais('const e = "analises";', ["analise"])).toEqual([]);
    expect(encontrarLiterais("// analise", ["analise"])).toEqual([]);
  });

  it("nenhum arquivo fora de src/lib/content importa fs", () => {
    expect(achadosEm(foraDaCamada(), encontrarImportsDeFs)).toEqual([]);
  });

  it("dentro de src/lib/content, só file-repository.ts importa fs", () => {
    const comFs = listarCodigo(CAMADA_DE_CONTEUDO)
      .filter(
        (arquivo) =>
          encontrarImportsDeFs(readFileSync(arquivo, "utf8")).length > 0,
      )
      .map(relativo);
    expect(comFs).toEqual(["src/lib/content/file-repository.ts"]);
  });

  it("nenhum arquivo fora de src/lib/content monta caminho para content/", () => {
    expect(achadosEm(foraDaCamada(), encontrarCaminhosParaContent)).toEqual([]);
  });

  it("src/lib/content não repete os slugs de editoria", () => {
    expect(
      achadosEm(listarCodigo(CAMADA_DE_CONTEUDO), (codigo) =>
        encontrarLiterais(codigo, SLUGS_DE_EDITORIA),
      ),
    ).toEqual([]);
  });

  it("src/lib/content não cria Date (datas são texto AAAA-MM-DD)", () => {
    expect(
      achadosEm(listarCodigo(CAMADA_DE_CONTEUDO), (codigo) =>
        codigo
          .split("\n")
          .flatMap((linha, i) =>
            /\bnew Date\b|\bDate\.(?:now|parse|UTC)\b/.test(linha)
              ? [`${i + 1}: ${linha.trim()}`]
              : [],
          ),
      ),
    ).toEqual([]);
  });

  it("nenhum script, teste ou código cita supabase/migrations", () => {
    const pacote = readFileSync(path.join(RAIZ, "package.json"), "utf8");
    expect(pacote).not.toMatch(/supabase/i);
    expect(
      achadosEm(listarCodigo(SRC), (codigo) =>
        /supabase\/migrations/.test(codigo) ? ["cita supabase/migrations"] : [],
      ),
    ).toEqual([]);
  });
});
