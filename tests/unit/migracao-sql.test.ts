/**
 * Conferência estática da migração das matérias (roda sem Docker, em `pnpm test`).
 * O comportamento de verdade é testado no banco em tests/db (`pnpm test:db`).
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SLUGS_DE_EDITORIA } from "@/lib/editorias";

const PASTA = path.resolve(__dirname, "../../supabase/migrations");
const ARQUIVOS = readdirSync(PASTA).filter((nome) => nome.endsWith(".sql"));
const MIGRACAO = ARQUIVOS.find((nome) => /^\d{14}_articles\.sql$/.test(nome));

const SQL = MIGRACAO ? readFileSync(path.join(PASTA, MIGRACAO), "utf8") : "";

/** SQL sem comentários de linha, em minúsculas e com espaços colapsados. */
const CODIGO = SQL.replace(/--.*$/gm, "").toLowerCase().replace(/\s+/g, " ");

describe("migração das matérias (supabase/migrations/<timestamp>_articles.sql)", () => {
  it("existe com timestamp, e o rascunho 0001_articles.sql foi apagado", () => {
    expect(MIGRACAO).toBeDefined();
    expect(ARQUIVOS).not.toContain("0001_articles.sql");
  });

  it("o check de editoria espelha src/lib/editorias.ts, na mesma ordem", () => {
    const check =
      /editoria text not null check \(editoria in \(([^)]*)\)\)/.exec(CODIGO);
    expect(check).not.toBeNull();
    const slugs = [...check![1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
    expect(slugs).toEqual([...SLUGS_DE_EDITORIA]);
  });

  it('slug em collate "C" nas matérias e nas tags', () => {
    expect(CODIGO).toContain('slug text collate "c" not null unique');
    expect(CODIGO).toContain('slug text collate "c" primary key');
  });

  it("a constraint de origem é a da spec v2", () => {
    expect(CODIGO).toContain(
      "constraint articles_origem_ck check (ficticio or fonte <> 'squad' or coalesce(btrim(origem), '') <> '')",
    );
  });

  it("revisões com unique (article_id, numero)", () => {
    expect(CODIGO).toContain("create table public.article_revisions");
    expect(CODIGO).toContain("unique (article_id, numero)");
  });

  it("a busca é por strpos (substring literal), nunca por ilike/like", () => {
    expect(CODIGO).toContain(
      "create function public.buscar_artigos(termos text[])",
    );
    expect(CODIGO).toContain("security invoker");
    expect(CODIGO).toMatch(/strpos\(a\.busca_normalizada, t\.termo\) = 0/);
    expect(CODIGO).not.toMatch(/\bi?like\b/);
  });

  it("as funções internas da busca não ficam abertas a anon e authenticated", () => {
    expect(CODIGO).toContain(
      "revoke execute on function public.normalizar_busca(text) from public, anon, authenticated",
    );
    expect(CODIGO).toContain(
      "revoke execute on function public.calcular_busca_normalizada(text, text, text[], text) from public, anon, authenticated",
    );
    expect(CODIGO).not.toMatch(
      /revoke execute on function public\.buscar_artigos/,
    );
  });

  it("normalizar_busca é immutable", () => {
    expect(CODIGO).toMatch(
      /create function public\.normalizar_busca\(texto text\) returns text language sql immutable/,
    );
  });

  it("RLS ligado nas três tabelas e só políticas de leitura", () => {
    for (const tabela of ["articles", "article_revisions", "tags"]) {
      expect(CODIGO).toContain(
        `alter table public.${tabela} enable row level security`,
      );
    }
    const politicas = [
      ...CODIGO.matchAll(/create policy "[^"]+" on public\.(\w+) for (\w+)/g),
    ].map((m) => `${m[1]}:${m[2]}`);
    expect(politicas).toEqual(["articles:select", "tags:select"]);
    expect(CODIGO).toContain("using (status = 'publicado')");
  });
});
