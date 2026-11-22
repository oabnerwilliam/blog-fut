import "server-only";
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import type { z } from "zod";
import type { Editoria } from "@/lib/editorias";
import { nomeParaExibir } from "./formatos";
import {
  camposDaCriacaoSchema,
  camposEditoriaisSchema,
  filtrosDoPainelSchema,
  NOMES_DOS_CAMPOS,
  NOMES_DOS_CAMPOS_DA_CRIACAO,
  paraCamposDaCriacao,
  paraCamposDaRevisao,
  type ErrosDaCriacao,
  type NomeDoCampoDaCriacao,
  type CamposDaRevisao,
  type ErroDoPainel,
  type Fonte,
  type HistoricoDaMateria,
  type MateriaDoPainel,
  type MateriaParaEdicao,
  type RevisaoCompleta,
  type RevisaoResumida,
  type ResumoDaMateria,
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
  // A criação troca pela frase com o slug (inserirMateria).
  slug_ja_existe: "Já existe uma matéria com esse slug.",
  falha: "Não foi possível gravar. Tente de novo em instantes.",
};

/** A recusa com a mensagem da tela (pt-BR). */
export function recusaDoPainel(
  erro: ErroDoPainel,
  detalhes?: Pick<Recusa, "problemas" | "errosDosCampos">,
): Recusa {
  return { ok: false, erro, mensagem: MENSAGENS[erro], ...detalhes };
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

/**
 * A primeira mensagem de cada campo, para a tela marcar o campo (`aria-invalid`) e
 * mostrar a frase embaixo dele. `tags[2]` conta como `tags`. Campo desconhecido não entra:
 * ele não existe no formulário (fica só em `problemas`). `nomes` são os campos do
 * formulário: os da edição (padrão) ou os da criação, que têm o `slug`.
 */
export function errosPorCampo(
  erro: z.ZodError,
  nomes: readonly NomeDoCampoDaCriacao[] = NOMES_DOS_CAMPOS,
): ErrosDaCriacao {
  const erros: Partial<Record<NomeDoCampoDaCriacao, string>> = {};
  for (const issue of erro.issues) {
    const campo = issue.path[0];
    if (
      typeof campo === "string" &&
      (nomes as readonly string[]).includes(campo) &&
      !(campo in erros)
    ) {
      erros[campo as NomeDoCampoDaCriacao] = issue.message;
    }
  }
  return erros;
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
    return recusa("campos_invalidos", {
      problemas: problemasDosCampos(validados.error),
      errosDosCampos: errosPorCampo(validados.error),
    });
  }
  const { data, error } = await cliente.rpc("salvar_revisao", {
    p_article_id: articleId,
    campos: paraCamposDaRevisao(validados.data),
  });
  if (error) return recusaDoBanco("salvar a revisão", error);
  return { ok: true, numero: data as number };
}

/**
 * Cria a matéria do editor (história 18): rascunho com `fonte = 'painel'` e a revisão 1
 * assinada por quem está logado (`criar_materia`, migração `_criar_materia.sql`). Os
 * campos vêm da tela: validados aqui, pelo mesmo zod da edição mais o slug.
 *
 * Slug repetido volta como `slug_ja_existe`, com a frase que cita o slug, também no campo
 * `slug` (a tela marca o campo e põe o foco no bloco de erro).
 */
export async function inserirMateria(
  cliente: SupabaseClient,
  campos: unknown,
): Promise<ResultadoDoPainel<{ id: string; slug: string }>> {
  const validados = camposDaCriacaoSchema.safeParse(campos);
  if (!validados.success) {
    return recusa("campos_invalidos", {
      problemas: problemasDosCampos(validados.error),
      errosDosCampos: errosPorCampo(
        validados.error,
        NOMES_DOS_CAMPOS_DA_CRIACAO,
      ),
    });
  }
  const dados = paraCamposDaCriacao(validados.data);
  const { data, error } = await cliente.rpc("criar_materia", { campos: dados });
  if (error) {
    if (error.hint === "slug_ja_existe") {
      const mensagem = `Já existe uma matéria com o slug ${dados.slug}.`;
      return {
        ok: false,
        erro: "slug_ja_existe",
        mensagem,
        errosDosCampos: { slug: mensagem },
      };
    }
    return recusaDoBanco("criar a matéria", error);
  }
  return { ok: true, id: data as string, slug: dados.slug };
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

// ---------------------------------------------------------------------------
// Leituras das telas (edição e histórico)
// ---------------------------------------------------------------------------
// As páginas já conferiram a sessão (ADR 0009); o RLS só mostra rascunho e revisões ao
// admin. Um id inválido ou de matéria que não existe devolve `null` (a página dá
// `notFound()`). Um erro do banco lança: quem trata é o error.tsx.

interface LinhaDoResumo {
  id: string;
  slug: string;
  status: StatusDaMateria;
  fonte: Fonte;
  origem: string | null;
  publicado_em: string;
  revisao_publicada: number | null;
  revisao_em_edicao: number;
  editoria: Editoria;
  titulo: string;
}

interface LinhaDaRevisao {
  numero: number;
  origem_da_revisao: Fonte;
  autor_id: string | null;
  autor: string;
  created_at: string;
  titulo: string;
  editoria: Editoria;
}

const COLUNAS_DO_RESUMO =
  "id,slug,status,fonte,origem,publicado_em,revisao_publicada,revisao_em_edicao,editoria,titulo";
const COLUNAS_DA_REVISAO =
  "numero,origem_da_revisao,autor_id,autor,created_at,titulo,editoria";

/** Sem coluna repetida (titulo, autor e editoria estão nas duas listas). */
const COLUNAS_DA_REVISAO_COMPLETA = [
  ...new Set(`${COLUNAS_DA_REVISAO},${COLUNAS_DOS_CAMPOS}`.split(",")),
].join(",");

function falhaDeLeitura(onde: string, error: PostgrestError): Error {
  return new Error(`Não foi possível ler ${onde}: ${error.message}`);
}

async function lerResumo(
  cliente: SupabaseClient,
  id: unknown,
): Promise<LinhaDoResumo | null> {
  if (!ehIdValido(id)) return null;
  const { data, error } = await cliente
    .from("articles")
    .select(COLUNAS_DO_RESUMO)
    .eq("id", id)
    .maybeSingle();
  if (error) throw falhaDeLeitura("a matéria", error);
  return data as LinhaDoResumo | null;
}

function paraResumo(l: LinhaDoResumo): ResumoDaMateria {
  return {
    id: l.id,
    slug: l.slug,
    status: l.status,
    fonte: l.fonte,
    origem: l.origem,
    publicadoEm: l.publicado_em,
    revisaoPublicada: l.revisao_publicada,
    revisaoEmEdicao: l.revisao_em_edicao,
  };
}

/** Os nomes de quem salvou, pelos perfis (o admin lê todos). */
async function nomesDosAutores(
  cliente: SupabaseClient,
  linhas: readonly LinhaDaRevisao[],
): Promise<Map<string, string>> {
  const ids = [
    ...new Set(linhas.map((l) => l.autor_id).filter((id) => id !== null)),
  ];
  if (ids.length === 0) return new Map();
  const { data, error } = await cliente
    .from("perfis")
    .select("user_id,nome,email")
    .in("user_id", ids);
  if (error) throw falhaDeLeitura("os autores das revisões", error);
  return new Map(
    (
      data as { user_id: string; nome: string | null; email: string | null }[]
    ).map((p) => [p.user_id, nomeParaExibir(p.nome, p.email)]),
  );
}

function paraRevisaoResumida(
  l: LinhaDaRevisao,
  nomes: Map<string, string>,
): RevisaoResumida {
  return {
    numero: l.numero,
    origem: l.origem_da_revisao,
    autor: (l.autor_id && nomes.get(l.autor_id)) || l.autor,
    criadaEm: l.created_at,
    titulo: l.titulo,
    editoria: l.editoria,
  };
}

async function lerRevisoesResumidas(
  cliente: SupabaseClient,
  id: string,
): Promise<RevisaoResumida[]> {
  const { data, error } = await cliente
    .from("article_revisions")
    .select(COLUNAS_DA_REVISAO)
    .eq("article_id", id)
    .order("numero", { ascending: false });
  if (error) throw falhaDeLeitura("as revisões", error);
  const linhas = data as LinhaDaRevisao[];
  const nomes = await nomesDosAutores(cliente, linhas);
  return linhas.map((l) => paraRevisaoResumida(l, nomes));
}

/** As revisões pedidas, inteiras, na ordem dos números. Número que não existe fica de fora. */
export async function lerRevisoes(
  cliente: SupabaseClient,
  id: unknown,
  numeros: readonly number[],
): Promise<RevisaoCompleta[]> {
  const validos = [...new Set(numeros.filter(ehNumeroDeRevisao))];
  if (!ehIdValido(id) || validos.length === 0) return [];
  const { data, error } = await cliente
    .from("article_revisions")
    .select(COLUNAS_DA_REVISAO_COMPLETA)
    .eq("article_id", id)
    .in("numero", validos)
    .order("numero", { ascending: true });
  if (error) throw falhaDeLeitura("as revisões", error);
  const linhas = data as unknown as (LinhaDaRevisao & CamposDaRevisao)[];
  const nomes = await nomesDosAutores(cliente, linhas);
  return linhas.map((l) => ({
    ...paraRevisaoResumida(l, nomes),
    campos: camposDaLinha(l),
  }));
}

function camposDaLinha(l: CamposDaRevisao): CamposDaRevisao {
  return {
    titulo: l.titulo,
    titulo_seo: l.titulo_seo,
    linha_fina: l.linha_fina,
    editoria: l.editoria,
    tags: l.tags,
    meta_description: l.meta_description,
    palavras_chave: l.palavras_chave ?? [],
    autor: l.autor,
    ficticio: l.ficticio,
    corpo_md: l.corpo_md,
  };
}

/** A tela de edição: os campos são os da revisão em edição, não os do site. */
export async function lerMateriaParaEdicao(
  cliente: SupabaseClient,
  id: unknown,
): Promise<MateriaParaEdicao | null> {
  const linha = await lerResumo(cliente, id);
  if (linha === null) return null;
  const [revisoes, [emEdicao], tags] = await Promise.all([
    lerRevisoesResumidas(cliente, linha.id),
    lerRevisoes(cliente, linha.id, [linha.revisao_em_edicao]),
    cliente.from("tags").select("slug").order("slug"),
  ]);
  if (tags.error) throw falhaDeLeitura("as tags", tags.error);
  if (!emEdicao) {
    throw new Error(
      `A revisão em edição (${linha.revisao_em_edicao}) da matéria ${linha.slug} não existe.`,
    );
  }
  const { campos, ...resumoDaRevisao } = emEdicao;
  return {
    ...paraResumo(linha),
    campos,
    emEdicao: resumoDaRevisao,
    totalDeRevisoes: revisoes.length,
    tagsExistentes: (tags.data as { slug: string }[]).map((t) => t.slug),
  };
}

/** O histórico: a lista de revisões, sem os corpos (cada tela pede só as que mostra). */
export async function lerHistorico(
  cliente: SupabaseClient,
  id: unknown,
): Promise<HistoricoDaMateria | null> {
  const linha = await lerResumo(cliente, id);
  if (linha === null) return null;
  const revisoes = await lerRevisoesResumidas(cliente, linha.id);
  const emEdicao = revisoes.find((r) => r.numero === linha.revisao_em_edicao);
  return {
    ...paraResumo(linha),
    titulo: emEdicao?.titulo ?? linha.titulo,
    editoria: emEdicao?.editoria ?? linha.editoria,
    revisoes,
  };
}
