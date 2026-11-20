import { describe, expect, it, vi } from "vitest";
import {
  lerTermo,
  montarBusca,
  rotuloDosResultados,
  TAMANHO_MAXIMO_DO_TERMO,
} from "@/lib/busca";
import { metadadosDaBusca } from "@/lib/seo";
import { artigo, repositorioEmMemoria } from "./helpers/repositorio-em-memoria";

describe("lerTermo", () => {
  it("sem valor, devolve string vazia", () => {
    expect(lerTermo(undefined)).toBe("");
    expect(lerTermo("")).toBe("");
  });

  it("só espaços viram string vazia", () => {
    expect(lerTermo("   ")).toBe("");
    expect(lerTermo(" \t\n ")).toBe("");
  });

  it("apara os espaços das pontas e preserva os do meio", () => {
    expect(lerTermo("  são paulo  ")).toBe("são paulo");
  });

  it("array (q repetido na query): usa o primeiro item", () => {
    expect(lerTermo(["ventania", "serras"])).toBe("ventania");
    expect(lerTermo([" ventania ", "serras"])).toBe("ventania");
    expect(lerTermo([])).toBe("");
  });

  it("corta em 100 caracteres", () => {
    expect(TAMANHO_MAXIMO_DO_TERMO).toBe(100);
    const longo = "a".repeat(150);
    expect(lerTermo(longo)).toBe("a".repeat(100));
  });

  it("apara antes de cortar: espaços na ponta não gastam o limite", () => {
    const termo = `${" ".repeat(20)}${"b".repeat(100)}`;
    expect(lerTermo(termo)).toBe("b".repeat(100));
  });

  it("depois do corte, não sobra espaço na ponta", () => {
    const termo = `${"c".repeat(99)} d`;
    expect(lerTermo(termo)).toBe("c".repeat(99));
  });
});

describe("montarBusca", () => {
  const repositorio = () =>
    repositorioEmMemoria([
      artigo("alfa-ventania", "2026-10-10", "cronica"),
      artigo("bravo-ventania", "2026-10-20", "analise", { ficticio: false }),
      artigo("charlie-serras", "2026-10-15", "noticia"),
    ]);

  it("termo vazio ou só espaços: estado vazio, sem chamar o search()", async () => {
    const repo = repositorio();
    const search = vi.spyOn(repo, "search");
    expect(await montarBusca(repo, "")).toEqual({ estado: "vazia" });
    expect(await montarBusca(repo, "   ")).toEqual({ estado: "vazia" });
    expect(search).not.toHaveBeenCalled();
  });

  it("nada encontrado: sem-resultado com o termo", async () => {
    expect(await montarBusca(repositorio(), "zzzzqqq")).toEqual({
      estado: "sem-resultado",
      termo: "zzzzqqq",
    });
  });

  it("com resultado: os itens na ordem do search() (mais nova primeiro)", async () => {
    const busca = await montarBusca(repositorio(), "ventania");
    expect(busca.estado).toBe("com-resultado");
    if (busca.estado !== "com-resultado") return;
    expect(busca.termo).toBe("ventania");
    expect(busca.itens.map((i) => i.slug)).toEqual([
      "bravo-ventania",
      "alfa-ventania",
    ]);
  });

  it("usa só o search() do repositório", async () => {
    const repo = repositorio();
    const list = vi.spyOn(repo, "list");
    const search = vi.spyOn(repo, "search");
    await montarBusca(repo, "serras");
    expect(search).toHaveBeenCalledWith("serras");
    expect(list).not.toHaveBeenCalled();
  });
});

describe("rotuloDosResultados", () => {
  it("singular e plural", () => {
    expect(rotuloDosResultados(1)).toBe("resultado");
    expect(rotuloDosResultados(2)).toBe("resultados");
  });
});

describe("metadadosDaBusca", () => {
  it("sem termo: título 'Busca'", () => {
    expect(metadadosDaBusca("").title).toBe("Busca");
  });

  it("com termo: título 'Busca: <termo>'", () => {
    expect(metadadosDaBusca("são ciríaco").title).toBe("Busca: são ciríaco");
  });

  it("noindex, follow e canonical em /busca, com ou sem termo", () => {
    for (const termo of ["", "ventania"]) {
      const m = metadadosDaBusca(termo);
      expect(m.robots).toEqual({ index: false, follow: true });
      expect(m.alternates?.canonical).toBe("/busca");
    }
  });
});
