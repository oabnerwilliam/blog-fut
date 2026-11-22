import { describe, expect, it, vi } from "vitest";
import { ContentError } from "@/lib/content/errors";
import { carregarArtigosDoDisco } from "@/lib/content/disco";
import { FileArticleRepository } from "@/lib/content/file-repository";
import type { ArticleRepository } from "@/lib/content/repository";
import { readingTime } from "@/lib/content/reading-time";
import { SLUGS_DE_EDITORIA } from "@/lib/editorias";
import { CORPO_TIPOGRAFICO } from "../../unit/content/helpers/corpo-tipografico";
import { fixture } from "./helpers";

const ORDEM = [
  "alfa-cronica",
  "bravo-analise",
  "charlie-cronica",
  "delta-noticia",
  "eco-perfil",
];
const REPORTAGEM = SLUGS_DE_EDITORIA.at(-1)!;

function repo(
  nome = "basico",
  mostrarExemplos = true,
): { repositorio: ArticleRepository; avisar: ReturnType<typeof vi.fn> } {
  const avisar = vi.fn();
  return {
    repositorio: new FileArticleRepository({
      contentDir: fixture(nome),
      mostrarExemplos,
      avisar,
    }),
    avisar,
  };
}

const basico = (mostrarExemplos = true) =>
  repo("basico", mostrarExemplos).repositorio;
const slugs = (itens: readonly { slug: string }[]) => itens.map((a) => a.slug);

describe("FileArticleRepository", () => {
  it("editoria fora do enum → erro com o nome do arquivo", async () => {
    const promessa = repo("editoria-invalida").repositorio.list();
    await expect(promessa).rejects.toThrow(ContentError);
    await expect(promessa).rejects.toThrow(/materia-invalida\.md/);
    await expect(promessa).rejects.toThrow(/editoria/);
    await expect(promessa).rejects.toThrow(/opiniao/);
  });

  it("uma falha de carregamento não é memorizada: a próxima chamada lança de novo", async () => {
    const { repositorio } = repo("editoria-invalida");
    await expect(repositorio.list()).rejects.toThrow(/materia-invalida\.md/);
    await expect(repositorio.getBySlug("materia-invalida")).rejects.toThrow(
      /materia-invalida\.md/,
    );
  });

  it("ignora .gitkeep e arquivos que não são .md", async () => {
    const lista = await basico().list();
    expect(lista.total).toBe(5);
  });

  it("a caixa de entrada nunca é lida", async () => {
    const r = basico();
    expect(slugs((await r.list({ pageSize: 100 })).itens)).not.toContain(
      "fantasma-entrada",
    );
    expect(await r.getBySlug("fantasma-entrada")).toBeNull();
    expect(await r.search("fantasma")).toEqual([]);
    expect(
      (await r.listEditorias()).find((e) => e.slug === REPORTAGEM)?.total,
    ).toBe(0);
    expect((await r.listTags()).map((t) => t.slug)).not.toContain("fantasma");
  });

  it("pasta sem matérias", async () => {
    const r = repo("vazio").repositorio;
    expect(await r.list()).toEqual({
      itens: [],
      pagina: 1,
      total: 0,
      totalPaginas: 0,
    });
    const editorias = await r.listEditorias();
    expect(editorias).toHaveLength(7);
    expect(editorias.every((e) => e.total === 0)).toBe(true);
    expect(await r.listTags()).toEqual([]);
  });

  it("pasta materias inexistente → erro", async () => {
    await expect(repo("nao-existe").repositorio.list()).rejects.toThrow(
      /content\/materias não encontrada/,
    );
  });

  it("corpo é exposto sem nenhuma alteração", async () => {
    const artigo = await basico().getBySlug("alfa-cronica");
    expect(artigo?.corpo_md).toBe(CORPO_TIPOGRAFICO);
    expect(artigo).toEqual({
      slug: "alfa-cronica",
      titulo: "A noite em que o FC Aurora virou o jogo",
      linha_fina: "Crônica de uma virada no último minuto da Copa do Litoral",
      editoria: { slug: "cronica", rotulo: "Crônica" },
      tags: [
        { slug: "fc-aurora", rotulo: "FC Aurora" },
        { slug: "copa-do-litoral", rotulo: "Copa do Litoral" },
      ],
      publicado_em: "2026-10-20",
      autor: "Squad Fut",
      ficticio: false,
      tempo_de_leitura: readingTime(CORPO_TIPOGRAFICO),
      titulo_seo: null,
      meta_description: null,
      palavras_chave: [],
      origem: "squad-fut/textos/alfa-cronica",
      fonte: "squad",
      corpo_md: CORPO_TIPOGRAFICO,
    });
  });

  it("getBySlug devolve os campos de SEO quando existem", async () => {
    const artigo = await basico().getBySlug("bravo-analise");
    expect(artigo?.titulo_seo).toBe("FC Aurora e o bloco médio");
    expect(artigo?.meta_description).toBe("Análise tática do FC Aurora.");
    expect(artigo?.palavras_chave).toEqual(["tática", "bloco médio"]);
  });

  it("list() em ordem decrescente de data", async () => {
    expect(slugs((await basico().list()).itens)).toEqual(ORDEM);
  });

  it("filtro por editoria", async () => {
    const r = basico();
    const cronicas = await r.list({ editoria: "cronica" });
    expect(slugs(cronicas.itens)).toEqual(["alfa-cronica", "charlie-cronica"]);
    expect(cronicas.total).toBe(2);
    for (const editoria of [REPORTAGEM, "xyz"]) {
      const vazia = await r.list({ editoria });
      expect(vazia.itens).toEqual([]);
      expect(vazia.total).toBe(0);
    }
  });

  it("filtro por tag", async () => {
    const r = basico();
    const aurora = await r.list({ tag: "fc-aurora" });
    expect(aurora.total).toBe(3);
    expect(slugs(aurora.itens)).toEqual([
      "alfa-cronica",
      "bravo-analise",
      "delta-noticia",
    ]);
    expect((await r.list({ tag: "FC-AURORA" })).total).toBe(0);
    expect(
      slugs((await r.list({ editoria: "cronica", tag: "fc-aurora" })).itens),
    ).toEqual(["alfa-cronica"]);
  });

  it("paginação", async () => {
    const r = basico();
    const p1 = await r.list({ page: 1, pageSize: 2 });
    const p2 = await r.list({ page: 2, pageSize: 2 });
    const p3 = await r.list({ page: 3, pageSize: 2 });
    const p4 = await r.list({ page: 4, pageSize: 2 });
    expect(p1.itens).toHaveLength(2);
    expect(p1).toMatchObject({ pagina: 1, total: 5, totalPaginas: 3 });
    expect(p3.itens).toHaveLength(1);
    expect(p4).toEqual({ itens: [], pagina: 4, total: 5, totalPaginas: 3 });
    expect(slugs([...p1.itens, ...p2.itens, ...p3.itens])).toEqual(ORDEM);
    expect(await r.list({ pageSize: 2 })).toEqual(p1);
  });

  it.each([0, -1, 1.5])("paginação inválida → RangeError (%s)", async (v) => {
    const r = basico();
    await expect(r.list({ page: v })).rejects.toThrow(RangeError);
    await expect(r.list({ pageSize: v })).rejects.toThrow(RangeError);
  });

  it.each([
    "nao-existe",
    "",
    "BRAVO-ANALISE",
    "%00",
    "../../package",
    "..\\..\\package",
    "materia/../outra",
  ])("getBySlug inexistente → null (%j)", async (slug) => {
    expect(await basico().getBySlug(slug)).toBeNull();
  });

  it("listEditorias devolve as 7 na ordem de EDITORIAS", async () => {
    const editorias = await basico().listEditorias();
    expect(editorias.map((e) => e.slug)).toEqual([...SLUGS_DE_EDITORIA]);
    expect(editorias.find((e) => e.slug === "analise")?.rotulo).toBe("Análise");
    expect(Object.fromEntries(editorias.map((e) => [e.slug, e.total]))).toEqual(
      {
        analise: 1,
        cronica: 2,
        noticia: 1,
        coluna: 0,
        perfil: 1,
        entrevista: 0,
        reportagem: 0,
      },
    );
  });

  it("listTags: só usadas, total desc, empate por rótulo pt-BR", async () => {
    expect(await basico().listTags()).toEqual([
      { slug: "fc-aurora", rotulo: "FC Aurora", total: 3 },
      { slug: "copa-do-litoral", rotulo: "Copa do Litoral", total: 1 },
      { slug: "liga-da-serra", rotulo: "Liga da Serra", total: 1 },
      { slug: "ligue-1", rotulo: "Ligue 1", total: 1 },
      { slug: "sao-paulo-do-vale", rotulo: "São Paulo do Vale", total: 1 },
    ]);
  });

  it("tag sem rótulo no tags.json avisa uma vez por slug", async () => {
    const { repositorio, avisar } = repo("basico");
    await repositorio.list();
    await repositorio.listTags();
    const avisos = avisar.mock.calls.map(([mensagem]) => String(mensagem));
    expect(avisos.filter((m) => m.includes('"ligue-1"'))).toHaveLength(1);
    expect(avisos.some((m) => m.includes('"fc-aurora"'))).toBe(false);
  });

  it("busca ignora acentos e maiúsculas", async () => {
    const r = basico();
    for (const q of ["sao paulo", "SÃO PAULO", "São Paulo"]) {
      expect(slugs(await r.search(q))).toEqual(["charlie-cronica"]);
    }
  });

  it.each(["", "   "])("busca vazia → [] (%j)", async (q) => {
    expect(await basico().search(q)).toEqual([]);
  });

  it("busca procura em linha fina, tags e corpo", async () => {
    const r = basico();
    expect(slugs(await r.search("bloco medio"))).toEqual(["bravo-analise"]);
    expect(slugs(await r.search("ligue 1"))).toEqual(["bravo-analise"]);
    expect(slugs(await r.search("centro de treinamento"))).toEqual([
      "delta-noticia",
    ]);
  });

  it("tags.json malformado → erro citando tags.json", async () => {
    await expect(repo("tags-malformado").repositorio.list()).rejects.toThrow(
      /tags\.json/,
    );
  });

  it("sem tags.json usa o humanizado", () => {
    // A fixture `vazio` não tem tags.json; carregar não lança.
    expect(carregarArtigosDoDisco(fixture("vazio"), vi.fn())).toEqual([]);
  });

  it("MOSTRAR_EXEMPLOS=false esconde as fictícias", async () => {
    const r = basico(false);
    const lista = await r.list({ pageSize: 2 });
    expect(lista.total).toBe(3);
    expect(lista.totalPaginas).toBe(2);
    expect(slugs((await r.list()).itens)).toEqual([
      "alfa-cronica",
      "bravo-analise",
      "delta-noticia",
    ]);
    expect((await r.list({ editoria: "cronica" })).total).toBe(1);
    expect((await r.list({ tag: "sao-paulo-do-vale" })).total).toBe(0);
    expect(await r.getBySlug("charlie-cronica")).toBeNull();
    expect(await r.search("sao paulo")).toEqual([]);
    const editorias = await r.listEditorias();
    expect(editorias.find((e) => e.slug === "cronica")?.total).toBe(1);
    expect(editorias.find((e) => e.slug === "perfil")?.total).toBe(0);
    const tags = (await r.listTags()).map((t) => t.slug);
    expect(tags).not.toContain("sao-paulo-do-vale");
    expect(tags).not.toContain("liga-da-serra");
  });
});
