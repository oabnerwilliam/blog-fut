/**
 * `pnpm materia:enviar <slug> [--prod] [--sim]`
 *
 * Envia `content/entrada/<slug>.md` ao banco como rascunho (fonte squad, revisão 1 com o
 * corpo literal) e move o arquivo para `content/entrada/enviadas/`. Sem `--prod`, o
 * destino é o Supabase local do `.env.local`. Ver scripts/lib/materias.ts.
 */
import path from "node:path";
import { carregarAmbiente } from "./lib/ambiente";
import { criarClienteDeServico, executarCli } from "./lib/cli";
import { executarEnviarMateria } from "./lib/materias";

executarCli(() =>
  executarEnviarMateria(process.argv.slice(2), {
    carregarAmbiente: (opcoes) => carregarAmbiente(opcoes),
    criarCliente: criarClienteDeServico,
    escrever: (linha) => console.log(linha),
    entrada: path.resolve("content", "entrada"),
  }),
);
