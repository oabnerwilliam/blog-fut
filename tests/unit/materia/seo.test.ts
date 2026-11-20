import { describe, expect, it } from "vitest";
import { rotuloDaEditoria } from "@/lib/editorias";
import {
  jsonLdDaMateria,
  metadadosDaMateria,
  serializarJsonLd,
} from "@/lib/seo";
import { NOME_DO_PORTAL } from "@/lib/site";
import { montarArtigo } from "../content/helpers/artigo";

const BASE = new URL("https://zonamista.example");

describe("metadadosDaMateria", () => {
  it("usa titulo_seo, meta_description, palavras_chave e canonical", () => {
    const m = metadadosDaMateria(
      montarArtigo({
        slug: "abc",
        titulo_seo: "Título SEO",
        meta_description: "Descrição SEO",
        palavras_chave: ["a", "b"],
      }),
    );
    expect(m.title).toBe("Título SEO");
    expect(m.description).toBe("Descrição SEO");
    expect(m.keywords).toEqual(["a", "b"]);
    expect(m.alternates?.canonical).toBe("/materias/abc");
  });

  it("cai em titulo e linha_fina e omite keywords vazias", () => {
    const m = metadadosDaMateria(montarArtigo());
    expect(m.title).toBe("Título de teste");
    expect(m.description).toBe("Linha fina de teste");
    expect(m).not.toHaveProperty("keywords");
  });

  it("monta Open Graph de artigo e Twitter summary", () => {
    const m = metadadosDaMateria(
      montarArtigo({ slug: "abc", publicado_em: "2026-10-20" }),
    );
    expect(m.openGraph).toMatchObject({
      type: "article",
      title: "Título de teste",
      description: "Linha fina de teste",
      url: "/materias/abc",
      publishedTime: "2026-10-20",
      section: rotuloDaEditoria("analise"),
      tags: ["FC Aurora"],
    });
    expect(m.twitter).toMatchObject({ card: "summary" });
  });

  it("marca noindex/nofollow só nas fictícias", () => {
    expect(metadadosDaMateria(montarArtigo({ ficticio: true })).robots).toEqual(
      { index: false, follow: false },
    );
    expect(metadadosDaMateria(montarArtigo()).robots).toBeUndefined();
  });
});

describe("jsonLdDaMateria", () => {
  it("é NewsArticle nas editorias informativas", () => {
    const j = jsonLdDaMateria(
      montarArtigo({ slug: "abc", publicado_em: "2026-10-20" }),
      BASE,
    );
    expect(j).toEqual({
      "@context": "https://schema.org",
      "@type": "NewsArticle",
      headline: "Título de teste",
      description: "Linha fina de teste",
      datePublished: "2026-10-20",
      inLanguage: "pt-BR",
      mainEntityOfPage: "https://zonamista.example/materias/abc",
      author: { "@type": "Organization", name: NOME_DO_PORTAL },
      publisher: { "@type": "Organization", name: NOME_DO_PORTAL },
    });
  });

  it("é Article em crônica e coluna", () => {
    for (const slug of ["cronica", "coluna"] as const) {
      const j = jsonLdDaMateria(
        montarArtigo({ editoria: { slug, rotulo: rotuloDaEditoria(slug) } }),
        BASE,
      );
      expect(j["@type"]).toBe("Article");
    }
  });
});

describe("serializarJsonLd", () => {
  it("escapa < para que </script> do frontmatter não feche o script", () => {
    const texto = serializarJsonLd({ headline: "</script><script>x()" });
    expect(texto).not.toContain("<");
    expect(texto).toContain("\\u003c/script>");
    expect(JSON.parse(texto)).toEqual({ headline: "</script><script>x()" });
  });
});
