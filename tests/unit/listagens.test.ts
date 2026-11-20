import { describe, expect, it } from "vitest";
import {
  caminhoDaListagem,
  lerPagina,
  montarListagem,
  paramsDasEditorias,
  paramsDasTags,
  rotuloDaContagem,
} from "@/lib/listagens";
import { SLUG_DE_RESERVA } from "@/lib/materias";
import { artigo, repositorioEmMemoria } from "./helpers/repositorio-em-memoria";

const TACA = { slug: "taca-das-serras", rotulo: "Taça das Serras" };
const LIGA = { slug: "liga-do-planalto-azul", rotulo: "Liga do Planalto Azul" };

const ARTIGOS = [
  artigo("cronica-nova", "2026-10-25", "cronica", { tags: [TACA] }),
  artigo("analise-real", "2026-10-22", "analise", {
    tags: [TACA, LIGA],
    ficticio: false,
  }),
  artigo("cronica-velha", "2026-10-18", "cronica", { tags: [LIGA] }),
];

describe("lerPagina", () => {
  it("sem valor devolve 1", () => {
    expect(lerPagina(undefined)).toBe(1);
  });

  it.each([
    ["1", 1],
    ["2", 2],
    ["10", 10],
    ["123", 123],
  ])("inteiro decimal %j devolve %d", (valor, esperado) => {
    expect(lerPagina(valor)).toBe(esperado);
  });

  it.each([
    "0",
    "-1",
    "1.5",
    "02",
    "abc",
    "",
    " 2",
    "2 ",
    "+2",
    "1e3",
    "0x2",
    "99999999999999999999",
  ])("%j devolve null", (valor) => {
    expect(lerPagina(valor)).toBeNull();
  });

  it("array (pagina repetida na query) devolve null", () => {
    expect(lerPagina(["1", "2"])).toBeNull();
    expect(lerPagina([])).toBeNull();
  });
});

describe("montarListagem", () => {
  const repositorio = repositorioEmMemoria(ARTIGOS);

  it("editoria com matérias: rótulo da taxonomia, total e itens na ordem", async () => {
    const listagem = await montarListagem(
      repositorio,
      { editoria: "cronica" },
      1,
    );
    expect(listagem).toEqual({
      tipo: "editoria",
      slug: "cronica",
      rotulo: "Crônica",
      total: 2,
      pagina: 1,
      totalPaginas: 1,
      itens: expect.any(Array),
      soFicticias: true,
    });
    expect(listagem?.itens.map((m) => m.slug)).toEqual([
      "cronica-nova",
      "cronica-velha",
    ]);
  });

  it("tag: rótulo vem de listTags e soFicticias é falso se houver uma real", async () => {
    const listagem = await montarListagem(repositorio, { tag: TACA.slug }, 1);
    expect(listagem).toMatchObject({
      tipo: "tag",
      slug: TACA.slug,
      rotulo: "Taça das Serras",
      total: 2,
      soFicticias: false,
    });
    expect(listagem?.itens.map((m) => m.slug)).toEqual([
      "cronica-nova",
      "analise-real",
    ]);
  });

  it("editoria fora da lista fechada devolve null", async () => {
    expect(
      await montarListagem(repositorio, { editoria: "inexistente" }, 1),
    ).toBeNull();
  });

  it("editoria da lista sem matéria visível devolve null (entrevista)", async () => {
    expect(
      await montarListagem(repositorio, { editoria: "entrevista" }, 1),
    ).toBeNull();
  });

  it("editoria só com fictícias e MOSTRAR_EXEMPLOS=false devolve null", async () => {
    const semExemplos = repositorioEmMemoria(ARTIGOS, {
      mostrarExemplos: false,
    });
    expect(
      await montarListagem(semExemplos, { editoria: "cronica" }, 1),
    ).toBeNull();
    expect(
      await montarListagem(semExemplos, { editoria: "analise" }, 1),
    ).toMatchObject({ total: 1, soFicticias: false });
  });

  it("tag sem matéria visível ou fora do formato devolve null", async () => {
    for (const tag of ["nao-existe", "ÇÇ", "", "../x"]) {
      expect(await montarListagem(repositorio, { tag }, 1), tag).toBeNull();
    }
  });

  it("página além de totalPaginas devolve null", async () => {
    expect(
      await montarListagem(repositorio, { editoria: "cronica" }, 2),
    ).toBeNull();
    expect(
      await montarListagem(repositorio, { tag: TACA.slug }, 99),
    ).toBeNull();
  });

  it("pagina a lista em páginas de 12 e soFicticias olha todas as páginas", async () => {
    const muitas = Array.from({ length: 25 }, (_, i) =>
      artigo(
        `cronica-${String(i).padStart(2, "0")}`,
        `2026-10-${String(28 - i).padStart(2, "0")}`,
        "cronica",
        // Só a última (página 3) é real.
        { ficticio: i !== 24 },
      ),
    );
    const repo = repositorioEmMemoria(muitas);
    const segunda = await montarListagem(repo, { editoria: "cronica" }, 2);
    expect(segunda).toMatchObject({
      pagina: 2,
      totalPaginas: 3,
      total: 25,
      soFicticias: false,
    });
    expect(segunda?.itens).toHaveLength(12);
    expect(segunda?.itens[0].slug).toBe("cronica-12");
    const terceira = await montarListagem(repo, { editoria: "cronica" }, 3);
    expect(terceira?.itens.map((m) => m.slug)).toEqual(["cronica-24"]);
    expect(await montarListagem(repo, { editoria: "cronica" }, 4)).toBeNull();
  });

  it("só busca pelo contrato do repositório (nada de getBySlug ou search)", async () => {
    const proibido = async () => {
      throw new Error("montarListagem não deve chamar isto");
    };
    const repo = { ...repositorio, getBySlug: proibido, search: proibido };
    expect(
      await montarListagem(repo, { editoria: "cronica" }, 1),
    ).not.toBeNull();
  });
});

describe("caminhoDaListagem", () => {
  it("página 1 sem query; demais com ?pagina=N", () => {
    expect(caminhoDaListagem("editoria", "cronica", 1)).toBe(
      "/editorias/cronica",
    );
    expect(caminhoDaListagem("editoria", "cronica")).toBe("/editorias/cronica");
    expect(caminhoDaListagem("tag", "taca-das-serras", 3)).toBe(
      "/tags/taca-das-serras?pagina=3",
    );
  });
});

describe("rotuloDaContagem", () => {
  it("singular e plural", () => {
    expect(rotuloDaContagem(1)).toBe("1 matéria");
    expect(rotuloDaContagem(2)).toBe("2 matérias");
    expect(rotuloDaContagem(12)).toBe("12 matérias");
  });
});

describe("params das rotas", () => {
  it("geram só editorias e tags com matéria visível", async () => {
    const repositorio = repositorioEmMemoria(ARTIGOS);
    expect(await paramsDasEditorias(repositorio)).toEqual([
      { editoria: "analise" },
      { editoria: "cronica" },
    ]);
    expect((await paramsDasTags(repositorio)).map((p) => p.tag).sort()).toEqual(
      [LIGA.slug, TACA.slug],
    );
  });

  it("sem matéria visível, usam o valor de reserva (lista vazia quebra o build)", async () => {
    const vazio = repositorioEmMemoria([]);
    expect(await paramsDasEditorias(vazio)).toEqual([
      { editoria: SLUG_DE_RESERVA },
    ]);
    expect(await paramsDasTags(vazio)).toEqual([{ tag: SLUG_DE_RESERVA }]);
  });
});
