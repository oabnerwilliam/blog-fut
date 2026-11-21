/**
 * Conferência estática da migração do webhook (roda sem Docker, em `pnpm test`). O
 * comportamento de verdade está em tests/db/webhook.test.ts e no `pnpm test:e2e:db`.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const PASTA = path.resolve(__dirname, "../../supabase/migrations");
const ARQUIVO = readdirSync(PASTA).find((nome) =>
  /^\d{14}_webhook_revalidar\.sql$/.test(nome),
);
const SQL = ARQUIVO ? readFileSync(path.join(PASTA, ARQUIVO), "utf8") : "";
const CODIGO = SQL.replace(/--.*$/gm, "").toLowerCase().replace(/\s+/g, " ");

/** Corpo de uma função `create function public.<nome>(...) ... $$ ... $$`. */
function cabecalhoDa(nome: string): string {
  const inicio = CODIGO.indexOf(`create function public.${nome}(`);
  expect(inicio, nome).toBeGreaterThan(-1);
  return CODIGO.slice(inicio, CODIGO.indexOf("$$", inicio));
}

describe("migração do webhook (supabase/migrations/<timestamp>_webhook_revalidar.sql)", () => {
  it("existe, com timestamp depois da migração das matérias", () => {
    expect(ARQUIVO).toBeDefined();
    const articles = readdirSync(PASTA).find((n) =>
      n.endsWith("_articles.sql"),
    );
    expect(ARQUIVO! > articles!).toBe(true);
  });

  it("cria o pg_net", () => {
    expect(CODIGO).toContain("create extension if not exists pg_net");
  });

  it.each([
    "avisar_revalidacao",
    "configurar_revalidacao",
    "remover_revalidacao",
  ])("%s: security definer com search_path vazio", (nome) => {
    const cabecalho = cabecalhoDa(nome);
    expect(cabecalho).toContain("security definer");
    expect(cabecalho).toContain("set search_path = ''");
  });

  it("o trigger lê a URL e o segredo do Vault e chama net.http_post com o header", () => {
    expect(CODIGO).toContain("from vault.decrypted_secrets");
    expect(CODIGO).toContain("'url_revalidar'");
    expect(CODIGO).toContain("'segredo_revalidar'");
    expect(CODIGO).toContain("net.http_post(");
    expect(CODIGO).toContain("'x-revalidate-secret', v_segredo");
  });

  it("triggers after insert or update or delete em articles e tags", () => {
    for (const tabela of ["articles", "tags"]) {
      expect(CODIGO).toContain(
        `after insert or update or delete on public.${tabela} for each row execute function public.avisar_revalidacao()`,
      );
    }
  });

  it("revoga o execute de public, anon e authenticated; a configuração é só da service_role", () => {
    for (const assinatura of [
      "avisar_revalidacao()",
      "configurar_revalidacao(text, text)",
      "remover_revalidacao()",
    ]) {
      expect(CODIGO).toContain(
        `revoke execute on function public.${assinatura} from public, anon, authenticated`,
      );
    }
    expect(CODIGO).toContain(
      "grant execute on function public.configurar_revalidacao(text, text) to service_role",
    );
  });

  it("nenhuma URL nem segredo fixo no SQL", () => {
    expect(SQL).not.toMatch(/https?:\/\/[a-z0-9]/i);
    expect(SQL).not.toMatch(/vercel\.app|supabase\.co|localhost|127\.0\.0\.1/);
  });
});
