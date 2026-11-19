/**
 * Casos de borda acrescentados pelo QA (história 02): sanitização além do plano,
 * h1 em código, corpo imutável com CRLF e datas que não são de calendário.
 */
import { describe, expect, it } from "vitest";
import { ContentError } from "@/lib/content/errors";
import { separarFrontmatter } from "@/lib/content/frontmatter";
import { encontrarLinhasDeH1, renderMarkdown } from "@/lib/content/markdown";
import { parseArticleFile } from "@/lib/content/parse-article";
import { CORPO_TIPOGRAFICO } from "./helpers/corpo-tipografico";
import { linhasDoFrontmatter, montarMateria } from "./helpers/materia";

const ARQUIVO = "materia-teste.md";
const rotulo = (slug: string) => slug;

function erroDe(conteudo: string): string {
  try {
    parseArticleFile(ARQUIVO, conteudo, rotulo);
  } catch (erro) {
    expect(erro).toBeInstanceOf(ContentError);
    return (erro as Error).message;
  }
  throw new Error("esperava um ContentError");
}

/** Nenhum atributo de evento, em qualquer tag. */
const ATRIBUTO_ON = /<[^>]*\son[a-z]+\s*=/i;
/** Nenhum esquema executável ou data: num href/src/action/etc. */
const ESQUEMA_PERIGOSO = /(?:javascript|vbscript|data)\s*:/i;

describe("QA: sanitização além do plano", () => {
  it.each([
    ["svg onload", "<svg onload=alert(1)><circle r=1></circle></svg>"],
    ["svg com script", "<svg><script>alert(1)</script></svg>"],
    ["img onerror sem aspas e maiúsculas", "<IMG SRC=x ONERROR=alert(1)>"],
    ["details ontoggle", "<details open ontoggle=alert(1)>x</details>"],
    ["input onfocus", "<input autofocus onfocus=alert(1)>"],
    ["body onload", "<body onload=alert(1)>x</body>"],
    ["video onerror", "<video><source onerror=alert(1)></video>"],
    ["math com style", "<math><mtext><style>x{}</style></mtext></math>"],
  ])("sem atributo on* nem tag ativa (%s)", async (_caso, md) => {
    const html = await renderMarkdown(md);
    expect(html).not.toMatch(ATRIBUTO_ON);
    expect(html).not.toMatch(/<(?:svg|script|style|math|body)\b/i);
    // O esquema do GitHub mantém <input type="checkbox" disabled> (listas de tarefas).
    expect(html).not.toMatch(/autofocus/i);
    expect(html).not.toContain("alert(1)");
  });

  it.each([
    ["markdown em maiúsculas", "[x](JAVASCRIPT:alert(1))"],
    ["markdown com entidade decimal", "[x](&#106;avascript:alert(1))"],
    ["markdown com entidade hex", "[x](&#x6A;avascript:alert(1))"],
    ["markdown em imagem", "![x](javascript:alert(1))"],
    ["markdown autolink", "<javascript:alert(1)>"],
    ["html com entidade decimal", '<a href="&#106;avascript:alert(1)">x</a>'],
    ["html com entidade hex", '<a href="&#x6A;&#x61;vascript:alert(1)">x</a>'],
    ["html com tab no meio", '<a href="java&#x09;script:alert(1)">x</a>'],
    ["html com espaço antes", '<a href="  JaVaScRiPt:alert(1)">x</a>'],
    ["html com nova linha", '<a href="java\nscript:alert(1)">x</a>'],
    ["vbscript", '<a href="vbscript:msgbox(1)">x</a>'],
    ["data: em href", '<a href="data:text/html;base64,PHNjcmlwdD4=">x</a>'],
    ["data: em markdown", "[x](data:text/html,<script>alert(1)</script>)"],
    ["data: em img", '<img src="data:image/svg+xml;base64,PHN2Zz4=">'],
    [
      "data: em imagem markdown",
      "![x](data:image/svg+xml,<svg/onload=alert(1)>)",
    ],
    [
      "form action",
      '<form action="javascript:alert(1)"><button>x</button></form>',
    ],
  ])("sem href/src executável (%s)", async (_caso, md) => {
    const html = await renderMarkdown(md);
    expect(html).not.toMatch(
      /(?:href|src|action|formaction)\s*=\s*"?\s*(?:javascript|vbscript|data)/i,
    );
    expect(html).not.toMatch(ATRIBUTO_ON);
    expect(html).not.toMatch(/<(?:form|button)\b/i);
  });

  it.each([
    [
      "iframe com srcdoc",
      '<iframe srcdoc="<script>alert(1)</script>"></iframe>',
    ],
    ["iframe em maiúsculas", '<IFRAME SRC="https://exemplo.dev"></IFRAME>'],
    ["style com @import", "<style>@import url(https://x.dev/a.css);</style>"],
    [
      "object com data javascript",
      '<object data="javascript:alert(1)"></object>',
    ],
    ["embed", '<embed src="javascript:alert(1)">'],
    [
      "meta refresh",
      '<meta http-equiv="refresh" content="0;url=https://x.dev">',
    ],
    ["base href", '<base href="https://x.dev/">'],
    ["link stylesheet", '<link rel="stylesheet" href="https://x.dev/a.css">'],
    ["template", "<template><script>alert(1)</script></template>"],
  ])("remove elementos perigosos com o conteúdo (%s)", async (_caso, md) => {
    const html = await renderMarkdown(md);
    expect(html).not.toMatch(
      /<(?:iframe|style|object|embed|meta|base|link|noscript|template|script)\b/i,
    );
    expect(html).not.toMatch(ESQUEMA_PERIGOSO);
    expect(html).not.toContain("alert(1)");
    expect(html).not.toContain("@import");
  });

  it("noscript some como tag; o conteúdo sobra só como texto inerte", async () => {
    // Observação do QA: o ADR 0004 põe noscript no strip, mas o parse5 lê o
    // conteúdo como HTML e ele sobrevive como <p>texto</p>, sem nada executável.
    const html = await renderMarkdown("<noscript><p>alert(1)</p></noscript>");
    expect(html).not.toMatch(/<noscript/i);
    expect(html).not.toMatch(ATRIBUTO_ON);
    expect(html).not.toMatch(/<script/i);
  });

  it("remove o atributo style (CSS com url(javascript:))", async () => {
    const html = await renderMarkdown(
      '<p style="background:url(javascript:alert(1))">Gol</p>',
    );
    expect(html).toContain("Gol");
    expect(html).not.toMatch(/style\s*=/i);
    expect(html).not.toMatch(ESQUEMA_PERIGOSO);
  });

  it("links http(s) e mailto continuam funcionando", async () => {
    const html = await renderMarkdown(
      "[a](https://exemplo.dev) [b](http://exemplo.dev) [c](mailto:x@exemplo.dev)",
    );
    expect(html).toContain('href="https://exemplo.dev"');
    expect(html).toContain('href="http://exemplo.dev"');
    expect(html).toContain('href="mailto:x@exemplo.dev"');
  });

  it("código com HTML perigoso sai escapado e visível", async () => {
    const html = await renderMarkdown(
      "```html\n<script>alert(1)</script>\n```\n\nE `<img onerror=x>` em linha.",
    );
    expect(html).not.toMatch(/<script/i);
    expect(html).not.toMatch(/<img/i);
    expect(html).toContain("&#x3C;script>alert(1)&#x3C;/script>");
  });
});

describe("QA: h1 dentro de código não conta", () => {
  it.each([
    ["cerca de til", "~~~\n# não é título\n~~~\n"],
    ["cerca com linguagem", "```md\n# não é título\n```\n"],
    ["<h1> em bloco cercado", "```html\n<h1>não é título</h1>\n```\n"],
    ["<h1> em código em linha", "Use `<h1>` com cuidado."],
    ["# em código em linha", "O comando `# sudo` é um comentário."],
    ["# escapado", "\\# não é título"],
    ["# sem espaço", "#semespaço"],
    ["hashtag no meio", "Torcida do #Ventania lotou."],
    ["cerca com 4 crases contendo ```", "````\n```\n# x\n```\n````\n"],
  ])("não acusa h1 (%s)", (_caso, md) => {
    expect(encontrarLinhasDeH1(md)).toEqual([]);
  });

  it("acusa o h1 depois do bloco de código, com a linha certa", () => {
    expect(encontrarLinhasDeH1("```\n# a\n```\n\n# b\n")).toEqual([5]);
  });

  it("acusa h1 dentro de item de lista", () => {
    expect(encontrarLinhasDeH1("- # título na lista")).toEqual([1]);
  });

  it("h1 num arquivo CRLF cita a linha certa do arquivo", () => {
    const k = linhasDoFrontmatter();
    const crlf = montarMateria(null, "Abertura.\n\n# Título\n").replace(
      /\n/g,
      "\r\n",
    );
    const mensagem = erroDe(crlf);
    expect(mensagem).toContain(ARQUIVO);
    expect(mensagem).toMatch(new RegExp(`linha ${k + 5}\\b`));
  });

  it("matéria com # só em código carrega sem erro e sem alterar o corpo", () => {
    const corpo = "~~~\n# a\n~~~\n\n    # indentado\n\nUse `# x`.\n";
    const { artigo } = parseArticleFile(
      ARQUIVO,
      montarMateria(null, corpo),
      rotulo,
    );
    expect(artigo.corpo_md).toBe(corpo);
  });
});

describe("QA: corpo imutável", () => {
  it("um --- no meio do corpo (linha horizontal) não é consumido", () => {
    const corpo = "Parte 1.\n\n---\n\nParte 2.\n---\n";
    expect(separarFrontmatter("x.md", `---\na: 1\n---\n${corpo}`).corpo).toBe(
      corpo,
    );
  });

  it("CRLF + BOM: o corpo tipográfico sai idêntico, com os \\r\\n", () => {
    const crlf = `﻿${montarMateria(null, CORPO_TIPOGRAFICO)}`.replace(
      /\n/g,
      "\r\n",
    );
    const { artigo } = parseArticleFile(ARQUIVO, crlf, rotulo);
    expect(artigo.corpo_md).toBe(CORPO_TIPOGRAFICO.replace(/\n/g, "\r\n"));
    expect(artigo.titulo).toBe("Título de teste");
  });

  it("quebras mistas (LF e CRLF) no corpo são preservadas", () => {
    const corpo = "Linha 1\r\nLinha 2\nLinha 3\r\n\r\n";
    expect(
      parseArticleFile(ARQUIVO, montarMateria(null, corpo), rotulo).artigo
        .corpo_md,
    ).toBe(corpo);
  });

  it("corpo sem quebra final e com espaços no fim das linhas sai igual", () => {
    const corpo =
      "Texto com espaço final   \n\tTab no começo\nSem quebra final";
    expect(
      parseArticleFile(ARQUIVO, montarMateria(null, corpo), rotulo).artigo
        .corpo_md,
    ).toBe(corpo);
  });

  it("frontmatter fechado no fim do arquivo → corpo vazio", () => {
    expect(separarFrontmatter("x.md", "---\na: 1\n---").corpo).toBe("");
    expect(separarFrontmatter("x.md", "---\r\na: 1\r\n---\r\n").corpo).toBe("");
  });
});

describe("QA: datas", () => {
  it.each([
    "2026-11-19T00:00:00Z",
    "2026-11-19 10:00",
    "2026-1-9",
    "26-11-19",
    "2026-00-10",
    "2026-11-00",
    "2025-02-29",
  ])("publicado_em %j → erro", (data) => {
    const mensagem = erroDe(montarMateria({ publicado_em: data }));
    expect(mensagem).toContain(ARQUIVO);
    expect(mensagem).toMatch(/publicado_em/);
  });

  it("2028-02-29 (bissexto) é aceito", () => {
    expect(
      parseArticleFile(
        ARQUIVO,
        montarMateria({ publicado_em: "2028-02-29" }),
        rotulo,
      ).artigo.publicado_em,
    ).toBe("2028-02-29");
  });

  it("data sem aspas, entre aspas simples e duplas vira o mesmo texto", () => {
    const base = montarMateria(null);
    for (const valor of ["2026-11-19", "'2026-11-19'", '"2026-11-19"']) {
      const conteudo = base.replace(
        /publicado_em: .*\n/,
        `publicado_em: ${valor}\n`,
      );
      expect(
        parseArticleFile(ARQUIVO, conteudo, rotulo).artigo.publicado_em,
      ).toBe("2026-11-19");
    }
  });
});
