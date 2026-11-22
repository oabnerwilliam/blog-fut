/**
 * Conferência estática da migração da história 17 (roda sem Docker, em `pnpm test`). O
 * comportamento de verdade está em tests/db/painel.test.ts e tests/db/rls-admin.test.ts.
 *
 * A migração vai para a produção, que já tem matérias: ela não pode apagar nem truncar
 * dado nenhum (critério 1, "não destrutiva").
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const PASTA = path.resolve(__dirname, "../../supabase/migrations");
const ARQUIVO = readdirSync(PASTA).find((nome) =>
  /^\d{14}_painel\.sql$/.test(nome),
);
const SQL = ARQUIVO ? readFileSync(path.join(PASTA, ARQUIVO), "utf8") : "";
const CODIGO = SQL.replace(/--.*$/gm, "").toLowerCase().replace(/\s+/g, " ");

const FUNCOES = [
  "publicar_revisao",
  "despublicar_materia",
  "salvar_revisao",
] as const;

function cabecalhoDa(nome: string): string {
  const inicio = CODIGO.indexOf(`function public.${nome}(`);
  expect(inicio, nome).toBeGreaterThan(-1);
  return CODIGO.slice(inicio, CODIGO.indexOf("$$", inicio));
}

function corpoDa(nome: string): string {
  const inicio = CODIGO.indexOf(
    "$$",
    CODIGO.indexOf(`function public.${nome}(`),
  );
  return CODIGO.slice(inicio + 2, CODIGO.indexOf("$$", inicio + 2));
}

describe("migração do painel (supabase/migrations/<timestamp>_painel.sql)", () => {
  it("existe, com timestamp depois da migração dos perfis", () => {
    expect(ARQUIVO).toBeDefined();
    const perfis = readdirSync(PASTA).find((n) => n.endsWith("_perfis.sql"));
    expect(ARQUIVO! > perfis!).toBe(true);
  });

  it("não é destrutiva: nada de drop, truncate, delete, alter table ou update fora das funções", () => {
    expect(CODIGO).not.toMatch(/\bdrop\b/);
    expect(CODIGO).not.toMatch(/\btruncate\b/);
    expect(CODIGO).not.toMatch(/\bdelete from\b/);
    expect(CODIGO).not.toMatch(/\balter table\b/);
    // Os únicos updates estão dentro dos corpos das funções.
    const foraDosCorpos = CODIGO.replace(/\$\$.*?\$\$/g, "");
    expect(foraDosCorpos).not.toMatch(/\bupdate\b/);
    expect(foraDosCorpos).not.toMatch(/\binsert\b/);
  });

  it("as assinaturas são as da história; publicar_revisao é trocada, não recriada", () => {
    expect(CODIGO).toContain(
      "create or replace function public.publicar_revisao(p_article_id uuid) returns void",
    );
    expect(CODIGO).toContain(
      "create function public.despublicar_materia(p_article_id uuid) returns void",
    );
    expect(CODIGO).toContain(
      "create function public.salvar_revisao(p_article_id uuid, campos jsonb) returns integer",
    );
  });

  it.each(FUNCOES)("%s: security definer com search_path vazio", (nome) => {
    const cabecalho = cabecalhoDa(nome);
    expect(cabecalho).toContain("security definer");
    expect(cabecalho).toContain("set search_path = ''");
  });

  it.each(FUNCOES)(
    "%s: a primeira instrução é a checagem de admin (service_role ou eh_admin)",
    (nome) => {
      const corpo = corpoDa(nome);
      const primeira = corpo.slice(corpo.indexOf(" begin ") + 7).trim();
      expect(primeira).toMatch(
        /^if auth\.role\(\) is distinct from 'service_role' and not public\.eh_admin\(\) then raise exception/,
      );
      expect(corpo).toContain("errcode = '42501'");
    },
  );

  it("execute para authenticated e service_role; o anon continua fora", () => {
    for (const assinatura of [
      "publicar_revisao(uuid)",
      "despublicar_materia(uuid)",
      "salvar_revisao(uuid, jsonb)",
    ]) {
      expect(CODIGO).toContain(
        `revoke execute on function public.${assinatura} from public, anon;`,
      );
      expect(CODIGO).toContain(
        `grant execute on function public.${assinatura} to authenticated, service_role;`,
      );
    }
    expect(CODIGO).not.toMatch(/grant [^;]* to [^;]*\banon\b/);
  });

  it("salvar_revisao grava a revisão do painel assinada por auth.uid() e muda só revisao_em_edicao", () => {
    const corpo = corpoDa("salvar_revisao");
    expect(corpo).toContain("for update");
    expect(corpo).toContain("coalesce(max(r.numero), 0) + 1");
    expect(corpo).toContain("auth.uid(), 'painel'");
    expect(corpo).toContain("when unique_violation then");
    const updates = corpo.match(/update public\.articles a set [^;]*;/g) ?? [];
    expect(updates).toEqual([
      "update public.articles a set revisao_em_edicao = v_numero where a.id = p_article_id;",
    ]);
  });

  it("despublicar_materia só muda o status (revisao_publicada fica)", () => {
    const updates =
      corpoDa("despublicar_materia").match(
        /update public\.articles a set [^;]*;/g,
      ) ?? [];
    expect(updates).toHaveLength(1);
    expect(updates[0]).toContain("set status = 'rascunho'");
    expect(updates[0]).not.toContain("revisao_publicada");
  });

  it("nenhuma função mexe em article_revisions além do insert", () => {
    expect(CODIGO).not.toMatch(/update public\.article_revisions/);
  });
});
