/**
 * `diffDeLinhas` (história 17, critério 5): a comparação de duas revisões no histórico.
 * Função pura, sem dependência nova (LCS).
 */
import { describe, expect, it } from "vitest";
import { diffDeLinhas, resumoDoDiff } from "@/lib/admin/diff";

/** Uma linha por item: " a", "+b", "-c". Fácil de ler no erro do teste. */
function marcas(a: string, b: string): string[] {
  return diffDeLinhas(a, b).map(
    (l) =>
      `${l.tipo === "igual" ? " " : l.tipo === "adicionada" ? "+" : "-"}${l.texto}`,
  );
}

describe("diffDeLinhas", () => {
  it("iguais: tudo igual, com os números das duas versões", () => {
    expect(diffDeLinhas("a\nb\n", "a\nb\n")).toEqual([
      { tipo: "igual", texto: "a", linhaAntes: 1, linhaDepois: 1 },
      { tipo: "igual", texto: "b", linhaAntes: 2, linhaDepois: 2 },
    ]);
  });

  it("só adição: as linhas novas marcadas, com o número da versão nova", () => {
    expect(diffDeLinhas("a\nc", "a\nb\nc\nd")).toEqual([
      { tipo: "igual", texto: "a", linhaAntes: 1, linhaDepois: 1 },
      { tipo: "adicionada", texto: "b", linhaAntes: null, linhaDepois: 2 },
      { tipo: "igual", texto: "c", linhaAntes: 2, linhaDepois: 3 },
      { tipo: "adicionada", texto: "d", linhaAntes: null, linhaDepois: 4 },
    ]);
  });

  it("só remoção: as linhas que saíram, com o número da versão antiga", () => {
    expect(diffDeLinhas("a\nb\nc", "c")).toEqual([
      { tipo: "removida", texto: "a", linhaAntes: 1, linhaDepois: null },
      { tipo: "removida", texto: "b", linhaAntes: 2, linhaDepois: null },
      { tipo: "igual", texto: "c", linhaAntes: 3, linhaDepois: 1 },
    ]);
  });

  it("troca no meio: a remoção vem antes da adição", () => {
    expect(marcas("um\ndois\ntrês\nquatro", "um\nDOIS\nTRÊS\nquatro")).toEqual([
      " um",
      "-dois",
      "-três",
      "+DOIS",
      "+TRÊS",
      " quatro",
    ]);
  });

  it("mantém o máximo de linhas iguais (LCS), mesmo com repetição", () => {
    const resultado = marcas("a\nb\nc\na\nb\nb\na", "c\nb\na\nb\na\nc");
    const iguais = resultado.filter((l) => l.startsWith(" "));
    expect(iguais).toHaveLength(4);
    // Reconstrói as duas versões a partir do diff.
    expect(
      resultado.filter((l) => !l.startsWith("+")).map((l) => l.slice(1)),
    ).toEqual(["a", "b", "c", "a", "b", "b", "a"]);
    expect(
      resultado.filter((l) => !l.startsWith("-")).map((l) => l.slice(1)),
    ).toEqual(["c", "b", "a", "b", "a", "c"]);
  });

  it("corpo vazio: de vazio tudo é adição, para vazio tudo é remoção", () => {
    expect(diffDeLinhas("", "")).toEqual([]);
    expect(marcas("", "a\nb\n")).toEqual(["+a", "+b"]);
    expect(marcas("a\nb\n", "")).toEqual(["-a", "-b"]);
  });

  it("linha em branco no meio conta como linha", () => {
    expect(marcas("a\n\nb", "a\nb")).toEqual([" a", "-", " b"]);
  });

  it("CRLF e LF são a mesma quebra: nada muda só pelo fim de linha", () => {
    expect(marcas("a\r\nb\r\n", "a\nb\n")).toEqual([" a", " b"]);
    expect(marcas("a\rb", "a\nb")).toEqual([" a", " b"]);
    expect(marcas("a\r\nb\r\n", "a\nc\n")).toEqual([" a", "-b", "+c"]);
  });

  it("a quebra no fim do texto não vira uma linha vazia a mais", () => {
    expect(marcas("a\n", "a")).toEqual([" a"]);
  });

  it("espaço no fim da linha é diferença (o texto é literal)", () => {
    expect(marcas("a ", "a")).toEqual(["-a ", "+a"]);
  });

  it("textos grandes com prefixo e sufixo comuns continuam rápidos", () => {
    const comum = Array.from({ length: 5000 }, (_, i) => `linha ${i}`);
    const antes = [...comum, "meio antigo", ...comum].join("\n");
    const depois = [...comum, "meio novo", ...comum].join("\n");
    const inicio = performance.now();
    const resultado = diffDeLinhas(antes, depois);
    expect(performance.now() - inicio).toBeLessThan(1000);
    expect(resultado.filter((l) => l.tipo !== "igual")).toEqual([
      {
        tipo: "removida",
        texto: "meio antigo",
        linhaAntes: 5001,
        linhaDepois: null,
      },
      {
        tipo: "adicionada",
        texto: "meio novo",
        linhaAntes: null,
        linhaDepois: 5001,
      },
    ]);
  });
});

describe("resumoDoDiff", () => {
  it("conta as adições e as remoções", () => {
    expect(resumoDoDiff(diffDeLinhas("a\nb\nc", "a\nx\ny\nc"))).toEqual({
      adicionadas: 2,
      removidas: 1,
    });
    expect(resumoDoDiff([])).toEqual({ adicionadas: 0, removidas: 0 });
  });
});
