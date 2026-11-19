import { describe, expect, it } from "vitest";
import {
  EDITORIAS,
  SLUGS_DE_EDITORIA,
  hrefDaEditoria,
  isEditoria,
  rotuloDaEditoria,
} from "@/lib/editorias";

describe("editorias", () => {
  it("EDITORIAS tem os 7 slugs na ordem da spec", () => {
    expect(EDITORIAS.map((e) => e.slug)).toEqual([
      "analise",
      "cronica",
      "noticia",
      "coluna",
      "perfil",
      "entrevista",
      "reportagem",
    ]);
  });

  it("rótulos com acento", () => {
    expect(EDITORIAS.map((e) => e.rotulo)).toEqual([
      "Análise",
      "Crônica",
      "Notícia",
      "Coluna",
      "Perfil",
      "Entrevista",
      "Reportagem",
    ]);
    expect(rotuloDaEditoria("analise")).toBe("Análise");
    expect(rotuloDaEditoria("reportagem")).toBe("Reportagem");
  });

  it("hrefDaEditoria monta /editorias/<slug>", () => {
    expect(hrefDaEditoria("analise")).toBe("/editorias/analise");
    expect(hrefDaEditoria("entrevista")).toBe("/editorias/entrevista");
  });

  it("isEditoria aceita só a lista fechada", () => {
    for (const { slug } of EDITORIAS) expect(isEditoria(slug)).toBe(true);
    expect(isEditoria("opiniao")).toBe(false);
    expect(isEditoria("Analise")).toBe(false);
    expect(isEditoria("")).toBe(false);
    expect(isEditoria("toString")).toBe(false);
  });

  it("SLUGS_DE_EDITORIA tem a mesma ordem de EDITORIAS", () => {
    expect([...SLUGS_DE_EDITORIA]).toEqual(EDITORIAS.map((e) => e.slug));
  });
});
