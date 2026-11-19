/**
 * Casos de borda acrescentados pelo QA (história 02), lendo do disco:
 * MOSTRAR_EXEMPLOS=false por getRepository() em todos os métodos, CRLF real,
 * TZ=America/Sao_Paulo e slugs hostis no getBySlug.
 */
import { cpSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { getRepository } from "@/lib/content";
import { FileArticleRepository } from "@/lib/content/file-repository";
import { CORPO_TIPOGRAFICO } from "../../unit/content/helpers/corpo-tipografico";
import { montarMateria } from "../../unit/content/helpers/materia";
import { fixture } from "./helpers";

let raiz: string;

beforeAll(() => {
  // Cópia da fixture "basico" numa pasta temporária com o layout real (<cwd>/content).
  raiz = mkdtempSync(path.join(tmpdir(), "blog-fut-qa-"));
  cpSync(fixture("basico"), path.join(raiz, "content"), { recursive: true });
  const crlf = montarMateria(
    {
      slug: "foxtrot-crlf",
      publicado_em: "2026-08-01",
      tags: ["fc-aurora"],
      ficticio: false,
    },
    CORPO_TIPOGRAFICO,
  ).replace(/\n/g, "\r\n");
  writeFileSync(
    path.join(raiz, "content", "materias", "foxtrot-crlf.md"),
    crlf,
  );
});

afterAll(() => {
  rmSync(raiz, { recursive: true, force: true });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

function repositorioDoAmbiente(mostrar: string | undefined) {
  vi.spyOn(process, "cwd").mockReturnValue(raiz);
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.stubEnv("CONTENT_SOURCE", undefined);
  vi.stubEnv("MOSTRAR_EXEMPLOS", mostrar);
  return getRepository();
}

const FICTICIAS = ["charlie-cronica", "eco-perfil"];

describe("QA: MOSTRAR_EXEMPLOS=false via getRepository()", () => {
  it("esconde as fictícias em todos os métodos e filtros", async () => {
    const r = repositorioDoAmbiente("false");

    const tudo = await r.list({ pageSize: 100 });
    expect(tudo.itens.map((a) => a.slug)).toEqual([
      "alfa-cronica",
      "bravo-analise",
      "delta-noticia",
      "foxtrot-crlf",
    ]);
    expect(tudo.itens.every((a) => !a.ficticio)).toBe(true);

    const paginada = await r.list({ pageSize: 3, page: 2 });
    expect(paginada).toMatchObject({ total: 4, totalPaginas: 2, pagina: 2 });
    expect(paginada.itens.map((a) => a.slug)).toEqual(["foxtrot-crlf"]);

    expect((await r.list({ editoria: "perfil" })).total).toBe(0);
    expect((await r.list({ tag: "liga-da-serra" })).total).toBe(0);
    expect(
      (await r.list({ editoria: "cronica", tag: "sao-paulo-do-vale" })).total,
    ).toBe(0);

    for (const slug of FICTICIAS) expect(await r.getBySlug(slug)).toBeNull();

    // Termos que só existem nas fictícias (título, tag e rótulo).
    expect(await r.search("São Paulo do Vale")).toEqual([]);
    expect(await r.search("liga da serra")).toEqual([]);
    expect(await r.search("LIGA-DA-SERRA")).toEqual([]);
    const geral = await r.search("a");
    expect(geral.some((a) => FICTICIAS.includes(a.slug))).toBe(false);

    const editorias = await r.listEditorias();
    expect(editorias).toHaveLength(7);
    expect(editorias.reduce((s, e) => s + e.total, 0)).toBe(4);
    expect(editorias.find((e) => e.slug === "perfil")?.total).toBe(0);

    const tags = await r.listTags();
    expect(tags.map((t) => t.slug)).not.toContain("liga-da-serra");
    expect(tags.map((t) => t.slug)).not.toContain("sao-paulo-do-vale");
    expect(tags.find((t) => t.slug === "fc-aurora")?.total).toBe(4);
  });

  it("com MOSTRAR_EXEMPLOS=true as fictícias voltam", async () => {
    const r = repositorioDoAmbiente("true");
    expect((await r.list()).total).toBe(6);
    for (const slug of FICTICIAS)
      expect(await r.getBySlug(slug)).not.toBeNull();
  });
});

describe("QA: CRLF lido do disco", () => {
  it("arquivo CRLF no disco expõe o corpo com os \\r\\n, caractere por caractere", async () => {
    const r = repositorioDoAmbiente(undefined);
    const artigo = await r.getBySlug("foxtrot-crlf");
    expect(artigo?.corpo_md).toBe(CORPO_TIPOGRAFICO.replace(/\n/g, "\r\n"));
    expect(artigo?.titulo).toBe("Título de teste");
    expect(artigo?.publicado_em).toBe("2026-08-01");
  });
});

describe("QA: TZ=America/Sao_Paulo no repositório", () => {
  it("as datas das fixtures não mudam de dia e a ordem se mantém", async () => {
    vi.stubEnv("TZ", "America/Sao_Paulo");
    expect(new Date(2026, 0, 1).getTimezoneOffset()).toBe(180);
    const r = new FileArticleRepository({
      contentDir: fixture("basico"),
      mostrarExemplos: true,
      avisar: () => {},
    });
    const { itens } = await r.list();
    expect(itens.map((a) => a.publicado_em)).toEqual([
      "2026-10-20",
      "2026-10-10",
      "2026-10-10",
      "2026-10-01",
      "2026-09-15",
    ]);
    expect(typeof itens[0].publicado_em).toBe("string");
  });
});

describe("QA: getBySlug com slugs hostis", () => {
  const r = new FileArticleRepository({
    contentDir: fixture("basico"),
    mostrarExemplos: true,
    avisar: () => {},
  });

  it.each([
    "alfa-cronica.md",
    "alfa-cronica/",
    "ALFA-CRONICA",
    " alfa-cronica",
    "alfa-cronica ",
    "alfa-cronica\n",
    "alfa-cronica\u0000",
    "alfa\u2010cronica",
    "\uFF41lfa-cronica",
    "%2e%2e%2fpackage",
    "..%2F..%2Fpackage",
    "/etc/passwd",
    "C:\\Windows\\win.ini",
    "materias/alfa-cronica",
    "../entrada/fantasma-entrada",
    "fantasma-entrada",
    "__proto__",
    "constructor",
    "toString",
  ])("%j → null", async (slug) => {
    expect(await r.getBySlug(slug)).toBeNull();
  });

  it("valores não-texto em tempo de execução → null, sem lançar", async () => {
    for (const valor of [undefined, null, 1, {}, []]) {
      expect(await r.getBySlug(valor as unknown as string)).toBeNull();
    }
  });

  it.each([Number.POSITIVE_INFINITY, "2" as unknown as number])(
    "page não inteiro em tempo de execução (%j) → RangeError",
    async (page) => {
      await expect(r.list({ page })).rejects.toThrow(RangeError);
    },
  );
});
