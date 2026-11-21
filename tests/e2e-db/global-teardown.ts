/**
 * Fim do `pnpm test:e2e:db`: o banco local volta a ser igual ao `content/` real (o mesmo
 * passo do `tests/db/global-teardown.ts`), e o Vault fica sem a URL do teste, para o
 * webhook não chamar uma porta que já fechou.
 */
import path from "node:path";
import { importarConteudo } from "../../scripts/lib/importacao";
import { limparBanco } from "../db/helpers/limpar-banco";
import { clienteDeServico } from "./supabase-local";

const CONTENT = path.resolve(__dirname, "../../content");

export default async function teardown(): Promise<void> {
  const servico = clienteDeServico();
  const { error } = await servico.rpc("remover_revalidacao");
  if (error) throw new Error(`remover_revalidacao: ${error.message}`);
  await limparBanco(servico);
  const { materias } = await importarConteudo(servico, CONTENT, () => {});
  console.log(
    `[test:e2e:db] banco local restaurado com o content/ real (${materias.inseridas.length} matérias).`,
  );
}
