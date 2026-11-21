/**
 * `pnpm db:vault [--prod] [--sim] [--url <base>]`
 *
 * Grava no Vault do Supabase a URL do webhook de invalidação (`<base>/api/revalidar`) e o
 * segredo (`REVALIDATE_SECRET`). A base padrão é o `SITE_URL` do arquivo de ambiente.
 * Sem `--prod`, o destino é o Supabase local do `.env.local`. Ver scripts/lib/vault.ts.
 */
import { createClient } from "@supabase/supabase-js";
import { carregarAmbiente } from "./lib/ambiente";
import { executarConfigurarVault } from "./lib/vault";

executarConfigurarVault(process.argv.slice(2), {
  carregarAmbiente: (opcoes) => carregarAmbiente(opcoes),
  // service_role: só ela executa public.configurar_revalidacao. Nunca no site.
  criarCliente: (ambiente) =>
    createClient(ambiente.url, ambiente.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
  escrever: (linha) => console.log(linha),
}).catch((erro: unknown) => {
  console.error(erro instanceof Error ? erro.message : erro);
  process.exit(1);
});
