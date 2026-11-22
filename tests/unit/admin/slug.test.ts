/**
 * `gerarSlug` (história 18, critério 1): o slug sugerido a partir do título no editor.
 * O resultado sempre passa no `SLUG_REGEX` ou é vazio (a criação recusa o vazio com um
 * erro claro no campo do slug).
 */
import { describe, expect, it } from "vitest";
import { gerarSlug, TAMANHO_MAXIMO_DO_SLUG } from "@/lib/admin/slug";
import { SLUG_REGEX } from "@/lib/content/schema";

describe("gerarSlug", () => {
  it.each([
    ["PSG vence o Lyon", "psg-vence-o-lyon"],
    ["São Paulo é campeão", "sao-paulo-e-campeao"],
    ["Ação, coração e açúcar", "acao-coracao-e-acucar"],
    ["Ñandú, Über e Ångström", "nandu-uber-e-angstrom"],
    ["  muitos    espaços   ", "muitos-espacos"],
    ["Fim de jogo! (e agora?)", "fim-de-jogo-e-agora"],
    ["“Aspas”, travessão — e reticências…", "aspas-travessao-e-reticencias"],
    ["Gol ⚽ no fim 🔥🔥", "gol-no-fim"],
    ["Copa 2026: 3 a 1", "copa-2026-3-a-1"],
    ["Ligue-1 -- --rodada--", "ligue-1-rodada"],
    ["O_dia_do_clássico", "o-dia-do-classico"],
    [
      "Straße, Æsir, Øresund, Łódź e œuvre",
      "strasse-aesir-oresund-lodz-e-oeuvre",
    ],
  ])("%j → %j", (titulo, esperado) => {
    expect(gerarSlug(titulo)).toBe(esperado);
    expect(esperado).toMatch(SLUG_REGEX);
  });

  it.each(["", "   ", "?!...", "— – …", "⚽🔥", "###"])(
    "título sem letra nem número (%j) → vazio",
    (titulo) => {
      expect(gerarSlug(titulo)).toBe("");
    },
  );

  it("título longo: no máximo 80 caracteres, cortado entre palavras e sem hífen na ponta", () => {
    const titulo =
      "A noite em que o Atlético Ventania virou o jogo contra o EC São Ciríaco no último minuto da final";
    const slug = gerarSlug(titulo);
    expect(slug.length).toBeLessThanOrEqual(TAMANHO_MAXIMO_DO_SLUG);
    expect(slug).toMatch(SLUG_REGEX);
    expect(slug).toBe(
      "a-noite-em-que-o-atletico-ventania-virou-o-jogo-contra-o-ec-sao-ciriaco-no",
    );
    // Sempre uma sequência de palavras inteiras do começo do slug completo.
    const completo =
      "a-noite-em-que-o-atletico-ventania-virou-o-jogo-contra-o-ec-sao-ciriaco-no-ultimo-minuto-da-final";
    expect(completo.startsWith(`${slug}-`)).toBe(true);
  });

  it("exatamente 80 caracteres não corta; o 81º corta na palavra anterior", () => {
    const oitenta = `${"a".repeat(39)} ${"b".repeat(40)}`; // 39 + hífen + 40
    expect(gerarSlug(oitenta)).toBe(`${"a".repeat(39)}-${"b".repeat(40)}`);
    expect(gerarSlug(`${oitenta}b`)).toBe("a".repeat(39));
  });

  it("uma palavra só, maior que 80: corta em 80", () => {
    expect(gerarSlug("x".repeat(120))).toBe("x".repeat(80));
  });

  it("o corte não deixa hífen no fim", () => {
    const titulo = `${"a".repeat(79)} b`;
    expect(gerarSlug(titulo)).toBe("a".repeat(79));
  });
});
