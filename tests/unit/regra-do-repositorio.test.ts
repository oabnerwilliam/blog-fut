import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SLUGS_DE_EDITORIA } from "@/lib/editorias";
import {
  encontrarCaminhosParaContent,
  encontrarImportsDeFs,
  encontrarImportsDoSupabase,
  encontrarLiterais,
  listarCodigo,
} from "./helpers/regra-do-repositorio";

const RAIZ = path.resolve(__dirname, "../..");
const SRC = path.join(RAIZ, "src");
const CAMADA_DE_CONTEUDO = path.join(SRC, "lib", "content");
const SCRIPTS = path.join(RAIZ, "scripts");

/** Onde o cliente Supabase pode ser importado (plano v2, Restrições globais; história 13). */
const PODEM_IMPORTAR_O_SUPABASE = [
  path.join(CAMADA_DE_CONTEUDO, "supabase"),
  path.join(SRC, "lib", "admin"),
  path.join(SRC, "lib", "auth"),
].map((pasta) => pasta + path.sep);

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

    // supabase: positivos
    for (const codigo of [
      'import { createClient } from "@supabase/supabase-js";',
      "import type { SupabaseClient } from '@supabase/supabase-js';",
      'const m = await import("@supabase/ssr");',
      'const s = require("@supabase/supabase-js");',
    ]) {
      expect(encontrarImportsDoSupabase(codigo), codigo).toHaveLength(1);
    }
    // supabase: negativos
    for (const codigo of [
      'import { x } from "./supabase/repository";',
      'const texto = "@supabase/supabase-js";',
      'import { getRepository } from "@/lib/content";',
    ]) {
      expect(encontrarImportsDoSupabase(codigo), codigo).toEqual([]);
    }
  });

  it("nenhum arquivo fora de src/lib/content importa fs", () => {
    expect(achadosEm(foraDaCamada(), encontrarImportsDeFs)).toEqual([]);
  });

  it("dentro de src/lib/content, só disco.ts importa fs", () => {
    const comFs = listarCodigo(CAMADA_DE_CONTEUDO)
      .filter(
        (arquivo) =>
          encontrarImportsDeFs(readFileSync(arquivo, "utf8")).length > 0,
      )
      .map(relativo);
    expect(comFs).toEqual(["src/lib/content/disco.ts"]);
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

  it("o cliente Supabase só é importado em src/lib/content/supabase, src/lib/admin e src/lib/auth", () => {
    const fora = listarCodigo(SRC).filter(
      (arquivo) =>
        !PODEM_IMPORTAR_O_SUPABASE.some((pasta) => arquivo.startsWith(pasta)),
    );
    expect(achadosEm(fora, encontrarImportsDoSupabase)).toEqual([]);
    // O caso positivo existe: a regra não passa por não achar nada.
    expect(
      achadosEm(listarCodigo(CAMADA_DE_CONTEUDO), encontrarImportsDoSupabase),
    ).not.toEqual([]);
  });

  it("scripts/ pode usar fs e o cliente Supabase (comandos locais)", () => {
    const codigo = listarCodigo(SCRIPTS).map((a) => readFileSync(a, "utf8"));
    expect(codigo.some((c) => encontrarImportsDeFs(c).length > 0)).toBe(true);
    expect(codigo.some((c) => encontrarImportsDoSupabase(c).length > 0)).toBe(
      true,
    );
  });

  it("a service_role nunca aparece em src/ (só em scripts/)", () => {
    expect(
      achadosEm(listarCodigo(SRC), (codigo) =>
        /SERVICE_ROLE|service_role|serviceRole/.test(codigo)
          ? ["cita a service_role"]
          : [],
      ),
    ).toEqual([]);
  });
});
