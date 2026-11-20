import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  formatarData,
  formatarDataCurta,
  formatarDiaMes,
  formatarDiaMesCurto,
} from "@/lib/datas";

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

describe("formatarDataCurta", () => {
  const tzOriginal = process.env.TZ;
  beforeAll(() => {
    process.env.TZ = "America/Sao_Paulo";
  });
  afterAll(() => {
    process.env.TZ = tzOriginal;
  });

  it("escreve dia.mês.ano com dois dígitos", () => {
    expect(formatarDataCurta("2026-11-19")).toBe("19.11.2026");
    expect(formatarDataCurta("2026-01-05")).toBe("05.01.2026");
  });

  it("trata o valor como data de calendário, sem voltar um dia no fuso de São Paulo", () => {
    expect(formatarDataCurta("2026-11-01")).toBe("01.11.2026");
  });

  it("recusa texto fora do formato AAAA-MM-DD", () => {
    expect(() => formatarDataCurta("19/11/2026")).toThrow(/AAAA-MM-DD/);
    expect(() => formatarDataCurta("2026-02-30")).toThrow(/AAAA-MM-DD/);
  });
});

describe("formatarDiaMes", () => {
  const tzOriginal = process.env.TZ;
  beforeAll(() => {
    process.env.TZ = "America/Sao_Paulo";
  });
  afterAll(() => {
    process.env.TZ = tzOriginal;
  });

  it("devolve o dia com dois dígitos e o mês abreviado em minúsculas", () => {
    expect(formatarDiaMes("2026-11-06")).toEqual({ dia: "06", mes: "nov" });
    expect(formatarDiaMes("2026-03-28")).toEqual({ dia: "28", mes: "mar" });
  });

  it("tem as doze abreviações sem ponto", () => {
    const meses = Array.from(
      { length: 12 },
      (_, i) => formatarDiaMes(`2026-${String(i + 1).padStart(2, "0")}-01`).mes,
    );
    expect(meses).toEqual([
      "jan",
      "fev",
      "mar",
      "abr",
      "mai",
      "jun",
      "jul",
      "ago",
      "set",
      "out",
      "nov",
      "dez",
    ]);
  });

  it("trata o valor como data de calendário, sem voltar um dia no fuso de São Paulo", () => {
    expect(formatarDiaMes("2026-11-01")).toEqual({ dia: "01", mes: "nov" });
  });

  it("recusa texto fora do formato AAAA-MM-DD", () => {
    expect(() => formatarDiaMes("2026-13-01")).toThrow(/AAAA-MM-DD/);
  });
});

describe("formatarDiaMesCurto", () => {
  it("escreve dia.mês, como nas linhas de Últimas", () => {
    expect(formatarDiaMesCurto("2026-11-16")).toBe("16.11");
    expect(formatarDiaMesCurto("2026-01-01")).toBe("01.01");
  });
});
