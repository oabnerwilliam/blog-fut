/**
 * Conferência estática da migração da história 16 (roda sem Docker, em `pnpm test`). O
 * comportamento de verdade está em tests/db/rls-admin.test.ts.
 *
 * A migração vai para a produção, que já tem matérias: ela não pode apagar nem truncar
 * dado nenhum (critério 2, "não destrutiva").
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const PASTA = path.resolve(__dirname, "../../supabase/migrations");
const ARQUIVO = readdirSync(PASTA).find((nome) =>
  /^\d{14}_perfis\.sql$/.test(nome),
);
const SQL = ARQUIVO ? readFileSync(path.join(PASTA, ARQUIVO), "utf8") : "";
const CODIGO = SQL.replace(/--.*$/gm, "").toLowerCase().replace(/\s+/g, " ");

function cabecalhoDa(nome: string): string {
  const inicio = CODIGO.indexOf(`function public.${nome}(`);
  expect(inicio, nome).toBeGreaterThan(-1);
  return CODIGO.slice(inicio, CODIGO.indexOf("$$", inicio));
}

describe("migração dos perfis (supabase/migrations/<timestamp>_perfis.sql)", () => {
  it("existe, com timestamp depois da migração do squad", () => {
    expect(ARQUIVO).toBeDefined();
    const squad = readdirSync(PASTA).find((n) =>
      n.endsWith("_squad_no_banco.sql"),
    );
    expect(ARQUIVO! > squad!).toBe(true);
  });

  it("não é destrutiva: nada de drop table, truncate, delete ou alter column", () => {
    expect(CODIGO).not.toMatch(/\bdrop table\b/);
    expect(CODIGO).not.toMatch(/\btruncate\b/);
    expect(CODIGO).not.toMatch(/\bdelete from\b/);
    expect(CODIGO).not.toMatch(/\bdrop column\b/);
    expect(CODIGO).not.toMatch(/\balter column\b/);
    // A única coisa removida é a política antiga de leitura das tags (trocada por outra).
    const drops = CODIGO.match(/\bdrop \w+[^;]*;/g) ?? [];
    expect(drops).toEqual([
      'drop policy "leitura pública das tags" on public.tags;',
    ]);
  });

  it("perfis: colunas, check do status, padrões e FK com cascade", () => {
    expect(CODIGO).toContain("create table public.perfis (");
    expect(CODIGO).toMatch(
      /user_id uuid primary key references auth\.users \(id\) on delete cascade/,
    );
    expect(CODIGO).toMatch(
      /status text not null default 'pendente' check \(status in \('pendente', 'aprovado', 'recusado', 'revogado'\)\)/,
    );
    expect(CODIGO).toMatch(/papel text not null default 'admin'/);
    for (const coluna of [
      "email",
      "nome",
      "avatar_url",
      "decidido_por",
      "decidido_em",
      "created_at",
    ]) {
      expect(CODIGO, coluna).toMatch(new RegExp(`\\b${coluna} \\w+`));
    }
  });

  it.each(["eh_admin", "criar_perfil_do_usuario"])(
    "%s: security definer com search_path vazio",
    (nome) => {
      const cabecalho = cabecalhoDa(nome);
      expect(cabecalho).toContain("security definer");
      expect(cabecalho).toContain("set search_path = ''");
    },
  );

  it("eh_admin é stable e só authenticated executa", () => {
    expect(cabecalhoDa("eh_admin")).toContain("stable");
    expect(CODIGO).toContain(
      "revoke execute on function public.eh_admin() from public, anon",
    );
    expect(CODIGO).toContain(
      "grant execute on function public.eh_admin() to authenticated",
    );
  });

  it("o trigger roda depois de inserir em auth.users", () => {
    expect(CODIGO).toMatch(
      /create trigger \w+ after insert on auth\.users for each row execute function public\.criar_perfil_do_usuario\(\)/,
    );
    expect(CODIGO).toContain(
      "revoke execute on function public.criar_perfil_do_usuario() from public, anon, authenticated",
    );
  });

  it("RLS ligado em perfis, e a política de update exclui o próprio usuário", () => {
    expect(CODIGO).toContain(
      "alter table public.perfis enable row level security",
    );
    expect(CODIGO).toMatch(
      /on public\.perfis for update to authenticated using \([^;]*user_id <> \(select auth\.uid\(\)\)/,
    );
  });

  it("nenhuma política de update ou delete em article_revisions", () => {
    expect(CODIGO).not.toMatch(
      /on public\.article_revisions for (update|delete|all)\b/,
    );
    expect(CODIGO).not.toMatch(
      /grant [^;]*\b(update|delete)\b[^;]* on table public\.article_revisions/,
    );
  });

  it("grants mínimos para authenticated; o anon não ganha nada", () => {
    expect(CODIGO).toContain(
      "revoke all on table public.articles, public.article_revisions, public.tags, public.perfis from authenticated",
    );
    expect(CODIGO).toContain(
      "grant select, insert, update on table public.articles to authenticated",
    );
    expect(CODIGO).toContain(
      "grant select, insert on table public.article_revisions to authenticated",
    );
    expect(CODIGO).toContain(
      "grant select on table public.tags to authenticated",
    );
    expect(CODIGO).toContain(
      "grant update (status, decidido_por, decidido_em) on table public.perfis to authenticated",
    );
    expect(CODIGO).not.toMatch(/grant [^;]* to [^;]*\banon\b/);
    expect(CODIGO).toContain("revoke all on table public.perfis from anon");
  });
});
