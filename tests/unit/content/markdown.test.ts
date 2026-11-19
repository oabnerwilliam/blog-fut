import { describe, expect, it } from "vitest";
import { encontrarLinhasDeH1, renderMarkdown } from "@/lib/content/markdown";
import {
  CORPO_TIPOGRAFICO,
  LINHAS_VISIVEIS_ESPERADAS,
} from "./helpers/corpo-tipografico";

function textoVisivel(html: string): string[] {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&#x26;/g, "&")
    .replace(/&#x3C;/g, "<")
    .replace(/&lt;/g, "<")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .split("\n")
    .filter((linha) => linha !== "");
}

describe("renderMarkdown", () => {
  it("converte intertítulos, parágrafos, listas, citações, ênfase, negrito e links", async () => {
    const html = await renderMarkdown(
      [
        "## Intertítulo",
        "",
        "### Subtítulo",
        "",
        "Um parágrafo com *ênfase*, **negrito** e [link](https://exemplo.dev/a).",
        "",
        "- um",
        "- dois",
        "",
        "1. primeiro",
        "",
        "> citação",
      ].join("\n"),
    );
    expect(html).toContain("<h2>Intertítulo</h2>");
    expect(html).toContain("<h3>Subtítulo</h3>");
    expect(html).toContain("<p>Um parágrafo com <em>ênfase</em>");
    expect(html).toContain("<strong>negrito</strong>");
    expect(html).toContain('<a href="https://exemplo.dev/a">link</a>');
    expect(html).toMatch(/<ul>\s*<li>um<\/li>\s*<li>dois<\/li>\s*<\/ul>/);
    expect(html).toMatch(/<ol>\s*<li>primeiro<\/li>\s*<\/ol>/);
    expect(html).toMatch(/<blockquote>\s*<p>citação<\/p>\s*<\/blockquote>/);
  });

  it("renderMarkdown remove script e onerror", async () => {
    const html = await renderMarkdown(
      "<script>alert(1)</script><img src=x onerror=alert(1)>",
    );
    expect(html).not.toMatch(/<script/i);
    expect(html).not.toMatch(/onerror/i);
    expect(html).not.toContain("alert(1)");
  });

  it.each([
    ["iframe", '<iframe src="https://exemplo.dev"></iframe>', /<iframe/i],
    ["style", "<style>body { display: none }</style>", /<style|display: none/i],
    ["object", '<object data="x.swf">conteúdo</object>', /<object|conteúdo/i],
    ["embed", '<embed src="x.swf">', /<embed/i],
    ["on* em qualquer tag", '<p onclick="alert(1)">Oi</p>', /onclick/i],
    [
      "on* em link",
      '<a href="https://x.dev" onmouseover="x()">a</a>',
      /onmouseover/i,
    ],
    ["javascript: em markdown", "[x](javascript:alert(1))", /javascript:/i],
    [
      "JaVaScRiPt: em HTML",
      '<a href="JaVaScRiPt:alert(1)">x</a>',
      /javascript:/i,
    ],
    ["SCRIPT em maiúsculas", "<SCRIPT>alert(1)</SCRIPT>", /<script|alert/i],
  ])(
    "remove iframe, style, object, on* e javascript: (%s)",
    async (_caso, md, proibido) => {
      expect(await renderMarkdown(md)).not.toMatch(proibido);
    },
  );

  it("preserva o texto de HTML inofensivo", async () => {
    const html = await renderMarkdown('<p onclick="x">Gol aos 90</p>');
    expect(html).toContain("Gol aos 90");
    expect(html).not.toContain("onclick");
  });

  it("um <h1> em HTML cru perde a tag e mantém o texto", async () => {
    const html = await renderMarkdown("<h1>Título solto</h1>");
    expect(html).not.toMatch(/<h1/i);
    expect(html).toContain("Título solto");
  });

  it("não faz transformação tipográfica", async () => {
    const html = await renderMarkdown(CORPO_TIPOGRAFICO);
    expect(textoVisivel(html)).toEqual(LINHAS_VISIVEIS_ESPERADAS);
  });
});

describe("encontrarLinhasDeH1", () => {
  it("encontrarLinhasDeH1 acha ATX, setext e <h1>", () => {
    expect(encontrarLinhasDeH1("Texto\n\n# Título\n")).toEqual([3]);
    expect(encontrarLinhasDeH1("Título\n======\n\nTexto")).toEqual([1]);
    expect(encontrarLinhasDeH1("Texto\n\n<h1>Título</h1>\n")).toEqual([3]);
    expect(encontrarLinhasDeH1('Texto\n\n<H1 class="x">T</H1>\n')).toEqual([3]);
    expect(encontrarLinhasDeH1("# Um\n\nTexto\n\n# Dois")).toEqual([1, 5]);
    expect(encontrarLinhasDeH1("> # Dentro da citação")).toEqual([1]);
  });

  it("ignora # em bloco cercado, indentado, código em linha e #1 no meio do texto", () => {
    expect(encontrarLinhasDeH1("```\n# não é título\n```\n")).toEqual([]);
    expect(encontrarLinhasDeH1("Texto\n\n    # indentado\n")).toEqual([]);
    expect(encontrarLinhasDeH1("Use `# comentário` aqui.")).toEqual([]);
    expect(encontrarLinhasDeH1("Ele é o #1 do ranking.")).toEqual([]);
    expect(encontrarLinhasDeH1("#1 do ranking")).toEqual([]);
    expect(encontrarLinhasDeH1("## Intertítulo\n\n### Sub")).toEqual([]);
    expect(encontrarLinhasDeH1("Texto <h2>x</h2> e <h10>")).toEqual([]);
  });
});
