import type { ArticleRepository, ArticleSummary } from "@/lib/content";

/** O termo é cortado neste tamanho antes de buscar e de exibir (decisão da história 06). */
export const TAMANHO_MAXIMO_DO_TERMO = 100;

export type Busca =
  | { readonly estado: "vazia" }
  | { readonly estado: "sem-resultado"; readonly termo: string }
  | {
      readonly estado: "com-resultado";
      readonly termo: string;
      readonly itens: readonly ArticleSummary[];
    };

/**
 * Lê o `q` da query. Repetido (`?q=a&q=b`), chega como array e vale o primeiro. Sem valor,
 * `""`. Apara, corta em 100 caracteres e apara de novo (o corte pode deixar um espaço na ponta).
 */
export function lerTermo(valor: string | string[] | undefined): string {
  const bruto = (Array.isArray(valor) ? valor[0] : valor) ?? "";
  return bruto.trim().slice(0, TAMANHO_MAXIMO_DO_TERMO).trim();
}

/**
 * Resultado da busca, só pelo `search()` do repositório (que já ignora acento e maiúsculas).
 * Sem termo útil, nem chama o repositório: é o estado vazio, não um "nenhum resultado".
 */
export async function montarBusca(
  repositorio: ArticleRepository,
  termo: string,
): Promise<Busca> {
  if (termo.trim() === "") return { estado: "vazia" };
  const itens = await repositorio.search(termo);
  return itens.length === 0
    ? { estado: "sem-resultado", termo }
    : { estado: "com-resultado", termo, itens };
}

/** "resultado" ou "resultados", para "1 resultado para …" e "3 resultados para …". */
export function rotuloDosResultados(total: number): string {
  return total === 1 ? "resultado" : "resultados";
}
