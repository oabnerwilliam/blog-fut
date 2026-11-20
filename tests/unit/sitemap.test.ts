import { describe, expect, it } from "vitest";
import { entradasDoSitemap } from "@/lib/sitemap";
import { artigo, repositorioEmMemoria } from "./helpers/repositorio-em-memoria";

const BASE = new URL("https://zonamista.example");
const TACA = { slug: "taca-das-serras", rotulo: "Taça das Serras" };
const MARUJOS = { slug: "marujos-fc", rotulo: "Marujos FC" };
const LIGA = { slug: "liga-do-planalto-azul", rotulo: "Liga do Planalto Azul" };

describe("entradasDoSitemap", () => {
  it("tem a capa, as reais e as listas com pelo menos uma real; nenhuma fictícia", async () => {
    const repositorio = repositorioEmMemoria([
      artigo("ficticia-nova", "2026-10-28", "analise", { tags: [LIGA, TACA] }),
      artigo("real-nova", "2026-11-12", "cronica", {
        tags: [TACA],
        ficticio: false,
      }),
      artigo("real-velha", "2026-11-03", "noticia", {
        tags: [TACA, MARUJOS],
        ficticio: false,
      }),
      artigo("ficticia-velha", "2026-10-02", "perfil", { tags: [LIGA] }),
    ]);

    const entradas = await entradasDoSitemap(repositorio, BASE);

    expect(entradas).toEqual([
      { url: "https://zonamista.example/", lastModified: "2026-11-12" },
      {
        url: "https://zonamista.example/materias/real-nova",
        lastModified: "2026-11-12",
      },
      {
        url: "https://zonamista.example/materias/real-velha",
        lastModified: "2026-11-03",
      },
      {
        url: "https://zonamista.example/editorias/cronica",
        lastModified: "2026-11-12",
      },
      {
        url: "https://zonamista.example/editorias/noticia",
        lastModified: "2026-11-03",
      },
      {
        url: "https://zonamista.example/tags/taca-das-serras",
        lastModified: "2026-11-12",
      },
      {
        url: "https://zonamista.example/tags/marujos-fc",
        lastModified: "2026-11-03",
      },
    ]);
    const urls = entradas.map((e) => e.url).join("\n");
    expect(urls).not.toMatch(/ficticia|analise|perfil|liga-do-planalto-azul/);
  });

  it("só com fictícias, sai só a capa (sem data)", async () => {
    const repositorio = repositorioEmMemoria([
      artigo("a", "2026-10-28", "analise", { tags: [TACA] }),
      artigo("b", "2026-10-25", "cronica", { tags: [LIGA] }),
    ]);
    expect(await entradasDoSitemap(repositorio, BASE)).toEqual([
      { url: "https://zonamista.example/" },
    ]);
  });

  it("percorre todas as páginas da listagem", async () => {
    const reais = Array.from({ length: 14 }, (_, i) =>
      artigo(
        `real-${String(i).padStart(2, "0")}`,
        `2026-11-${String(20 - i).padStart(2, "0")}`,
        "reportagem",
        { ficticio: false },
      ),
    );
    const entradas = await entradasDoSitemap(repositorioEmMemoria(reais), BASE);
    // capa + 14 matérias + 1 editoria
    expect(entradas).toHaveLength(16);
    expect(entradas.at(-1)?.url).toBe(
      "https://zonamista.example/editorias/reportagem",
    );
  });

  it("monta as URLs absolutas a partir da base recebida (SITE_URL)", async () => {
    const repositorio = repositorioEmMemoria([
      artigo("real", "2026-11-12", "cronica", { ficticio: false }),
    ]);
    const entradas = await entradasDoSitemap(
      repositorio,
      new URL("http://localhost:3000"),
    );
    expect(entradas.map((e) => e.url)).toEqual([
      "http://localhost:3000/",
      "http://localhost:3000/materias/real",
      "http://localhost:3000/editorias/cronica",
    ]);
  });
});
