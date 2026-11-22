"use server";
import "server-only";
import { refresh, updateTag } from "next/cache";
import { TAG_MATERIAS, tagDaMateria } from "@/lib/content/cache";
import {
  despublicarMateria,
  gravarRevisao,
  listarMaterias,
  publicarRevisao,
  restaurarRevisao as restaurar,
} from "./painel";
import { exigirAdmin } from "./sessao";
import type {
  CamposEditoriaisDeEntrada,
  FiltrosDoPainel,
  MateriaDoPainel,
  ResultadoDoPainel,
} from "./tipos";

/**
 * Server actions do painel de matérias (história 17, critério 3; spec v2 §7.7).
 *
 * Tudo que um arquivo `"use server"` exporta vira um endpoint (guia `server-actions.md`):
 * aqui só ficam as actions, e cada uma começa por `exigirAdmin()`. Os argumentos vêm do
 * navegador e não são confiáveis até o núcleo (`painel.ts`) validar.
 *
 * Cache (doc `updateTag.md`): publicar e despublicar mudam o que o site lê, então expiram
 * na hora as etiquetas da história 14 (`materias` e `materia:<slug>`). O `updateTag` é o
 * das Server Actions: a próxima leitura espera o dado novo, sem servir o velho (o webhook
 * do banco ainda avisa a rota `/api/revalidar`, que usa `revalidateTag`). Salvar e
 * restaurar não mudam o site: só o `refresh()` da tela do painel.
 */

export async function listarMateriasDoPainel(
  filtros: FiltrosDoPainel = {},
): Promise<ResultadoDoPainel<{ materias: MateriaDoPainel[] }>> {
  const acesso = await exigirAdmin();
  if (!acesso.ok) return acesso;
  return listarMaterias(acesso.admin.cliente, filtros);
}

export async function salvarRevisao(
  articleId: string,
  campos: CamposEditoriaisDeEntrada,
): Promise<ResultadoDoPainel<{ numero: number }>> {
  const acesso = await exigirAdmin();
  if (!acesso.ok) return acesso;
  const resultado = await gravarRevisao(
    acesso.admin.cliente,
    articleId,
    campos,
  );
  if (resultado.ok) refresh();
  return resultado;
}

export async function publicarAlteracoes(
  articleId: string,
): Promise<ResultadoDoPainel<{ slug: string }>> {
  const acesso = await exigirAdmin();
  if (!acesso.ok) return acesso;
  const resultado = await publicarRevisao(acesso.admin.cliente, articleId);
  if (resultado.ok) invalidarMateria(resultado.slug);
  return resultado;
}

export async function despublicar(
  articleId: string,
): Promise<ResultadoDoPainel<{ slug: string }>> {
  const acesso = await exigirAdmin();
  if (!acesso.ok) return acesso;
  const resultado = await despublicarMateria(acesso.admin.cliente, articleId);
  if (resultado.ok) invalidarMateria(resultado.slug);
  return resultado;
}

export async function restaurarRevisao(
  articleId: string,
  numero: number,
): Promise<ResultadoDoPainel<{ numero: number }>> {
  const acesso = await exigirAdmin();
  if (!acesso.ok) return acesso;
  const resultado = await restaurar(acesso.admin.cliente, articleId, numero);
  if (resultado.ok) refresh();
  return resultado;
}

/** Não exportada: num arquivo "use server", tudo que sai vira endpoint. */
function invalidarMateria(slug: string): void {
  updateTag(TAG_MATERIAS);
  updateTag(tagDaMateria(slug));
}
