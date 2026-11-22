"use server";
import "server-only";
import { refresh, updateTag } from "next/cache";
import { TAG_MATERIAS, tagDaMateria } from "@/lib/content/cache";
import {
  despublicarMateria,
  gravarRevisao,
  inserirMateria,
  listarMaterias,
  publicarRevisao,
  restaurarRevisao as restaurar,
} from "./painel";
import { renderizarPrevia } from "./previa";
import { exigirAdmin } from "./sessao";
import type {
  CamposDaCriacaoDeEntrada,
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
 * restaurar não mudam o site: só o `refresh()` da tela do painel. Criar (história 18)
 * grava um rascunho e não mexe em nada disso; a prévia não grava nada.
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

/**
 * "Criar rascunho" no editor (história 18, critério 3). Uma matéria nova nasce em
 * rascunho: o site não muda, então não há cache para expirar, e a tela de criação navega
 * para a edição (onde se publica), sem precisar do `refresh()`.
 */
export async function criarMateria(
  campos: CamposDaCriacaoDeEntrada,
): Promise<ResultadoDoPainel<{ id: string; slug: string }>> {
  const acesso = await exigirAdmin();
  if (!acesso.ok) return acesso;
  return inserirMateria(acesso.admin.cliente, campos);
}

/**
 * A prévia do editor (história 18, critério 4): o HTML sanitizado do `renderMarkdown` do
 * site (ADR 0004). Também exige admin: sem isso, seria um renderizador de markdown aberto
 * a qualquer um. Não grava nada.
 */
export async function previsualizar(
  md: string,
): Promise<ResultadoDoPainel<{ html: string }>> {
  const acesso = await exigirAdmin();
  if (!acesso.ok) return acesso;
  return renderizarPrevia(md);
}

/** Não exportada: num arquivo "use server", tudo que sai vira endpoint. */
function invalidarMateria(slug: string): void {
  updateTag(TAG_MATERIAS);
  updateTag(tagDaMateria(slug));
}
