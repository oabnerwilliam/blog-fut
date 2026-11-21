import { describe, expect, it } from "vitest";
import { segredoConfere } from "@/lib/segredo";

/** Comparação dos segredos das rotas de API (revalidar e manter-ativo). */
describe("segredoConfere", () => {
  it("igual → true", () => {
    expect(segredoConfere("abc123", "abc123")).toBe(true);
  });

  it.each([
    ["diferente, mesmo tamanho", "abc124", "abc123"],
    ["tamanho diferente", "abc", "abc123"],
    ["mais longo", "abc1234", "abc123"],
    ["recebido ausente", null, "abc123"],
    ["esperado ausente", "abc123", undefined],
    ["esperado vazio", "", ""],
    ["esperado só com espaços", "  ", "  "],
  ])("%s → false", (_caso, recebido, esperado) => {
    expect(segredoConfere(recebido, esperado)).toBe(false);
  });
});
