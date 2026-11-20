import type { ArticleRepository } from "@/lib/content";
import {
  lerPagina,
  montarListagem,
  type FiltroDaListagem,
} from "@/lib/listagens";

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

/**
 * Regra única de 404 das rotas dinâmicas (ADR 0006): o Proxy chama esta função antes da
 * renderização e as páginas usam as mesmas consultas (`getBySlug`, `montarListagem`).
 * Caminhos fora de `/materias/<slug>`, `/editorias/<slug>` e `/tags/<slug>` passam.
 */
export async function rotaExiste(
  repositorio: ArticleRepository,
  url: EnderecoDaRota,
): Promise<boolean> {
  const partes = ROTA.exec(url.pathname);
  if (!partes) return true;
  const [, rota, bruto] = partes;
  const slug = decodificar(bruto);
  if (slug === null) return false;

  if (rota === "materias") {
    return (await repositorio.getBySlug(slug)) !== null;
  }

  const pagina = lerPagina(valorDaPagina(url));
  if (pagina === null) return false;
  const filtro: FiltroDaListagem =
    rota === "editorias" ? { editoria: slug } : { tag: slug };
  return (await montarListagem(repositorio, filtro, pagina)) !== null;
}
