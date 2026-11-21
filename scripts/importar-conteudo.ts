/**
 * `pnpm db:importar [--prod] [--sim] [--dir <pasta>]`
 *
 * Copia as matérias e as tags de `<pasta>` (padrão: `content/`) para o Supabase.
 * Sem `--prod`, o destino é o Supabase local do `.env.local`. Ver scripts/lib/importacao.ts.
 */
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { carregarAmbiente, lerArgumentos } from "./lib/ambiente";
import { importarConteudo } from "./lib/importacao";

function resumo(rotulo: string, nomes: readonly string[]): string {
  return `  ${rotulo}: ${nomes.length}${nomes.length > 0 ? ` (${nomes.join(", ")})` : ""}`;
}

async function principal(): Promise<void> {
  const { prod, sim, dir } = lerArgumentos(process.argv.slice(2));
  const pasta = path.resolve(dir ?? "content");
  const ambiente = await carregarAmbiente({ prod, sim });
  console.log(`Importando ${pasta} para ${ambiente.host}...`);

  // service_role: grava ignorando o RLS. Só existe em comando local, nunca no site.
  const client = createClient(ambiente.url, ambiente.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { materias, tags } = await importarConteudo(client, pasta);

  console.log("Tags:");
  console.log(resumo("inseridas", tags.inseridas));
  console.log(resumo("atualizadas", tags.atualizadas));
  console.log(resumo("sem mudança", tags.iguais));
  console.log("Matérias:");
  console.log(resumo("inseridas", materias.inseridas));
  console.log(resumo("atualizadas (revisão nova)", materias.atualizadas));
  console.log(resumo("sem mudança", materias.iguais));
}

principal().catch((erro: unknown) => {
  console.error(erro instanceof Error ? erro.message : erro);
  process.exit(1);
});
