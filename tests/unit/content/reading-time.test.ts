import { describe, expect, it } from "vitest";
import {
  PALAVRAS_POR_MINUTO,
  contarPalavras,
  readingTime,
} from "@/lib/content/reading-time";

function palavras(n: number): string {
  return Array.from({ length: n }, (_, i) => `palavra${i}`).join(" ");
}

describe("readingTime", () => {
  it("usa 200 palavras por minuto", () => {
    expect(PALAVRAS_POR_MINUTO).toBe(200);
  });

  it("readingTime com 1.360 palavras → 7", () => {
    expect(contarPalavras(palavras(1360))).toBe(1360);
    expect(readingTime(palavras(1360))).toBe(7);
  });

  it.each([
    [palavras(200), 1],
    [palavras(201), 2],
    ["", 1],
    ["   \n\t  ", 1],
  ])("arredonda para cima com mínimo 1 (caso %#)", (md, minutos) => {
    expect(readingTime(md)).toBe(minutos);
  });

  it("marcação não conta como palavra", () => {
    expect(contarPalavras("## Intertítulo")).toBe(1);
    expect(contarPalavras("**Gol** de *placa*")).toBe(3);
    expect(contarPalavras("> - — 1,5")).toBe(1);
  });
});
