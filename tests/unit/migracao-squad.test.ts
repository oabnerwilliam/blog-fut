/**
 * Conferência estática da migração da história 15 (roda sem Docker, em `pnpm test`). O
 * comportamento de verdade está em tests/db/materia-enviar.test.ts e webhook.test.ts.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const PASTA = path.resolve(__dirname, "../../supabase/migrations");
const ARQUIVO = readdirSync(PASTA).find((nome) =>
  /^\d{14}_squad_no_banco\.sql$/.test(nome),
);
const SQL = ARQUIVO ? readFileSync(path.join(PASTA, ARQUIVO), "utf8") : "";
const CODIGO = SQL.replace(/--.*$/gm, "").toLowerCase().replace(/\s+/g, " ");

function cabecalhoDa(nome: string): string {
  const inicio = CODIGO.indexOf(`function public.${nome}(`);
  expect(inicio, nome).toBeGreaterThan(-1);
  return CODIGO.slice(inicio, CODIGO.indexOf("$$", inicio));
}

/** Corpo entre o primeiro par de `$$` da função. */
function corpoDa(nome: string): string {
  const inicio = CODIGO.indexOf(`function public.${nome}(`);
  const abre = CODIGO.indexOf("$$", inicio);
  return CODIGO.slice(abre, CODIGO.indexOf("$$", abre + 2));
}

describe("migração do squad no banco (supabase/migrations/<timestamp>_squad_no_banco.sql)", () => {
  it("existe, com timestamp depois da migração do webhook", () => {
    expect(ARQUIVO).toBeDefined();
    const webhook = readdirSync(PASTA).find((n) =>
      n.endsWith("_webhook_revalidar.sql"),
    );
    expect(ARQUIVO! > webhook!).toBe(true);
  });

  it.each([
    "enviar_materia_do_squad",
    "publicar_revisao",
    "avisar_revalidacao",
  ])("%s: security definer com search_path vazio", (nome) => {
    const cabecalho = cabecalhoDa(nome);
    expect(cabecalho).toContain("security definer");
    expect(cabecalho).toContain("set search_path = ''");
  });

  it("as assinaturas são as da história", () => {
    expect(CODIGO).toContain(
      "create function public.enviar_materia_do_squad(dados jsonb) returns uuid",
    );
    expect(CODIGO).toContain(
      "create function public.publicar_revisao(p_article_id uuid) returns void",
    );
    expect(CODIGO).toContain(
      "create or replace function public.avisar_revalidacao()",
    );
  });

  it("execute só para a service_role", () => {
    for (const assinatura of [
      "enviar_materia_do_squad(jsonb)",
      "publicar_revisao(uuid)",
    ]) {
      expect(CODIGO).toContain(
        `revoke execute on function public.${assinatura} from public, anon, authenticated`,
      );
      expect(CODIGO).toContain(
        `grant execute on function public.${assinatura} to service_role`,
      );
    }
    expect(CODIGO).not.toMatch(
      /grant execute on function [^;]* to [^;]*\b(anon|authenticated)\b/,
    );
  });

  it("o envio grava rascunho do squad, sem revisão publicada, com a revisão 1", () => {
    const corpo = corpoDa("enviar_materia_do_squad");
    expect(corpo).toContain("'rascunho'");
    expect(corpo).toContain("'squad'");
    expect(corpo).toContain("insert into public.article_revisions");
    expect(corpo).toContain("on conflict (slug) do nothing");
  });

  it("deixa marcado o ponto que a história 16 abre para o admin", () => {
    const comentarios = SQL.split("\n")
      .filter((linha) => linha.trim().startsWith("--"))
      .join("\n");
    expect(comentarios).toMatch(/História 16/);
    expect(comentarios).toContain("public.eh_admin()");
  });

  it("o webhook só avisa matéria publicada (antes ou depois)", () => {
    const corpo = corpoDa("avisar_revalidacao");
    expect(corpo).toContain("tg_table_name = 'articles'");
    expect(corpo).toContain("'publicado'");
    expect(CODIGO).toContain(
      "revoke execute on function public.avisar_revalidacao() from public, anon, authenticated",
    );
  });

  it("nenhuma URL nem segredo fixo no SQL", () => {
    expect(SQL).not.toMatch(/https?:\/\/[a-z0-9]/i);
  });
});
