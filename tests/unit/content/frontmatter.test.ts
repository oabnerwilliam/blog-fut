import { describe, expect, it } from "vitest";
import { ContentError } from "@/lib/content/errors";
import { separarFrontmatter } from "@/lib/content/frontmatter";

describe("separarFrontmatter", () => {
  it("separa os dados e o corpo sem alterar o corpo", () => {
    const corpo = "  Primeira linha  com espaços.\n\n“Aspas” -- ...\n\n";
    const r = separarFrontmatter(
      "x.md",
      `---\nslug: x\nautor: A\n---\n${corpo}`,
    );
    expect(r.dados).toEqual({ slug: "x", autor: "A" });
    expect(r.corpo).toBe(corpo);
    expect(r.linhaInicialDoCorpo).toBe(5);
  });

  it("remove só uma quebra de linha depois do --- de fechamento", () => {
    expect(separarFrontmatter("x.md", "---\na: 1\n---\n\nTexto").corpo).toBe(
      "\nTexto",
    );
    expect(separarFrontmatter("x.md", "---\na: 1\n---").corpo).toBe("");
  });

  it("lê CRLF e mantém os \r\n do corpo", () => {
    const r = separarFrontmatter(
      "x.md",
      "---\r\na: 1\r\n---\r\nUm\r\nDois\r\n",
    );
    expect(r.dados).toEqual({ a: 1 });
    expect(r.corpo).toBe("Um\r\nDois\r\n");
    expect(r.linhaInicialDoCorpo).toBe(4);
  });

  it("descarta o BOM inicial", () => {
    expect(separarFrontmatter("x.md", "﻿---\na: 1\n---\nC").dados).toEqual({
      a: 1,
    });
  });

  it("datas continuam texto (esquema core)", () => {
    const r = separarFrontmatter(
      "x.md",
      "---\npublicado_em: 2026-11-19\nf: sim\n---\n",
    );
    expect(r.dados).toEqual({ publicado_em: "2026-11-19", f: "sim" });
  });

  it("YAML malformado cita arquivo e linha", () => {
    const conteudo = '---\nslug: x\ntitulo: "sem fechar\nautor: A\n---\nCorpo';
    expect(() => separarFrontmatter("x.md", conteudo)).toThrow(ContentError);
    expect(() => separarFrontmatter("x.md", conteudo)).toThrow(/x\.md/);
    expect(() => separarFrontmatter("x.md", conteudo)).toThrow(/linha \d+/);
  });

  it("sem frontmatter → erro", () => {
    expect(() => separarFrontmatter("x.md", "Só texto")).toThrow(
      /x\.md: frontmatter ausente/,
    );
  });

  it("sem --- de fechamento → erro", () => {
    expect(() => separarFrontmatter("x.md", "---\na: 1\nTexto")).toThrow(
      /x\.md: .*fechamento/,
    );
  });

  it("chave duplicada → erro", () => {
    expect(() => separarFrontmatter("x.md", "---\na: 1\na: 2\n---\n")).toThrow(
      /x\.md: YAML inválido na linha 3/,
    );
  });

  it.each(["---\n---\n", "---\n- a\n---\n", "---\ntexto\n---\n"])(
    "frontmatter que não é objeto → erro (%#)",
    (conteudo) => {
      expect(() => separarFrontmatter("x.md", conteudo)).toThrow(
        /x\.md: frontmatter precisa ser um objeto/,
      );
    },
  );
});
