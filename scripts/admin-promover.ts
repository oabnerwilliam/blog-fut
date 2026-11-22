/**
 * `pnpm admin:promover <email> [--prod] [--sim]`
 *
 * Torna admin (`aprovado`) o perfil com esse e-mail. A pessoa precisa ter entrado uma vez
 * em `/admin/entrar` antes. Sem `--prod`, o destino é o Supabase local do `.env.local`.
 * Ver scripts/lib/admin.ts e docs/adr/0009-autorizacao-perfis-rls.md.
 */
import { carregarAmbiente } from "./lib/ambiente";
import { executarPromoverAdmin } from "./lib/admin";
import { criarClienteDeServico, executarCli } from "./lib/cli";

executarCli(() =>
  executarPromoverAdmin(process.argv.slice(2), {
    carregarAmbiente: (opcoes) => carregarAmbiente(opcoes),
    criarCliente: criarClienteDeServico,
    escrever: (linha) => console.log(linha),
  }),
);
