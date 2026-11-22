import { describe, expect, it } from "vitest";
import {
  formatarDataDoAdmin,
  formatarDataEHoraDoAdmin,
  iniciaisDe,
  rotuloDaSituacao,
} from "@/lib/admin/formatos";

describe("iniciaisDe (README do design, Avatar)", () => {
  it.each([
    ["Carlos Henrique Duarte", null, "CD"],
    ["Rafael", null, "R"],
    ["  joana   prado  ", null, "JP"],
    ["Élida Ávila", null, "ÉÁ"],
    [null, "pessoa@exemplo.test", "P"],
    ["   ", "zeca@exemplo.test", "Z"],
    [null, null, "?"],
    ["", "", "?"],
  ])("%j / %j → %s", (nome, email, esperado) => {
    expect(iniciaisDe(nome, email)).toBe(esperado);
  });
});

describe("datas do admin (fuso de São Paulo)", () => {
  it("data e hora no padrão da súmula", () => {
    // 12:14 UTC = 09:14 em São Paulo (UTC-3, sem horário de verão).
    expect(formatarDataEHoraDoAdmin("2026-11-21T12:14:00Z")).toBe(
      "21.11.2026 · 09:14",
    );
  });

  it("perto da meia-noite UTC, o dia é o de São Paulo", () => {
    expect(formatarDataDoAdmin("2026-11-21T02:30:00Z")).toBe("20.11.2026");
    expect(formatarDataEHoraDoAdmin("2026-11-21T02:30:00+00:00")).toBe(
      "20.11.2026 · 23:30",
    );
  });

  it("aceita o formato do Postgres (microssegundos e +00:00)", () => {
    expect(formatarDataDoAdmin("2026-11-19T10:00:00.123456+00:00")).toBe(
      "19.11.2026",
    );
  });
});

describe("rotuloDaSituacao", () => {
  it("sempre a palavra do README (a forma vem do CSS)", () => {
    expect(rotuloDaSituacao("pendente")).toBe("Pendente");
    expect(rotuloDaSituacao("aprovado")).toBe("Aprovado(a)");
    expect(rotuloDaSituacao("recusado")).toBe("Recusado");
    expect(rotuloDaSituacao("revogado")).toBe("Revogado(a)");
  });
});
