import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { formatarData } from "@/lib/datas";

describe("formatarData", () => {
  const tzOriginal = process.env.TZ;
  beforeAll(() => {
    process.env.TZ = "America/Sao_Paulo";
  });
  afterAll(() => {
    process.env.TZ = tzOriginal;
  });

  it("escreve a data por extenso em pt-BR", () => {
    expect(formatarData("2026-10-20")).toBe("20 de outubro de 2026");
  });

  it("trata o valor como data de calendário, sem voltar um dia no fuso de São Paulo", () => {
    expect(formatarData("2026-11-01")).toBe("1 de novembro de 2026");
    expect(formatarData("2026-01-01")).toBe("1 de janeiro de 2026");
  });

  it("recusa texto fora do formato AAAA-MM-DD", () => {
    expect(() => formatarData("01/11/2026")).toThrow(/AAAA-MM-DD/);
    expect(() => formatarData("2026-13-01")).toThrow(/AAAA-MM-DD/);
  });
});
