/**
 * Ao fim do `pnpm test:db`, o banco local volta a ser igual ao `content/` real: limpa as
 * três tabelas (os testes deixam linhas próprias, como as do rls-leitura) e reimporta
 * com o mesmo importador do `pnpm db:importar`.
 *
 * Roda depois do global-setup (ordem do `globalSetup` no vitest.config.ts), que fornece
 * URL e chaves do Supabase local. A função devolvida é o teardown.
 */
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import type { TestProject } from "vitest/node";
import { importarConteudo } from "../../scripts/lib/importacao";
import { limparBanco } from "./helpers/limpar-banco";

const CONTENT = path.resolve(__dirname, "../../content");

export default function setup(project: TestProject): () => Promise<void> {
  const { url, serviceRoleKey } = project.getProvidedContext().supabaseLocal;
  return async () => {
    const servico = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    await limparBanco(servico);
    const { materias } = await importarConteudo(servico, CONTENT, () => {});
    console.log(
      `[test:db] banco local restaurado com o content/ real (${materias.inseridas.length} matérias).`,
    );
  };
}
