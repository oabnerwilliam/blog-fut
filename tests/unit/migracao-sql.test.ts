import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SLUGS_DE_EDITORIA } from "@/lib/editorias";

const SQL = readFileSync(
  path.resolve(__dirname, "../../supabase/migrations/0001_articles.sql"),
  "utf8",
);

/** SQL sem comentários de linha, em minúsculas e com espaços colapsados. */
const CODIGO = SQL.replace(/--.*$/gm, "").toLowerCase().replace(/\s+/g, " ");

describe("rascunho da migração Supabase", () => {
  it("o rascunho se declara não executado e cita a spec 6.3", () => {
    const primeiraLinha = SQL.split("\n")[0];
    expect(primeiraLinha).toMatch(/^-- RASCUNHO DE DOCUMENTAÇÃO/);
    expect(primeiraLinha).toMatch(/não é executado na v1/);
    expect(primeiraLinha).toMatch(/spec 6\.3/);
  });

  it("tem as colunas, unique, check de editoria e índice portuguese", () => {
    expect(CODIGO).toContain("create table articles");
    for (const coluna of [
      "id uuid primary key",
      "slug text not null unique",
      "titulo text not null",
      "titulo_seo text",
      "linha_fina text not null",
      "editoria text not null",
      "tags text[] not null",
      "meta_description text",
      "palavras_chave text[] not null default '{}'",
      "publicado_em date not null",
      "autor text not null",
      "ficticio boolean not null",
      "origem text",
      "corpo_md text not null",
      "created_at timestamptz not null default now()",
    ]) {
      expect(CODIGO, coluna).toContain(coluna);
    }
    expect(CODIGO).toMatch(/check \(cardinality\(tags\) >= 1\)/);
    expect(CODIGO).toContain(
      "constraint articles_origem_ck check (ficticio or coalesce(btrim(origem), '') <> '')",
    );
    expect(CODIGO).toMatch(
      /create index articles_busca_idx on articles using gin \(to_tsvector\('portuguese',.*titulo.*linha_fina.*corpo_md.*\)\);/,
    );

    const check =
      /editoria text not null check \(editoria in \(([^)]*)\)\)/.exec(CODIGO);
    expect(check).not.toBeNull();
    const slugs = [...check![1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
    expect(slugs).toEqual([...SLUGS_DE_EDITORIA]);
  });
});
