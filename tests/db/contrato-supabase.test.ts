import { beforeAll } from "vitest";
import { SupabaseArticleRepository } from "@/lib/content/supabase/repository";
import { importarConteudo } from "../../scripts/lib/importacao";
import {
  FIXTURE_DO_CONTRATO,
  descreverContratoDoRepositorio,
} from "../contract/article-repository.contract";
import {
  clienteAnonimo,
  clienteDeServico,
  limparBanco,
} from "./helpers/supabase-local";

beforeAll(async () => {
  const servico = clienteDeServico();
  await limparBanco(servico);
  await importarConteudo(servico, FIXTURE_DO_CONTRATO, () => {});
});

descreverContratoDoRepositorio(
  "SupabaseArticleRepository",
  ({ mostrarExemplos }) =>
    new SupabaseArticleRepository({
      client: clienteAnonimo(),
      mostrarExemplos,
    }),
);
