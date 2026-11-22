/**
 * Conferência estática da migração da história 18 (roda sem Docker, em `pnpm test`). O
 * comportamento de verdade está em tests/db/editor.test.ts.
 *
 * A migração vai para a produção, que já tem matérias: ela só cria uma função nova e não
 * apaga, trunca nem altera dado nenhum (critério 2, "não destrutiva").
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const PASTA = path.resolve(__dirname, "../../supabase/migrations");
const ARQUIVO = readdirSync(PASTA).find((nome) =>
  /^\d{14}_criar_materia\.sql$/.test(nome),
);
const SQL = ARQUIVO ? readFileSync(path.join(PASTA, ARQUIVO), "utf8") : "";
const CODIGO = SQL.replace(/--.*$/gm, "").toLowerCase().replace(/\s+/g, " ");

function cabecalho(): string {
  const inicio = CODIGO.indexOf("function public.criar_materia(");
  expect(inicio).toBeGreaterThan(-1);
  return CODIGO.slice(inicio, CODIGO.indexOf("$$", inicio));
}

function corpo(): string {
  const inicio = CODIGO.indexOf(
    "$$",
    CODIGO.indexOf("function public.criar_materia("),
  );
  return CODIGO.slice(inicio + 2, CODIGO.indexOf("$$", inicio + 2));
}

describe("migração do editor (supabase/migrations/<timestamp>_criar_materia.sql)", () => {
  it("existe, com timestamp depois da migração do painel", () => {
    expect(ARQUIVO).toBeDefined();
    const painel = readdirSync(PASTA).find((n) => n.endsWith("_painel.sql"));
    expect(ARQUIVO! > painel!).toBe(true);
  });

  it("não é destrutiva: nada de drop, truncate, delete, alter, update ou insert fora da função", () => {
    expect(CODIGO).not.toMatch(/\bdrop\b/);
    expect(CODIGO).not.toMatch(/\btruncate\b/);
    expect(CODIGO).not.toMatch(/\bdelete\b/);
    expect(CODIGO).not.toMatch(/\balter\b/);
    expect(CODIGO).not.toMatch(/\bupdate\b/);
    expect(CODIGO).not.toMatch(/create or replace/);
    const foraDoCorpo = CODIGO.replace(/\$\$.*?\$\$/g, "");
    expect(foraDoCorpo).not.toMatch(/\binsert\b/);
  });

  it("a assinatura é a da história, security definer com search_path vazio", () => {
    expect(CODIGO).toContain(
      "create function public.criar_materia(campos jsonb) returns uuid",
    );
    expect(cabecalho()).toContain("security definer");
    expect(cabecalho()).toContain("set search_path = ''");
  });

  it("a primeira instrução é a checagem de admin (service_role ou eh_admin), com 42501", () => {
    const c = corpo();
    expect(c.slice(c.indexOf(" begin ") + 7).trim()).toMatch(
      /^if auth\.role\(\) is distinct from 'service_role' and not public\.eh_admin\(\) then raise exception/,
    );
    expect(c).toContain("errcode = '42501'");
  });

  it("grava rascunho do painel, sem origem, com a revisão 1 assinada por auth.uid()", () => {
    const c = corpo();
    expect(c).toContain("'rascunho', 'painel', null, null, 1");
    expect(c).toContain("auth.uid(), 'painel'");
    expect(c).toContain("america/sao_paulo");
    expect(c).toContain("hint = 'slug_ja_existe'");
    expect(c).toContain("when unique_violation then");
  });

  it("execute para authenticated e service_role; o anon fica fora", () => {
    expect(CODIGO).toContain(
      "revoke execute on function public.criar_materia(jsonb) from public, anon;",
    );
    expect(CODIGO).toContain(
      "grant execute on function public.criar_materia(jsonb) to authenticated, service_role;",
    );
    expect(CODIGO).not.toMatch(/grant [^;]* to [^;]*\banon\b/);
  });
});
