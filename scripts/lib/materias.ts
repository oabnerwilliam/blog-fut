/**
 * Caixa de entrada → banco (história 15; spec v2 §7.5; ADR 0008).
 *
 * - `pnpm materia:enviar <slug>`: lê `content/entrada/<slug>.md` com o MESMO parser e
 *   schema da v1, grava a matéria como rascunho + revisão 1 pela função SQL
 *   `public.enviar_materia_do_squad` (uma transação só) e, só depois de o banco
 *   confirmar, move o arquivo para `content/entrada/enviadas/`.
 * - `pnpm materia:publicar <slug>`: chama `public.publicar_revisao`, que copia a revisão
 *   em edição para o que o site lê. O webhook da história 14 invalida o cache.
 *
 * As funções `enviarMateria` e `publicarMateria` recebem o cliente e a pasta da caixa de
 * entrada, para os testes usarem o Supabase local e uma pasta temporária. As
 * `executar*` só juntam argumentos, ambiente (com a trava do `--prod`) e saída.
 */
import { existsSync, mkdirSync, renameSync } from "node:fs";
import path from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { lerArtigoDoArquivo } from "@/lib/content/disco";
import { ContentError } from "@/lib/content/errors";
import { SLUG_REGEX } from "@/lib/content/schema";
import { humanizarTag } from "@/lib/content/tags";
import type { Article } from "@/lib/content/types";
import type { Ambiente, OpcoesDoAmbiente } from "./ambiente";
import { camposDoArtigo } from "./importacao";

export type Comando = "enviar" | "publicar";

/** Erro esperado de um comando: a CLI imprime a mensagem e sai com código 1. */
export class ErroDoComando extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "ErroDoComando";
  }
}

export const MENSAGEM_SLUG_EXISTENTE = (slug: string): string =>
  `Já existe uma matéria com o slug ${slug}. Edite pelo painel.`;

// ---------------------------------------------------------------------------
// Argumentos
// ---------------------------------------------------------------------------

export interface ArgumentosDaMateria {
  readonly slug: string;
  readonly prod: boolean;
  readonly sim: boolean;
}

/** `<slug> [--prod] [--sim]`, em qualquer ordem. O slug nunca vira caminho fora da pasta. */
export function lerArgumentosDaMateria(
  argv: readonly string[],
  comando: Comando,
): ArgumentosDaMateria {
  const uso = `Uso: pnpm materia:${comando} <slug> [--prod] [--sim]`;
  let prod = false;
  let sim = false;
  const slugs: string[] = [];
  for (const arg of argv) {
    if (arg === "--prod") prod = true;
    else if (arg === "--sim") sim = true;
    else if (arg === "--") continue;
    else if (arg.startsWith("-")) {
      throw new ErroDoComando(`Opção desconhecida: ${arg}\n${uso}`);
    } else slugs.push(arg);
  }
  if (slugs.length !== 1) throw new ErroDoComando(uso);
  const [slug] = slugs;
  if (!SLUG_REGEX.test(slug)) {
    throw new ErroDoComando(
      `Slug inválido: "${slug}". Use o nome do arquivo sem .md, em kebab-case (a-z, 0-9 e -).\n${uso}`,
    );
  }
  return { slug, prod, sim };
}

// ---------------------------------------------------------------------------
// Leitura da caixa de entrada
// ---------------------------------------------------------------------------

/** `<entrada>/<slug>.md` validado. A tag sem rótulo recebe o humanizado, como no site. */
export function lerMateriaDaEntrada(entrada: string, slug: string): Article {
  const caminho = path.join(entrada, `${slug}.md`);
  if (!existsSync(caminho)) {
    throw new ErroDoComando(`Arquivo não encontrado: ${caminho}`);
  }
  try {
    return lerArtigoDoArquivo(caminho, humanizarTag).artigo;
  } catch (erro) {
    if (erro instanceof ContentError) {
      throw new ErroDoComando(
        `Matéria inválida em ${caminho}. Nada foi gravado.\n${erro.message}`,
      );
    }
    throw erro;
  }
}

/** O `jsonb` que `public.enviar_materia_do_squad` recebe. */
export interface DadosDoEnvio extends ReturnType<typeof camposDoArtigo> {
  /** Rótulo humanizado de cada tag, para as que ainda não existem no banco. */
  readonly rotulos: Readonly<Record<string, string>>;
}

export function dadosDoEnvio(artigo: Article): DadosDoEnvio {
  return {
    ...camposDoArtigo(artigo),
    rotulos: Object.fromEntries(
      artigo.tags.map((tag) => [tag.slug, tag.rotulo]),
    ),
  };
}

interface ErroDoBanco {
  readonly message: string;
  readonly hint?: string | null;
}

// ---------------------------------------------------------------------------
// Enviar
// ---------------------------------------------------------------------------

export interface OpcoesDoEnvio {
  readonly cliente: SupabaseClient;
  /** A caixa de entrada (na CLI, `content/entrada`). */
  readonly entrada: string;
  readonly slug: string;
}

export interface ResultadoDoEnvio {
  readonly id: string;
  readonly slug: string;
  readonly titulo: string;
  readonly status: "rascunho";
  readonly arquivo: string;
}

export async function enviarMateria({
  cliente,
  entrada,
  slug,
}: OpcoesDoEnvio): Promise<ResultadoDoEnvio> {
  const artigo = lerMateriaDaEntrada(entrada, slug);

  const { data, error } = (await cliente.rpc("enviar_materia_do_squad", {
    dados: dadosDoEnvio(artigo),
  })) as { data: unknown; error: ErroDoBanco | null };
  if (error) {
    if (error.hint === "materia_ja_existe") {
      throw new ErroDoComando(MENSAGEM_SLUG_EXISTENTE(slug));
    }
    throw new ErroDoComando(
      `O banco recusou a matéria ${slug}. Nada foi gravado: ${error.message}`,
    );
  }

  // Só agora, com o banco confirmado, o arquivo sai da caixa de entrada.
  const origem = path.join(entrada, `${slug}.md`);
  const pasta = path.join(entrada, "enviadas");
  const destino = path.join(pasta, `${slug}.md`);
  try {
    mkdirSync(pasta, { recursive: true });
    renameSync(origem, destino);
  } catch (erro) {
    throw new ErroDoComando(
      `A matéria ${slug} foi gravada no banco como rascunho, mas o arquivo não foi movido (${erro instanceof Error ? erro.message : String(erro)}). Mova ${origem} para ${destino} à mão.`,
    );
  }

  return {
    id: data as string,
    slug,
    titulo: artigo.titulo,
    status: "rascunho",
    arquivo: destino,
  };
}

// ---------------------------------------------------------------------------
// Publicar
// ---------------------------------------------------------------------------

export interface OpcoesDaPublicacao {
  readonly cliente: SupabaseClient;
  readonly slug: string;
}

export type ResultadoDaPublicacao =
  | {
      readonly estado: "publicada";
      readonly slug: string;
      readonly titulo: string;
      readonly revisao: number;
    }
  | {
      readonly estado: "nada-a-publicar";
      readonly slug: string;
      readonly titulo: string;
      readonly revisao: number;
    };

interface EstadoDaMateria {
  readonly id: string;
  readonly titulo: string;
  readonly status: "rascunho" | "publicado";
  readonly revisao_publicada: number | null;
  readonly revisao_em_edicao: number;
}

async function lerEstado(
  cliente: SupabaseClient,
  slug: string,
): Promise<EstadoDaMateria | null> {
  const { data, error } = await cliente
    .from("articles")
    .select("id,titulo,status,revisao_publicada,revisao_em_edicao")
    .eq("slug", slug)
    .maybeSingle();
  if (error) {
    throw new ErroDoComando(`Falha ao ler a matéria ${slug}: ${error.message}`);
  }
  return data as EstadoDaMateria | null;
}

export async function publicarMateria({
  cliente,
  slug,
}: OpcoesDaPublicacao): Promise<ResultadoDaPublicacao> {
  const antes = await lerEstado(cliente, slug);
  if (antes === null) {
    throw new ErroDoComando(
      `Não existe matéria com o slug ${slug}. Envie antes com pnpm materia:enviar ${slug}.`,
    );
  }
  if (
    antes.status === "publicado" &&
    antes.revisao_publicada === antes.revisao_em_edicao
  ) {
    return {
      estado: "nada-a-publicar",
      slug,
      titulo: antes.titulo,
      revisao: antes.revisao_em_edicao,
    };
  }

  const { error } = (await cliente.rpc("publicar_revisao", {
    p_article_id: antes.id,
  })) as { error: ErroDoBanco | null };
  if (error) {
    throw new ErroDoComando(`O banco não publicou ${slug}: ${error.message}`);
  }

  // O título publicado é o da revisão, que pode ser diferente do que estava no ar.
  const depois = await lerEstado(cliente, slug);
  return {
    estado: "publicada",
    slug,
    titulo: depois?.titulo ?? antes.titulo,
    revisao: antes.revisao_em_edicao,
  };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

export interface DependenciasDoComando {
  readonly carregarAmbiente: (opcoes: OpcoesDoAmbiente) => Promise<Ambiente>;
  readonly criarCliente: (ambiente: Ambiente) => SupabaseClient;
  readonly escrever: (linha: string) => void;
  /** Só o `materia:enviar` usa. */
  readonly entrada: string;
}

/** A trava do `--prod` é a do `carregarAmbiente`, que já imprime "Destino: PRODUÇÃO (...)". */
async function conectar(
  { prod, sim }: ArgumentosDaMateria,
  { carregarAmbiente, criarCliente, escrever }: DependenciasDoComando,
): Promise<SupabaseClient> {
  const ambiente = await carregarAmbiente({ prod, sim });
  if (!prod) escrever(`Destino: local (${ambiente.host})`);
  return criarCliente(ambiente);
}

export async function executarEnviarMateria(
  argv: readonly string[],
  deps: DependenciasDoComando,
): Promise<void> {
  const argumentos = lerArgumentosDaMateria(argv, "enviar");
  const cliente = await conectar(argumentos, deps);
  const resultado = await enviarMateria({
    cliente,
    entrada: deps.entrada,
    slug: argumentos.slug,
  });
  deps.escrever(`Slug: ${resultado.slug}`);
  deps.escrever(`Título: ${resultado.titulo}`);
  deps.escrever(`Status: ${resultado.status}`);
  deps.escrever(`Arquivo movido para ${resultado.arquivo}`);
  deps.escrever(
    `Para publicar (só quando o usuário pedir): pnpm materia:publicar ${resultado.slug}${argumentos.prod ? " --prod" : ""}`,
  );
}

export async function executarPublicarMateria(
  argv: readonly string[],
  deps: DependenciasDoComando,
): Promise<void> {
  const argumentos = lerArgumentosDaMateria(argv, "publicar");
  const cliente = await conectar(argumentos, deps);
  const resultado = await publicarMateria({ cliente, slug: argumentos.slug });
  deps.escrever(`Slug: ${resultado.slug}`);
  deps.escrever(`Título: ${resultado.titulo}`);
  if (resultado.estado === "nada-a-publicar") {
    deps.escrever(
      `Nada a publicar: a revisão ${resultado.revisao} já é a que está no ar.`,
    );
  } else {
    deps.escrever(`Status: publicado (revisão ${resultado.revisao})`);
  }
}
