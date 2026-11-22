import "server-only";
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import type { z } from "zod";
import type { Editoria } from "@/lib/editorias";
import {
  camposEditoriaisSchema,
  filtrosDoPainelSchema,
  paraCamposDaRevisao,
  type ErroDoPainel,
  type Fonte,
  type MateriaDoPainel,
  type Recusa,
  type ResultadoDoPainel,
  type StatusDaMateria,
} from "./tipos";

/**
 * Núcleo do painel de matérias (história 17, critério 3; spec v2 §7.7, U7 e U9).
 *
 * As server actions de `materias.ts` juntam a sessão (`exigirAdmin`) e a invalidação do
 * cache a estas funções. Aqui ficam as regras, testadas contra o Supabase local com o JWT
 * de cada usuário (`tests/db/painel.test.ts`), como `decisoes.ts` na história 16.
 *
 * Sempre o cliente da sessão de quem está logado, nunca a chave de serviço: as RPCs
 * (`salvar_revisao`, `publicar_revisao`, `despublicar_materia`) conferem `eh_admin()` na
 * primeira linha, e o RLS vale nas leituras.
 */

const MENSAGENS: Record<ErroDoPainel, string> = {
  nao_autorizado: "Você não tem permissão para mexer nas matérias.",
  id_invalido: "Matéria ou revisão inválida.",
  campos_invalidos:
    "Alguns campos não passaram na validação. Confira e salve de novo.",
  filtros_invalidos: "Filtro desconhecido.",
  materia_inexistente: "Essa matéria não existe mais.",
  revisao_inexistente: "Essa revisão não existe.",
  revisao_concorrente:
    "Outra revisão desta matéria foi salva ao mesmo tempo. Recarregue e salve de novo.",
  origem_obrigatoria:
    "Uma matéria do squad sem origem precisa continuar marcada como fictícia.",
  falha: "Não foi possível gravar. Tente de novo em instantes.",
};

/** A recusa com a mensagem da tela (pt-BR). */
export function recusaDoPainel(
  erro: ErroDoPainel,
  problemas?: readonly string[],
): Recusa {
  return problemas
    ? { ok: false, erro, mensagem: MENSAGENS[erro], problemas }
    : { ok: false, erro, mensagem: MENSAGENS[erro] };
}

const recusa = recusaDoPainel;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function ehIdValido(valor: unknown): valor is string {
  return typeof valor === "string" && UUID.test(valor);
}

function ehNumeroDeRevisao(valor: unknown): valor is number {
  return (
    typeof valor === "number" &&
    Number.isSafeInteger(valor) &&
    valor >= 1 &&
    valor <= 2_147_483_647
  );
}

/** Um problema por linha: `campo "tags[0]": cada tag precisa estar em kebab-case…`. */
export function problemasDosCampos(erro: z.ZodError): string[] {
  return erro.issues.flatMap((issue) => {
    if (issue.code === "unrecognized_keys") {
      return issue.keys.map((chave) => `campo desconhecido "${chave}"`);
    }
    const caminho = issue.path
      .map((chave, i) =>
        typeof chave === "number"
          ? `[${chave}]`
          : `${i > 0 ? "." : ""}${String(chave)}`,
      )
      .join("");
    return [
      caminho === "" ? issue.message : `campo "${caminho}": ${issue.message}`,
    ];
  });
}

/** As `hint` que as funções da migração `_painel.sql` levantam. */
const ERROS_DO_BANCO: Readonly<Record<string, ErroDoPainel>> = {
  nao_autorizado: "nao_autorizado",
  materia_inexistente: "materia_inexistente",
  revisao_inexistente: "revisao_inexistente",
  revisao_concorrente: "revisao_concorrente",
  origem_obrigatoria: "origem_obrigatoria",
  campos_invalidos: "campos_invalidos",
};

function recusaDoBanco(onde: string, error: PostgrestError): Recusa {
  const conhecido = error.hint ? ERROS_DO_BANCO[error.hint] : undefined;
  if (conhecido) return recusa(conhecido);
  // 42501: sem permissão (grant ou RLS). Nunca deveria chegar aqui com um admin.
  if (error.code === "42501") return recusa("nao_autorizado");
  console.error(`[admin] ${onde} falhou:`, error.code, error.message);
  return recusa("falha");
}

// ---------------------------------------------------------------------------
// Lista
// ---------------------------------------------------------------------------

interface LinhaDaLista {
  id: string;
  slug: string;
  titulo: string;
  editoria: Editoria;
  status: StatusDaMateria;
  fonte: Fonte;
  ficticio: boolean;
  publicado_em: string;
  updated_at: string;
  revisao_publicada: number | null;
  revisao_em_edicao: number;
}

const COLUNAS_DA_LISTA =
  "id,slug,titulo,editoria,status,fonte,ficticio,publicado_em,updated_at,revisao_publicada,revisao_em_edicao";

/**
 * As matérias do painel, da gravada mais recentemente para a mais antiga. O título é o da
 * revisão em edição: num rascunho editado e nunca publicado, a linha de `articles` ainda
 * tem o texto do squad. Os filtros vêm da URL: validados aqui.
 */
export async function listarMaterias(
  cliente: SupabaseClient,
  filtros: unknown = {},
): Promise<ResultadoDoPainel<{ materias: MateriaDoPainel[] }>> {
  const validados = filtrosDoPainelSchema.safeParse(filtros ?? {});
  if (!validados.success) return recusa("filtros_invalidos");
  const { status, editoria, fonte } = validados.data;

  let consulta = cliente.from("articles").select(COLUNAS_DA_LISTA);
  if (status) consulta = consulta.eq("status", status);
  if (editoria) consulta = consulta.eq("editoria", editoria);
  if (fonte) consulta = consulta.eq("fonte", fonte);
  const { data, error } = await consulta
    .order("updated_at", { ascending: false })
    .order("slug", { ascending: true });
  if (error) return recusaDoBanco("a lista de matérias", error);
  const linhas = (data ?? []) as LinhaDaLista[];
  if (linhas.length === 0) return { ok: true, materias: [] };

  const { data: revisoes, error: erroDasRevisoes } = await cliente
    .from("article_revisions")
    .select("article_id,numero,titulo")
    .in(
      "article_id",
      linhas.map((l) => l.id),
    );
  if (erroDasRevisoes) {
    return recusaDoBanco("os títulos em edição", erroDasRevisoes);
  }
  const titulos = new Map(
    (revisoes as { article_id: string; numero: number; titulo: string }[]).map(
      (r) => [`${r.article_id}#${r.numero}`, r.titulo],
    ),
  );

  return {
    ok: true,
    materias: linhas.map((l) => ({
      id: l.id,
      slug: l.slug,
      titulo: titulos.get(`${l.id}#${l.revisao_em_edicao}`) ?? l.titulo,
      tituloPublicado: l.revisao_publicada === null ? null : l.titulo,
      editoria: l.editoria,
      status: l.status,
      fonte: l.fonte,
      ficticio: l.ficticio,
      publicadoEm: l.publicado_em,
      atualizadoEm: l.updated_at,
      revisaoPublicada: l.revisao_publicada,
      revisaoEmEdicao: l.revisao_em_edicao,
      alteracoesNaoPublicadas:
        l.revisao_publicada !== null &&
        l.revisao_em_edicao !== l.revisao_publicada,
    })),
  };
}

// ---------------------------------------------------------------------------
// Gravações
// ---------------------------------------------------------------------------

/**
 * Salva os campos como uma revisão nova do painel (U9): só `revisao_em_edicao` muda, e o
 * site continua mostrando a revisão publicada. Os campos vêm da tela: validados aqui,
 * pelo mesmo zod da v1, antes de ir ao banco.
 */
export async function gravarRevisao(
  cliente: SupabaseClient,
  articleId: unknown,
  campos: unknown,
): Promise<ResultadoDoPainel<{ numero: number }>> {
  if (!ehIdValido(articleId)) return recusa("id_invalido");
  const validados = camposEditoriaisSchema.safeParse(campos);
  if (!validados.success) {
    return recusa("campos_invalidos", problemasDosCampos(validados.error));
  }
  const { data, error } = await cliente.rpc("salvar_revisao", {
    p_article_id: articleId,
    campos: paraCamposDaRevisao(validados.data),
  });
  if (error) return recusaDoBanco("salvar a revisão", error);
  return { ok: true, numero: data as number };
}

/** O slug da matéria (para as etiquetas do cache), ou `null` se ela não existe. */
async function slugDa(
  cliente: SupabaseClient,
  articleId: string,
): Promise<{ slug: string | null } | { erro: PostgrestError }> {
  const { data, error } = await cliente
    .from("articles")
    .select("slug")
    .eq("id", articleId)
    .maybeSingle();
  if (error) return { erro: error };
  return { slug: (data as { slug: string } | null)?.slug ?? null };
}

/**
 * Publica a revisão em edição (`publicar_revisao`, da história 15). Devolve o slug para
 * a action invalidar a página da matéria.
 */
export async function publicarRevisao(
  cliente: SupabaseClient,
  articleId: unknown,
): Promise<ResultadoDoPainel<{ slug: string }>> {
  return mudarPublicacao(cliente, articleId, "publicar_revisao");
}

/** Tira a matéria do site (`despublicar_materia`). O histórico fica. */
export async function despublicarMateria(
  cliente: SupabaseClient,
  articleId: unknown,
): Promise<ResultadoDoPainel<{ slug: string }>> {
  return mudarPublicacao(cliente, articleId, "despublicar_materia");
}

async function mudarPublicacao(
  cliente: SupabaseClient,
  articleId: unknown,
  funcao: "publicar_revisao" | "despublicar_materia",
): Promise<ResultadoDoPainel<{ slug: string }>> {
  if (!ehIdValido(articleId)) return recusa("id_invalido");
  // Antes da RPC: o slug não muda pelo painel, e um não admin já para aqui (o RLS só
  // mostra rascunho ao admin) ou na primeira linha da função.
  const lido = await slugDa(cliente, articleId);
  if ("erro" in lido) return recusaDoBanco(funcao, lido.erro);
  const { error } = await cliente.rpc(funcao, { p_article_id: articleId });
  if (error) return recusaDoBanco(funcao, error);
  if (lido.slug === null) return recusa("materia_inexistente");
  return { ok: true, slug: lido.slug };
}

const COLUNAS_DOS_CAMPOS =
  "titulo,titulo_seo,linha_fina,editoria,tags,meta_description,palavras_chave,autor,ficticio,corpo_md";

/**
 * "Restaurar esta versão": copia os campos da revisão `numero` para uma revisão **nova**
 * (N+1), assinada por quem restaurou (ADR 0009, Consequências). Nada é apagado nem
 * alterado. Como num salvamento, o site só muda depois de "Publicar alterações".
 */
export async function restaurarRevisao(
  cliente: SupabaseClient,
  articleId: unknown,
  numero: unknown,
): Promise<ResultadoDoPainel<{ numero: number }>> {
  if (!ehIdValido(articleId) || !ehNumeroDeRevisao(numero)) {
    return recusa("id_invalido");
  }
  const { data, error } = await cliente
    .from("article_revisions")
    .select(COLUNAS_DOS_CAMPOS)
    .eq("article_id", articleId)
    .eq("numero", numero)
    .maybeSingle();
  if (error) return recusaDoBanco("ler a revisão", error);
  if (data === null) {
    // Sem a revisão: ou a matéria não existe, ou quem pede não é admin (o RLS esconde).
    const lido = await slugDa(cliente, articleId);
    if ("erro" in lido) return recusaDoBanco("restaurar", lido.erro);
    return recusa(
      lido.slug === null ? "materia_inexistente" : "revisao_inexistente",
    );
  }
  return gravarRevisao(cliente, articleId, data);
}
