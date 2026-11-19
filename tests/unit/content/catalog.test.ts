import { describe, expect, it } from "vitest";
import {
  buscar,
  compararArtigos,
  contarEditorias,
  contarTags,
  listar,
  montarCatalogo,
  obterPorSlug,
  paraResumo,
} from "@/lib/content/catalog";
import type { ArtigoCarregado } from "@/lib/content/parse-article";
import { TAMANHO_PADRAO_DA_PAGINA } from "@/lib/content/repository";
import type { Article } from "@/lib/content/types";
import {
  EDITORIAS,
  SLUGS_DE_EDITORIA,
  rotuloDaEditoria,
} from "@/lib/editorias";
import { montarArtigo } from "./helpers/artigo";

const [ANALISE, CRONICA, NOTICIA] = SLUGS_DE_EDITORIA;
const REPORTAGEM = SLUGS_DE_EDITORIA.at(-1)!;

function editoria(slug: (typeof SLUGS_DE_EDITORIA)[number]) {
  return { slug, rotulo: rotuloDaEditoria(slug) };
}

function tag(slug: string, rotulo = slug) {
  return { slug, rotulo };
}

function carregado(parcial: Partial<Article>): ArtigoCarregado {
  const artigo = montarArtigo(parcial);
  return { arquivo: `${artigo.slug}.md`, artigo };
}

const BASE: readonly ArtigoCarregado[] = [
  carregado({
    slug: "delta",
    publicado_em: "2026-10-01",
    editoria: editoria(NOTICIA),
    tags: [tag("fc-aurora", "FC Aurora")],
  }),
  carregado({
    slug: "alfa",
    publicado_em: "2026-10-20",
    editoria: editoria(CRONICA),
    tags: [
      tag("fc-aurora", "FC Aurora"),
      tag("copa-do-litoral", "Copa do Litoral"),
    ],
    corpo_md: "Um gol de placa no fim.",
  }),
  carregado({
    slug: "charlie",
    publicado_em: "2026-10-10",
    editoria: editoria(CRONICA),
    titulo: "Noite em São Paulo do Vale",
    tags: [tag("sao-paulo-do-vale", "São Paulo do Vale")],
    ficticio: true,
    origem: null,
  }),
  carregado({
    slug: "bravo",
    publicado_em: "2026-10-10",
    editoria: editoria(ANALISE),
    linha_fina: "Linha fina com tática",
    tags: [tag("fc-aurora", "FC Aurora"), tag("ligue-1", "Ligue 1")],
  }),
  carregado({
    slug: "eco",
    publicado_em: "2026-09-15",
    editoria: editoria(SLUGS_DE_EDITORIA[4]),
    tags: [tag("liga-da-serra", "Liga da Serra")],
    ficticio: true,
    origem: null,
  }),
];

const ORDEM = ["alfa", "bravo", "charlie", "delta", "eco"];

const todos = () => montarCatalogo(BASE, { mostrarExemplos: true });
const soReais = () => montarCatalogo(BASE, { mostrarExemplos: false });
const slugs = (itens: readonly { slug: string }[]) => itens.map((a) => a.slug);

describe("catalog", () => {
  it("compararArtigos: data decrescente e, no empate, slug crescente", () => {
    const a = montarArtigo({ slug: "a", publicado_em: "2026-10-10" });
    const b = montarArtigo({ slug: "b", publicado_em: "2026-10-10" });
    const c = montarArtigo({ slug: "c", publicado_em: "2026-10-20" });
    expect([a, b, c].sort(compararArtigos).map((x) => x.slug)).toEqual([
      "c",
      "a",
      "b",
    ]);
  });

  it("list() em ordem decrescente de data", () => {
    expect(slugs(listar(todos()).itens)).toEqual(ORDEM);
  });

  it("slug duplicado cita os dois arquivos", () => {
    const um = carregado({ slug: "a" });
    expect(() =>
      montarCatalogo(
        [
          { arquivo: "A.md", artigo: um.artigo },
          { arquivo: "a.md", artigo: um.artigo },
        ],
        { mostrarExemplos: true },
      ),
    ).toThrow(/A\.md[\s\S]*a\.md/);
  });

  it("slug duplicado é erro mesmo entre fictícias escondidas", () => {
    const um = carregado({ slug: "a", ficticio: true, origem: null });
    expect(() =>
      montarCatalogo(
        [
          { arquivo: "A.md", artigo: um.artigo },
          { arquivo: "a.md", artigo: um.artigo },
        ],
        { mostrarExemplos: false },
      ),
    ).toThrow(/A\.md/);
  });

  it("resumo não carrega corpo nem campos de SEO", () => {
    const resumo = paraResumo(montarArtigo());
    for (const campo of [
      "corpo_md",
      "titulo_seo",
      "meta_description",
      "palavras_chave",
      "origem",
    ]) {
      expect(campo in resumo).toBe(false);
    }
    for (const item of [
      ...listar(todos()).itens,
      ...buscar(todos(), "aurora"),
    ]) {
      expect("corpo_md" in item).toBe(false);
    }
  });

  it("o objeto devolvido é congelado", () => {
    const pagina = listar(todos());
    expect(Object.isFrozen(pagina)).toBe(true);
    expect(Object.isFrozen(pagina.itens)).toBe(true);
    expect(Object.isFrozen(pagina.itens[0])).toBe(true);
    expect(Object.isFrozen(todos().artigos)).toBe(true);
    expect(Object.isFrozen(buscar(todos(), "aurora")[0])).toBe(true);
    expect(Object.isFrozen(contarTags(todos())[0])).toBe(true);
  });

  it("filtro por editoria", () => {
    const cronicas = listar(todos(), { editoria: CRONICA });
    expect(slugs(cronicas.itens)).toEqual(["alfa", "charlie"]);
    expect(cronicas.total).toBe(2);
    for (const valor of [REPORTAGEM, "xyz"]) {
      expect(listar(todos(), { editoria: valor })).toEqual({
        itens: [],
        pagina: 1,
        total: 0,
        totalPaginas: 0,
      });
    }
  });

  it("filtro por tag", () => {
    expect(slugs(listar(todos(), { tag: "fc-aurora" }).itens)).toEqual([
      "alfa",
      "bravo",
      "delta",
    ]);
    expect(listar(todos(), { tag: "FC-AURORA" }).total).toBe(0);
    expect(
      slugs(listar(todos(), { editoria: CRONICA, tag: "fc-aurora" }).itens),
    ).toEqual(["alfa"]);
  });

  it("paginação", () => {
    const p1 = listar(todos(), { pageSize: 2 });
    expect(p1).toMatchObject({ pagina: 1, total: 5, totalPaginas: 3 });
    expect(p1.itens).toHaveLength(2);
    const p3 = listar(todos(), { page: 3, pageSize: 2 });
    expect(p3.itens).toHaveLength(1);
    expect(listar(todos(), { page: 4, pageSize: 2 })).toEqual({
      itens: [],
      pagina: 4,
      total: 5,
      totalPaginas: 3,
    });
  });

  it.each([0, -1, 1.5, Number.NaN])(
    "page ou pageSize inválido → RangeError (%s)",
    (v) => {
      expect(() => listar(todos(), { page: v })).toThrow(RangeError);
      expect(() => listar(todos(), { page: v })).toThrow(/"page"/);
      expect(() => listar(todos(), { pageSize: v })).toThrow(RangeError);
      expect(() => listar(todos(), { pageSize: v })).toThrow(/"pageSize"/);
    },
  );

  it("tamanho padrão da página é 12", () => {
    expect(TAMANHO_PADRAO_DA_PAGINA).toBe(12);
    const treze = Array.from({ length: 13 }, (_, i) =>
      carregado({ slug: `m-${String(i).padStart(2, "0")}` }),
    );
    const pagina = listar(montarCatalogo(treze, { mostrarExemplos: true }));
    expect(pagina.itens).toHaveLength(12);
    expect(pagina.totalPaginas).toBe(2);
  });

  it.each([
    "nao-existe",
    "",
    "ALFA",
    "%00",
    "../../package",
    "..\\..\\package",
    "materia/../outra",
  ])("getBySlug inexistente → null (%j)", (slug) => {
    expect(obterPorSlug(todos(), slug)).toBeNull();
  });

  it("getBySlug existente devolve o Article completo", () => {
    expect(obterPorSlug(todos(), "alfa")).toEqual(BASE[1].artigo);
  });

  it("listEditorias devolve as 7 na ordem de EDITORIAS", () => {
    const editorias = contarEditorias(todos());
    expect(editorias.map((e) => e.slug)).toEqual([...SLUGS_DE_EDITORIA]);
    expect(editorias.map((e) => e.rotulo)).toEqual(
      EDITORIAS.map((e) => e.rotulo),
    );
    expect(editorias.find((e) => e.slug === CRONICA)?.total).toBe(2);
    expect(editorias.find((e) => e.slug === REPORTAGEM)?.total).toBe(0);
  });

  it("listTags: só usadas, total desc, empate por rótulo pt-BR", () => {
    expect(contarTags(todos())).toEqual([
      { slug: "fc-aurora", rotulo: "FC Aurora", total: 3 },
      { slug: "copa-do-litoral", rotulo: "Copa do Litoral", total: 1 },
      { slug: "liga-da-serra", rotulo: "Liga da Serra", total: 1 },
      { slug: "ligue-1", rotulo: "Ligue 1", total: 1 },
      { slug: "sao-paulo-do-vale", rotulo: "São Paulo do Vale", total: 1 },
    ]);
  });

  it("busca ignora acentos e maiúsculas", () => {
    for (const q of ["sao paulo", "SÃO PAULO", "São Paulo"]) {
      expect(slugs(buscar(todos(), q))).toEqual(["charlie"]);
    }
  });

  it.each(["", "   "])("busca vazia → [] (%j)", (q) => {
    expect(buscar(todos(), q)).toEqual([]);
  });

  it("busca procura em linha fina, tags e corpo, na ordem de list()", () => {
    expect(slugs(buscar(todos(), "tática"))).toEqual(["bravo"]);
    expect(slugs(buscar(todos(), "ligue 1"))).toEqual(["bravo"]);
    expect(slugs(buscar(todos(), "gol de placa"))).toEqual(["alfa"]);
    expect(slugs(buscar(todos(), "aurora"))).toEqual([
      "alfa",
      "bravo",
      "delta",
    ]);
  });

  it("busca com vários termos exige todos", () => {
    expect(slugs(buscar(todos(), "aurora litoral"))).toEqual(["alfa"]);
    expect(buscar(todos(), "aurora serra")).toEqual([]);
  });

  it("MOSTRAR_EXEMPLOS=false esconde as fictícias", () => {
    const c = soReais();
    const lista = listar(c, { pageSize: 2 });
    expect(lista.total).toBe(3);
    expect(lista.totalPaginas).toBe(2);
    expect(slugs(listar(c).itens)).toEqual(["alfa", "bravo", "delta"]);
    expect(listar(c, { editoria: CRONICA }).total).toBe(1);
    expect(listar(c, { tag: "sao-paulo-do-vale" }).total).toBe(0);
    expect(obterPorSlug(c, "charlie")).toBeNull();
    expect(buscar(c, "sao paulo")).toEqual([]);
    expect(contarEditorias(c).find((e) => e.slug === CRONICA)?.total).toBe(1);
    const tags = contarTags(c).map((t) => t.slug);
    expect(tags).not.toContain("sao-paulo-do-vale");
    expect(tags).not.toContain("liga-da-serra");
  });
});
