import { describe, expect, it } from "vitest";
import { DESCRICAO_DO_PORTAL, SLOGAN_LONGO } from "@/lib/site";

describe("constantes do portal", () => {
  it("o slogan longo do cabeçalho tem as duas linhas do mockup", () => {
    expect(SLOGAN_LONGO).toEqual([
      "Análise, crônica e reportagem",
      "apuradas pelo squad-fut",
    ]);
  });

  it("a description dos metadados é montada a partir do slogan longo", () => {
    expect(DESCRICAO_DO_PORTAL).toBe(
      "Análise, crônica e reportagem de futebol apuradas pelo squad-fut.",
    );
    for (const linha of SLOGAN_LONGO) {
      expect(DESCRICAO_DO_PORTAL).toContain(linha);
    }
  });
});
