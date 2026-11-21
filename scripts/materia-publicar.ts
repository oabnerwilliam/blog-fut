/**
 * `pnpm materia:publicar <slug> [--prod] [--sim]`
 *
 * Publica a revisão em edição da matéria (`public.publicar_revisao`). O webhook do banco
 * avisa o site, que invalida o cache. Rode só quando o usuário pedir a publicação.
 * Sem `--prod`, o destino é o Supabase local do `.env.local`. Ver scripts/lib/materias.ts.
 */
import path from "node:path";
import { carregarAmbiente } from "./lib/ambiente";
import { criarClienteDeServico, executarCli } from "./lib/cli";
import { executarPublicarMateria } from "./lib/materias";

executarCli(() =>
  executarPublicarMateria(process.argv.slice(2), {
    carregarAmbiente: (opcoes) => carregarAmbiente(opcoes),
    criarCliente: criarClienteDeServico,
    escrever: (linha) => console.log(linha),
    entrada: path.resolve("content", "entrada"),
  }),
);
