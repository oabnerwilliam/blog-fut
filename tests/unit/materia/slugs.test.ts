import { describe, expect, it } from "vitest";
import type { ArticleRepository, ListOptions } from "@/lib/content";
import {
  listarTodosOsSlugs,
  paramsDasMaterias,
  SLUG_DE_RESERVA,
} from "@/lib/materias";
import { montarArtigo } from "../content/helpers/artigo";

function repositorioFalso(slugs: string[], tamanho: number): ArticleRepository {
  const nada = async () => {
    throw new Error("não usado");
  };
  return {
    async list(opts: ListOptions = {}) {
      const pagina = opts.page ?? 1;
      const inicio = (pagina - 1) * tamanho;
      return {
        itens: slugs
          .slice(inicio, inicio + tamanho)
          .map((slug) => montarArtigo({ slug })),
        pagina,
        totalPaginas: Math.ceil(slugs.length / tamanho),
        total: slugs.length,
      };
    },
    getBySlug: nada,
    search: nada,
    listEditorias: nada,
    listTags: nada,
  };
}

describe("listarTodosOsSlugs", () => {
  it("percorre todas as páginas da listagem", async () => {
    const slugs = ["a", "b", "c", "d", "e"];
    expect(await listarTodosOsSlugs(repositorioFalso(slugs, 2))).toEqual(slugs);
  });

  it("devolve lista vazia quando não há matérias", async () => {
    expect(await listarTodosOsSlugs(repositorioFalso([], 2))).toEqual([]);
  });
});

describe("paramsDasMaterias", () => {
  it("mapeia cada slug para um param", async () => {
    expect(await paramsDasMaterias(repositorioFalso(["a", "b"], 1))).toEqual([
      { slug: "a" },
      { slug: "b" },
    ]);
  });

  it("sem matérias, devolve um slug de reserva (lista vazia quebra o build)", async () => {
    expect(await paramsDasMaterias(repositorioFalso([], 2))).toEqual([
      { slug: SLUG_DE_RESERVA },
    ]);
  });
});
