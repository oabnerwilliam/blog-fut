import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Paginacao } from "@/components/listagem/Paginacao";
import type { Listagem } from "@/lib/listagens";

/**
 * Com as 8 matérias de hoje não existe página 2 em nenhuma lista, então o componente é
 * testado com uma listagem falsa de 3 páginas.
 */
function listagem(pagina: number, totalPaginas = 3): Listagem {
  return {
    tipo: "tag",
    slug: "taca-das-serras",
    rotulo: "Taça das Serras",
    total: totalPaginas * 12,
    pagina,
    totalPaginas,
    itens: [],
    soFicticias: true,
  };
}

const renderizar = (l: Listagem) =>
  renderToStaticMarkup(createElement(Paginacao, { listagem: l }));

/** Pares [texto, href] dos links, na ordem do HTML. */
function links(html: string): [string, string][] {
  return [...html.matchAll(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/g)].map(
    ([, href, texto]) => [texto, href.replace(/&amp;/g, "&")],
  );
}

describe("Paginacao", () => {
  it("com uma página só, não aparece", () => {
    expect(renderizar(listagem(1, 1))).toBe("");
  });

  it("é uma nav rotulada 'Paginação' com 'Página N de M'", () => {
    const html = renderizar(listagem(2));
    expect(html).toMatch(/^<nav[^>]*aria-label="Paginação"/);
    expect(html).toContain("Página 2 de 3");
  });

  it("no meio: anteriores e próximas; a página 1 não leva ?pagina=1", () => {
    expect(links(renderizar(listagem(2)))).toEqual([
      ["← Anteriores", "/tags/taca-das-serras"],
      ["Próximas →", "/tags/taca-das-serras?pagina=3"],
    ]);
  });

  it("na primeira, só 'Próximas →'", () => {
    expect(links(renderizar(listagem(1)))).toEqual([
      ["Próximas →", "/tags/taca-das-serras?pagina=2"],
    ]);
  });

  it("na última, só '← Anteriores'", () => {
    expect(links(renderizar(listagem(3)))).toEqual([
      ["← Anteriores", "/tags/taca-das-serras?pagina=2"],
    ]);
  });

  it("a página atual não vira link", () => {
    const html = renderizar(listagem(2));
    expect(html).not.toMatch(/<a[^>]*>[^<]*Página 2 de 3/);
    expect(html).not.toContain('aria-current="page"');
  });
});
