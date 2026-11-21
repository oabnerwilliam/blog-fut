import {
  TAMANHO_PADRAO_DA_PAGINA,
  type ArticleRepository,
  type Taxonomy,
} from "@/lib/content";
import { isEditoria } from "@/lib/editorias";
import { lerPagina } from "@/lib/listagens";
import { listarTodosOsSlugs } from "@/lib/materias";

/** Segmento da URL decodificado; `null` se a codificação for inválida (`%E0%A4%A`). */
function decodificar(segmento: string): string | null {
  try {
    return decodeURIComponent(segmento);
  } catch {
    return null;
  }
}

/** `?pagina=` como o `searchParams` da página o entrega: ausente, texto ou array (repetido). */
function valorDaPagina(url: EnderecoDaRota): string | string[] | undefined {
  const valores = url.searchParams.getAll("pagina");
  if (valores.length === 0) return undefined;
  return valores.length === 1 ? valores[0] : valores;
}

/** Só o que a regra lê da URL: serve para `URL` e para o `nextUrl` do Proxy. */
export type EnderecoDaRota = Pick<URL, "pathname" | "searchParams">;

const ROTA = /^\/(materias|editorias|tags)\/([^/]+)$/;

// ---------------------------------------------------------------------------
// Índice em memória (U12; ADR 0006, extensão da história 14)
// ---------------------------------------------------------------------------

/** Tempo de vida do índice do Proxy: uma matéria nova pode dar 404 por até 1 minuto. */
export const TTL_DO_INDICE_MS = 60_000;

/** O que existe agora: o retrato que o Proxy consulta sem ir ao banco. */
export interface RetratoDasRotas {
  readonly materias: ReadonlySet<string>;
  /** Editoria → número de páginas da listagem. Só as com matéria visível. */
  readonly paginasDasEditorias: ReadonlyMap<string, number>;
  /** Tag → número de páginas da listagem. Só as com matéria visível. */
  readonly paginasDasTags: ReadonlyMap<string, number>;
}

export interface IndiceDeRotas {
  /** O retrato vigente, recarregado se o TTL venceu; `null` se nunca houve carga boa. */
  obter(): Promise<RetratoDasRotas | null>;
}

export interface OpcoesDoIndice {
  /** Pedido a cada carga, para seguir o ambiente do processo (fonte, MOSTRAR_EXEMPLOS). */
  readonly repositorio: () => ArticleRepository;
  readonly ttlMs?: number;
  /** Relógio injetável: o teste anda o tempo sem esperar. */
  readonly agora?: () => number;
}

/** Mesma conta do catálogo (`Math.ceil(total / tamanho)`), com a página padrão das listagens. */
function paginas(taxonomia: readonly Taxonomy[]): Map<string, number> {
  return new Map(
    taxonomia
      .filter((t) => t.total > 0)
      .map((t) => [t.slug, Math.ceil(t.total / TAMANHO_PADRAO_DA_PAGINA)]),
  );
}

/** Lê do repositório tudo que o Proxy precisa: os slugs e as contagens das listagens. */
export async function carregarRetrato(
  repositorio: ArticleRepository,
): Promise<RetratoDasRotas> {
  const [slugs, editorias, tags] = await Promise.all([
    listarTodosOsSlugs(repositorio),
    repositorio.listEditorias(),
    repositorio.listTags(),
  ]);
  return {
    materias: new Set(slugs),
    paginasDasEditorias: paginas(editorias),
    paginasDasTags: paginas(tags),
  };
}

/**
 * O Proxy não aplica "use cache" (doc `use-cache.md`), então guarda o retrato em memória:
 * - recarrega no máximo uma vez por TTL; as requisições que chegam durante a recarga
 *   esperam a mesma promessa (uma carga só);
 * - se a recarga falhar, o retrato antigo continua valendo, e a próxima tentativa só vem
 *   depois de outro TTL (o banco fora do ar não recebe uma consulta por requisição);
 * - sem retrato nenhum, `obter` devolve `null`, e a rota passa adiante.
 *
 * Cada instância do servidor tem o seu índice. Na Vercel, isso quer dizer um por função
 * aquecida: o prazo de 60 s vale para cada uma.
 */
export function criarIndiceDeRotas({
  repositorio,
  ttlMs = TTL_DO_INDICE_MS,
  agora = Date.now,
}: OpcoesDoIndice): IndiceDeRotas {
  let retrato: RetratoDasRotas | null = null;
  let validoAte = Number.NEGATIVE_INFINITY;
  let carregando: Promise<RetratoDasRotas | null> | null = null;

  async function recarregar(): Promise<RetratoDasRotas | null> {
    try {
      retrato = await carregarRetrato(repositorio());
    } catch (erro) {
      console.error(
        "[proxy] o índice de rotas não recarregou; segue o anterior.",
        erro,
      );
    } finally {
      // Vale também para a falha: tenta de novo só depois de outro TTL.
      validoAte = agora() + ttlMs;
      carregando = null;
    }
    return retrato;
  }

  return {
    async obter() {
      if (agora() < validoAte) return retrato;
      carregando ??= recarregar();
      return carregando;
    },
  };
}

/**
 * `TTL_DO_INDICE_MS_TESTE`: **só para o e2e de banco** (`pnpm test:e2e:db`), que não pode
 * esperar 60 s pelo Proxy. Nunca configure em produção. Valor inválido não derruba o
 * Proxy: avisa e fica com os 60 s.
 */
export function ttlDoIndice(
  env: Readonly<Record<string, string | undefined>>,
): number {
  const bruto = env.TTL_DO_INDICE_MS_TESTE;
  if (bruto === undefined) return TTL_DO_INDICE_MS;
  const valor = /^\d+$/.test(bruto) ? Number(bruto) : Number.NaN;
  if (Number.isSafeInteger(valor) && valor >= 100) return valor;
  console.error(
    `TTL_DO_INDICE_MS_TESTE inválido ("${bruto}"): use um inteiro ≥ 100. Ficando com ${TTL_DO_INDICE_MS} ms.`,
  );
  return TTL_DO_INDICE_MS;
}

// ---------------------------------------------------------------------------
// Regra de 404
// ---------------------------------------------------------------------------

/**
 * Regra única de 404 das rotas dinâmicas (ADR 0006): o Proxy chama esta função antes da
 * renderização. Ela consulta o índice, montado com as mesmas consultas das páginas
 * (`list`, `listEditorias`, `listTags`), então o resultado é o de `getBySlug` e
 * `montarListagem`: editoria fora da lista fechada, editoria ou tag sem matéria visível e
 * `?pagina=` inválido ou além da última página dão 404.
 *
 * Caminhos fora de `/materias/<slug>`, `/editorias/<slug>` e `/tags/<slug>` passam sem
 * carregar o índice. Sem índice (o banco nunca respondeu), passam também: a página decide.
 */
export async function rotaExiste(
  indice: IndiceDeRotas,
  url: EnderecoDaRota,
): Promise<boolean> {
  const partes = ROTA.exec(url.pathname);
  if (!partes) return true;
  const [, rota, bruto] = partes;
  const slug = decodificar(bruto);
  if (slug === null) return false;

  const retrato = await indice.obter();
  if (retrato === null) return true;

  if (rota === "materias") return retrato.materias.has(slug);

  const pagina = lerPagina(valorDaPagina(url));
  if (pagina === null) return false;
  if (rota === "editorias" && !isEditoria(slug)) return false;
  const total = (
    rota === "editorias" ? retrato.paginasDasEditorias : retrato.paginasDasTags
  ).get(slug);
  return total !== undefined && pagina <= total;
}
