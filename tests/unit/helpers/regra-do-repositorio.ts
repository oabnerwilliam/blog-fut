/**
 * Detectores só de teste da regra do repositório (CLAUDE.md).
 * Não são usados pelo app.
 */
import { readdirSync } from "node:fs";
import path from "node:path";

/** `from "fs"`, `import "node:fs"`, `import("fs/promises")`, `require("node:fs/promises")`… */
const IMPORT_DE_FS =
  /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)(["'`])(?:node:)?fs(?:\/promises)?\1/;

/** Um literal que começa por `content/` (ou `./content`, `../content`) ou é só `"content"`. Não pega `@/lib/content`. */
const CAMINHO_PARA_CONTENT = /(["'`])(?:\.{1,2}\/)*content(?:\/|\1)/;

function linhasQueCasam(codigo: string, regex: RegExp): string[] {
  return codigo
    .split("\n")
    .flatMap((linha, i) =>
      regex.test(linha) ? [`${i + 1}: ${linha.trim()}`] : [],
    );
}

export function encontrarImportsDeFs(codigo: string): string[] {
  return linhasQueCasam(codigo, IMPORT_DE_FS);
}

/** `from "@supabase/supabase-js"`, `import("@supabase/ssr")`, `require("@supabase/...")`. */
const IMPORT_DO_SUPABASE =
  /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)(["'`])@supabase\/[^"'`]+\1/;

export function encontrarImportsDoSupabase(codigo: string): string[] {
  return linhasQueCasam(codigo, IMPORT_DO_SUPABASE);
}

/** Import de um módulo exato ou de um caminho abaixo dele (`@/lib/auth` pega `@/lib/auth/config`). */
export function encontrarImportsDoModulo(
  codigo: string,
  modulo: string,
): string[] {
  const escapado = modulo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return linhasQueCasam(
    codigo,
    new RegExp(
      `(?:\\bfrom\\s*|\\bimport\\s*\\(?\\s*|\\brequire\\s*\\(\\s*)(["'\`])${escapado}(?:/[^"'\`]*)?\\1`,
    ),
  );
}

export function encontrarCaminhosParaContent(codigo: string): string[] {
  return linhasQueCasam(codigo, CAMINHO_PARA_CONTENT);
}

/** Literais de texto ("x", 'x' ou `x`) exatamente iguais a algum dos valores. */
export function encontrarLiterais(
  codigo: string,
  valores: readonly string[],
): string[] {
  const alternativas = valores
    .map((v) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  return linhasQueCasam(codigo, new RegExp(`(["'\`])(?:${alternativas})\\1`));
}

/** Arquivos .ts/.tsx/.mts/.js/.mjs abaixo de `dir`, recursivamente. */
export function listarCodigo(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const caminho = path.join(dir, e.name);
    if (e.isDirectory()) return listarCodigo(caminho);
    return /\.(ts|tsx|mts|js|mjs)$/.test(e.name) ? [caminho] : [];
  });
}
