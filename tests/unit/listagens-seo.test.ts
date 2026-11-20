import { describe, expect, it } from "vitest";
import type { Listagem } from "@/lib/listagens";
import { metadadosDaListagem } from "@/lib/seo";

function listagem(parcial: Partial<Listagem> = {}): Listagem {
  return {
    tipo: "editoria",
    slug: "cronica",
    rotulo: "Crônica",
    total: 2,
    pagina: 1,
    totalPaginas: 1,
    itens: [],
    soFicticias: false,
    ...parcial,
  };
}

describe("metadadosDaListagem", () => {
  it("editoria: título é o rótulo, canonical sem query e descrição com a contagem", () => {
    const m = metadadosDaListagem(listagem());
    expect(m.title).toBe("Crônica");
    expect(m.alternates?.canonical).toBe("/editorias/cronica");
    expect(m.description).toContain("2 matérias");
    expect(m.description).toContain("Crônica");
    expect(m).not.toHaveProperty("robots");
  });

  it("tag: título com o prefixo 'Tag:' e contagem no singular", () => {
    const m = metadadosDaListagem(
      listagem({
        tipo: "tag",
        slug: "taca-das-serras",
        rotulo: "Taça das Serras",
        total: 1,
      }),
    );
    expect(m.title).toBe("Tag: Taça das Serras");
    expect(m.alternates?.canonical).toBe("/tags/taca-das-serras");
    expect(m.description).toContain("1 matéria ");
  });

  it("página N > 1 ganha o sufixo e o canonical com ?pagina=N", () => {
    const m = metadadosDaListagem(listagem({ pagina: 2, totalPaginas: 3 }));
    expect(m.title).toBe("Crônica · página 2");
    expect(m.alternates?.canonical).toBe("/editorias/cronica?pagina=2");
  });

  it("lista só de fictícias recebe noindex", () => {
    const m = metadadosDaListagem(listagem({ soFicticias: true }));
    expect(m.robots).toEqual({ index: false, follow: false });
  });
});
