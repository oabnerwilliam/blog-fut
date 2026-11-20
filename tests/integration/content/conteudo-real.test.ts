import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { montarBusca } from "@/lib/busca";
import { getRepository, type Article } from "@/lib/content";
import { contarPalavras } from "@/lib/content/reading-time";

/** O único teste que lê o content/ de verdade (critério 34). */
const TAGS_JSON = path.resolve(__dirname, "../../../content/tags.json");

/** Rede mínima contra nomes reais; a conferência humana continua com o code-reviewer. */
const NOMES_REAIS_PROIBIDOS = [
  "PSG",
  "Flamengo",
  "Champions",
  "Ligue 1",
  "Brasileirão",
  "Libertadores",
  "Premier League",
  "La Liga",
  "Real Madrid",
  "Barcelona",
];

async function carregarTodas(): Promise<Article[]> {
  const repositorio = getRepository();
  const { itens } = await repositorio.list({ pageSize: 100 });
  const artigos = await Promise.all(
    itens.map((item) => repositorio.getBySlug(item.slug)),
  );
  return artigos.filter((a): a is Article => a !== null);
}

beforeEach(() => {
  vi.stubEnv("CONTENT_SOURCE", undefined);
  vi.stubEnv("MOSTRAR_EXEMPLOS", undefined);
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("conteúdo real (content/)", () => {
  it("o conteúdo real carrega sem erro e tem as 8 matérias de exemplo", async () => {
    const lista = await getRepository().list({ pageSize: 100 });
    expect(lista.total).toBe(8);
    expect(await carregarTodas()).toHaveLength(8);
  });

  it("todas são fictícias, sem origem, do Squad Fut e antes de 2026-11-01, com datas distintas", async () => {
    const artigos = await carregarTodas();
    for (const artigo of artigos) {
      expect(artigo.ficticio, artigo.slug).toBe(true);
      expect(artigo.origem, artigo.slug).toBeNull();
      expect(artigo.autor, artigo.slug).toBe("Squad Fut");
      expect(artigo.publicado_em < "2026-11-01", artigo.slug).toBe(true);
    }
    expect(new Set(artigos.map((a) => a.publicado_em)).size).toBe(8);
  });

  it("variedade", async () => {
    const artigos = await carregarTodas();

    const porEditoria = new Map<string, number>();
    for (const a of artigos) {
      porEditoria.set(
        a.editoria.slug,
        (porEditoria.get(a.editoria.slug) ?? 0) + 1,
      );
    }
    expect(porEditoria.size).toBeGreaterThanOrEqual(5);
    expect(Math.max(...porEditoria.values())).toBeGreaterThanOrEqual(2);

    const tags = await getRepository().listTags();
    expect(tags.filter((t) => t.total >= 2).length).toBeGreaterThanOrEqual(3);

    const rotulos = JSON.parse(readFileSync(TAGS_JSON, "utf8")) as Record<
      string,
      string
    >;
    expect(tags.some((t) => !(t.slug in rotulos))).toBe(true);

    const palavras = artigos.map((a) => contarPalavras(a.corpo_md));
    expect(Math.max(...palavras)).toBeGreaterThanOrEqual(1000);
    expect(Math.min(...palavras)).toBeLessThan(400);

    expect(artigos.some((a) => /^## /m.test(a.corpo_md))).toBe(true);
    expect(artigos.some((a) => /^> /m.test(a.corpo_md))).toBe(true);
    expect(artigos.some((a) => /^- /m.test(a.corpo_md))).toBe(true);
    expect(artigos.some((a) => a.titulo.length > 100)).toBe(true);
    expect(
      artigos.some((a) => /São /.test(a.titulo) || /São /.test(a.corpo_md)),
    ).toBe(true);
  });

  it("busca (história 06): as três grafias de São Ciríaco dão as mesmas 3 matérias", async () => {
    const listas = await Promise.all(
      ["sao ciriaco", "SÃO CIRÍACO", "São Ciríaco"].map(async (termo) => {
        const busca = await montarBusca(getRepository(), termo);
        return busca.estado === "com-resultado"
          ? busca.itens.map((item) => item.slug)
          : [];
      }),
    );
    expect(listas[0]).toEqual([
      "ec-sao-ciriaco-anuncia-reforma-do-estadio",
      "a-ultima-tarde-do-mirante-velho",
      "o-silencio-de-sao-ciriaco-depois-do-rebaixamento",
    ]);
    expect(listas[1]).toEqual(listas[0]);
    expect(listas[2]).toEqual(listas[0]);
  });

  it("os corpos não começam com o título nem com a linha fina", async () => {
    for (const artigo of await carregarTodas()) {
      const inicio = artigo.corpo_md.trimStart();
      expect(inicio.startsWith(artigo.titulo), artigo.slug).toBe(false);
      expect(inicio.startsWith(artigo.linha_fina), artigo.slug).toBe(false);
    }
  });

  it("nenhum nome real conhecido", async () => {
    const achados: string[] = [];
    for (const artigo of await carregarTodas()) {
      const texto = [
        artigo.titulo,
        artigo.titulo_seo ?? "",
        artigo.linha_fina,
        artigo.meta_description ?? "",
        ...artigo.palavras_chave,
        ...artigo.tags.flatMap((t) => [t.slug, t.rotulo]),
        artigo.corpo_md,
      ]
        .join("\n")
        .toLowerCase();
      for (const nome of NOMES_REAIS_PROIBIDOS) {
        if (texto.includes(nome.toLowerCase())) {
          achados.push(`${artigo.slug}: ${nome}`);
        }
      }
    }
    expect(achados).toEqual([]);
  });
});
