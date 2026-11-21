import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { montarBusca } from "@/lib/busca";
import { getRepository, type Article } from "@/lib/content";
import { contarPalavras } from "@/lib/content/reading-time";

/** O único teste que lê o content/ de verdade (critério 34). */
const TAGS_JSON = path.resolve(__dirname, "../../../content/tags.json");

/** A primeira matéria real (história 08), vinda do squad-fut. */
const PSG = "psg-balanco-temporada-2026-27-mercado-elenco-curto";

/**
 * O `final.md` de origem fica no squad-fut, fora deste repositório: sem ele (CI), o teste
 * de comparação fica `skip`. O hash abaixo protege o corpo publicado mesmo sem o original.
 */
const FINAL_MD = path.resolve(
  __dirname,
  "../../../../squad-fut/textos/2026-11-19-psg-balanco-temporada/final.md",
);
/**
 * sha256 do corpo do PSG com quebras LF, conferido contra o `final.md` em 2026-11-20 (8024
 * bytes). Com CRLF, como no `final.md` original, o hash é `7f35277c…ed78c` (8085 bytes).
 */
const SHA256_DO_CORPO_DO_PSG =
  "884c513e37c64308aade5a0b9e77e48d1ae3b90ccc4ca5b09f0de1a47b021f65";

function emLF(texto: string): string {
  return texto.replace(/\r\n/g, "\n");
}

/** Rede mínima contra nomes reais nas fictícias; a conferência humana continua com o code-reviewer. */
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
  it("o conteúdo real carrega sem erro: 8 matérias de exemplo e a do PSG", async () => {
    const lista = await getRepository().list({ pageSize: 100 });
    expect(lista.total).toBe(9);
    const artigos = await carregarTodas();
    expect(artigos).toHaveLength(9);
    expect(artigos.filter((a) => a.ficticio)).toHaveLength(8);
    expect(artigos.filter((a) => !a.ficticio).map((a) => a.slug)).toEqual([
      PSG,
    ]);
  });

  it("as fictícias não têm origem, são do Squad Fut e de antes de 2026-11-01, com datas distintas", async () => {
    const ficticias = (await carregarTodas()).filter((a) => a.ficticio);
    for (const artigo of ficticias) {
      expect(artigo.origem, artigo.slug).toBeNull();
      expect(artigo.autor, artigo.slug).toBe("Squad Fut");
      expect(artigo.publicado_em < "2026-11-01", artigo.slug).toBe(true);
    }
    expect(new Set(ficticias.map((a) => a.publicado_em)).size).toBe(8);
  });

  it("o PSG (história 08): real, com origem no squad-fut, editoria Análise e as 5 tags com rótulo certo", async () => {
    const psg = await getRepository().getBySlug(PSG);
    expect(psg).not.toBeNull();
    expect(psg!.ficticio).toBe(false);
    expect(psg!.origem).toBe(
      "squad-fut/textos/2026-11-19-psg-balanco-temporada",
    );
    expect(psg!.autor).toBe("Squad Fut");
    expect(psg!.publicado_em).toBe("2026-11-19");
    expect(psg!.editoria).toEqual({ slug: "analise", rotulo: "Análise" });
    expect(psg!.tags).toEqual([
      { slug: "psg", rotulo: "PSG" },
      { slug: "ligue-1", rotulo: "Ligue 1" },
      { slug: "champions-league", rotulo: "Champions League" },
      { slug: "luis-enrique", rotulo: "Luis Enrique" },
      { slug: "kvaratskhelia", rotulo: "Kvaratskhelia" },
    ]);
  });

  it("o corpo publicado do PSG tem o hash conferido contra o final.md (critério 2)", async () => {
    const psg = await getRepository().getBySlug(PSG);
    const corpo = emLF(psg!.corpo_md);
    expect(Buffer.byteLength(corpo, "utf8")).toBe(8024);
    expect(createHash("sha256").update(corpo).digest("hex")).toBe(
      SHA256_DO_CORPO_DO_PSG,
    );
  });

  it.skipIf(!existsSync(FINAL_MD))(
    "o corpo publicado do PSG é idêntico ao final.md, sem título e sem linha fina (critério 2)",
    async () => {
      const psg = await getRepository().getBySlug(PSG);
      const linhas = emLF(readFileSync(FINAL_MD, "utf8")).split("\n");
      // O final.md abre com "# título", linha vazia, "**linha fina**" e linha vazia.
      expect(linhas[0]).toBe(`# ${psg!.titulo}`);
      expect(linhas[1]).toBe("");
      expect(linhas[2]).toBe(`**${psg!.linha_fina}**`);
      expect(linhas[3]).toBe("");
      expect(emLF(psg!.corpo_md)).toBe(linhas.slice(4).join("\n"));
    },
  );

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

  it("nenhum nome real conhecido nas fictícias", async () => {
    const achados: string[] = [];
    const ficticias = (await carregarTodas()).filter((a) => a.ficticio);
    expect(ficticias).toHaveLength(8);
    for (const artigo of ficticias) {
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
