/**
 * Importa `<dir>/materias/*.md` e `<dir>/tags.json` para o Supabase (história 13).
 *
 * - Lê com o MESMO `carregarArtigosDoDisco` do site: parser, schema e erros da v1.
 * - Upsert por slug. Matéria real (tem `origem`) → `fonte = 'squad'`; fictícia →
 *   `fonte = 'importacao'`. Sempre `status = 'publicado'`.
 * - Matéria nova: revisão 1 com o snapshot completo, e `revisao_publicada =
 *   revisao_em_edicao = 1`.
 * - Idempotente: compara antes de gravar. Uma segunda execução não grava nada, então
 *   `updated_at` não muda e nenhuma revisão nova aparece.
 * - Arquivo alterado depois da importação: vira a revisão seguinte (o histórico nunca
 *   é reescrito) e os dois ponteiros passam a apontar para ela.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { carregarArtigosDoDisco, lerRotulosDoDisco } from "@/lib/content/disco";
import type { Aviso } from "@/lib/content/tags";
import type { Article } from "@/lib/content/types";

export type Fonte = "squad" | "importacao";

/** Campos editoriais: o que vai para `articles` e, igual, para a revisão. */
export interface CamposDaRevisao {
  titulo: string;
  titulo_seo: string | null;
  linha_fina: string;
  editoria: string;
  tags: string[];
  meta_description: string | null;
  palavras_chave: string[];
  publicado_em: string;
  autor: string;
  ficticio: boolean;
  corpo_md: string;
}

export interface LinhaDaMateria extends CamposDaRevisao {
  slug: string;
  origem: string | null;
  fonte: Fonte;
  status: "publicado";
}

export interface ResultadoDaImportacao {
  readonly materias: {
    readonly inseridas: string[];
    readonly atualizadas: string[];
    readonly iguais: string[];
  };
  readonly tags: {
    readonly inseridas: string[];
    readonly atualizadas: string[];
    readonly iguais: string[];
  };
  /** Publicadas no banco que não estão na pasta importada. Só avisa: nada é apagado. */
  readonly soNoBanco: string[];
}

const CAMPOS_DA_REVISAO = [
  "titulo",
  "titulo_seo",
  "linha_fina",
  "editoria",
  "tags",
  "meta_description",
  "palavras_chave",
  "publicado_em",
  "autor",
  "ficticio",
  "corpo_md",
] as const satisfies readonly (keyof CamposDaRevisao)[];

const CAMPOS_DA_MATERIA = [
  ...CAMPOS_DA_REVISAO,
  "slug",
  "origem",
  "fonte",
  "status",
] as const satisfies readonly (keyof LinhaDaMateria)[];

export function fonteDoArtigo(artigo: Article): Fonte {
  return !artigo.ficticio && artigo.origem !== null ? "squad" : "importacao";
}

/** O Article do parser → colunas de `articles`, sem `fonte` e `status` (quem grava decide). */
export function camposDoArtigo(
  artigo: Article,
): Omit<LinhaDaMateria, "fonte" | "status"> {
  return {
    slug: artigo.slug,
    titulo: artigo.titulo,
    titulo_seo: artigo.titulo_seo,
    linha_fina: artigo.linha_fina,
    editoria: artigo.editoria.slug,
    tags: artigo.tags.map((tag) => tag.slug),
    meta_description: artigo.meta_description,
    palavras_chave: [...artigo.palavras_chave],
    publicado_em: artigo.publicado_em,
    autor: artigo.autor,
    ficticio: artigo.ficticio,
    origem: artigo.origem,
    corpo_md: artigo.corpo_md,
  };
}

export function linhaDoArtigo(artigo: Article): LinhaDaMateria {
  return {
    ...camposDoArtigo(artigo),
    fonte: fonteDoArtigo(artigo),
    status: "publicado",
  };
}

function camposDaRevisao(linha: LinhaDaMateria): CamposDaRevisao {
  return Object.fromEntries(
    CAMPOS_DA_REVISAO.map((campo) => [campo, linha[campo]]),
  ) as unknown as CamposDaRevisao;
}

/** Igualdade campo a campo (texto, nulo, booleano e listas de texto). */
function mesmosCampos(
  desejada: LinhaDaMateria,
  existente: Record<string, unknown>,
): boolean {
  return CAMPOS_DA_MATERIA.every(
    (campo) =>
      JSON.stringify(desejada[campo]) === JSON.stringify(existente[campo]),
  );
}

interface MateriaExistente extends Record<string, unknown> {
  id: string;
  slug: string;
  revisao_publicada: number | null;
  revisao_em_edicao: number;
}

function erroDoBanco(contexto: string, erro: { message: string }): Error {
  return new Error(`Falha ao ${contexto}: ${erro.message}`);
}

async function importarTags(
  client: SupabaseClient,
  rotulos: Readonly<Record<string, string>>,
): Promise<ResultadoDaImportacao["tags"]> {
  const resultado = {
    inseridas: [] as string[],
    atualizadas: [] as string[],
    iguais: [] as string[],
  };
  const { data, error } = await client.from("tags").select("slug,rotulo");
  if (error) throw erroDoBanco("ler as tags", error);
  const existentes = new Map(
    (data as { slug: string; rotulo: string }[]).map((t) => [t.slug, t.rotulo]),
  );
  const gravar: { slug: string; rotulo: string }[] = [];
  for (const [slug, rotulo] of Object.entries(rotulos)) {
    const atual = existentes.get(slug);
    if (atual === rotulo) resultado.iguais.push(slug);
    else {
      (atual === undefined ? resultado.inseridas : resultado.atualizadas).push(
        slug,
      );
      gravar.push({ slug, rotulo });
    }
  }
  if (gravar.length > 0) {
    const { error: erro } = await client
      .from("tags")
      .upsert(gravar, { onConflict: "slug" });
    if (erro) throw erroDoBanco("gravar as tags", erro);
  }
  return resultado;
}

async function inserirRevisao(
  client: SupabaseClient,
  articleId: string,
  numero: number,
  linha: LinhaDaMateria,
): Promise<void> {
  const { error } = await client.from("article_revisions").insert({
    article_id: articleId,
    numero,
    ...camposDaRevisao(linha),
    autor_id: null,
    origem_da_revisao: linha.fonte,
  });
  if (error) {
    throw erroDoBanco(`gravar a revisão ${numero} de "${linha.slug}"`, error);
  }
}

export async function importarConteudo(
  client: SupabaseClient,
  contentDir: string,
  avisar: Aviso = console.warn,
): Promise<ResultadoDaImportacao> {
  const artigos = carregarArtigosDoDisco(contentDir, avisar).map(
    (c) => c.artigo,
  );
  // As tags vão antes: o trigger de articles usa o rótulo na busca_normalizada.
  const tags = await importarTags(client, lerRotulosDoDisco(contentDir));

  const materias = {
    inseridas: [] as string[],
    atualizadas: [] as string[],
    iguais: [] as string[],
  };
  const slugs = artigos.map((a) => a.slug);
  const { data, error } = await client
    .from("articles")
    .select(
      `id,revisao_publicada,revisao_em_edicao,${CAMPOS_DA_MATERIA.join(",")}`,
    )
    .in("slug", slugs.length > 0 ? slugs : [""]);
  if (error) throw erroDoBanco("ler as matérias existentes", error);
  const existentes = new Map(
    (data as unknown as MateriaExistente[]).map((m) => [m.slug, m]),
  );
  const ids = [...existentes.values()].map((m) => m.id);
  const revisoes = new Set<string>();
  if (ids.length > 0) {
    const { data: numeros, error: erro } = await client
      .from("article_revisions")
      .select("article_id,numero")
      .in("article_id", ids);
    if (erro) throw erroDoBanco("ler as revisões existentes", erro);
    for (const r of numeros as { article_id: string; numero: number }[]) {
      revisoes.add(`${r.article_id}:${r.numero}`);
    }
  }

  for (const artigo of artigos) {
    const linha = linhaDoArtigo(artigo);
    const existente = existentes.get(linha.slug);

    if (existente === undefined) {
      const { data: criada, error: erro } = await client
        .from("articles")
        .insert({ ...linha, revisao_publicada: 1, revisao_em_edicao: 1 })
        .select("id")
        .single();
      if (erro) throw erroDoBanco(`inserir "${linha.slug}"`, erro);
      await inserirRevisao(client, (criada as { id: string }).id, 1, linha);
      materias.inseridas.push(linha.slug);
      continue;
    }

    if (mesmosCampos(linha, existente)) {
      // Execução anterior interrompida entre a matéria e a revisão: completa o histórico.
      const numero = existente.revisao_publicada ?? existente.revisao_em_edicao;
      if (!revisoes.has(`${existente.id}:${numero}`)) {
        await inserirRevisao(client, existente.id, numero, linha);
      }
      materias.iguais.push(linha.slug);
      continue;
    }

    const { data: ultima, error: erroDaUltima } = await client
      .from("article_revisions")
      .select("numero")
      .eq("article_id", existente.id)
      .order("numero", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (erroDaUltima) {
      throw erroDoBanco(`ler as revisões de "${linha.slug}"`, erroDaUltima);
    }
    const numero = ((ultima as { numero: number } | null)?.numero ?? 0) + 1;
    await inserirRevisao(client, existente.id, numero, linha);
    const { error: erro } = await client
      .from("articles")
      .update({
        ...linha,
        revisao_publicada: numero,
        revisao_em_edicao: numero,
      })
      .eq("id", existente.id);
    if (erro) throw erroDoBanco(`atualizar "${linha.slug}"`, erro);
    materias.atualizadas.push(linha.slug);
  }

  const { data: publicadas, error: erroDasPublicadas } = await client
    .from("articles")
    .select("slug")
    .eq("status", "publicado")
    .order("slug");
  if (erroDasPublicadas) {
    throw erroDoBanco("ler as matérias publicadas", erroDasPublicadas);
  }
  const noDisco = new Set(slugs);
  const soNoBanco = (publicadas as { slug: string }[])
    .map((m) => m.slug)
    .filter((slug) => !noDisco.has(slug));

  return { materias, tags, soNoBanco };
}
