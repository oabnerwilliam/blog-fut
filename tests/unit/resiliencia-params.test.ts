import { afterEach, describe, expect, it, vi } from "vitest";
import type { ArticleRepository } from "@/lib/content";
import { paramsDasEditorias, paramsDasTags } from "@/lib/listagens";
import { paramsDasMaterias, SLUG_DE_RESERVA } from "@/lib/materias";

/**
 * Risco 4 do plano v2 (U11): com o banco fora do ar, o `generateStaticParams` não pode
 * quebrar o build. Ele registra o erro e devolve o valor de reserva.
 */
function repositorioQueLanca(): ArticleRepository {
  const falha = async () => {
    throw new Error("[conteúdo] falha ao ler do Supabase: fetch failed");
  };
  return {
    list: falha,
    getBySlug: falha,
    search: falha,
    listEditorias: falha,
    listTags: falha,
  };
}

describe("generateStaticParams com o repositório fora do ar", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    ["matérias", () => paramsDasMaterias(repositorioQueLanca()), "slug"],
    ["editorias", () => paramsDasEditorias(repositorioQueLanca()), "editoria"],
    ["tags", () => paramsDasTags(repositorioQueLanca()), "tag"],
  ] as const)(
    "%s: faz console.error e devolve o slug de reserva",
    async (_rotulo, gerar, chave) => {
      const erro = vi.spyOn(console, "error").mockImplementation(() => {});
      expect(await gerar()).toEqual([{ [chave]: SLUG_DE_RESERVA }]);
      expect(erro).toHaveBeenCalledTimes(1);
      expect(String(erro.mock.calls[0][0])).toContain("generateStaticParams");
    },
  );
});
