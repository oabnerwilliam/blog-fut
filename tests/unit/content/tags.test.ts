import { describe, expect, it, vi } from "vitest";
import { ContentError } from "@/lib/content/errors";
import {
  criarResolvedorDeRotulos,
  humanizarTag,
  lerRotulosDeTags,
} from "@/lib/content/tags";

describe("tags", () => {
  it("rótulo vem do tags.json", () => {
    const avisar = vi.fn();
    const rotulo = criarResolvedorDeRotulos(
      { "fc-aurora": "FC Aurora" },
      avisar,
    );
    expect(rotulo("fc-aurora")).toBe("FC Aurora");
    expect(avisar).not.toHaveBeenCalled();
  });

  it("ligue-1 → Ligue 1 com aviso", () => {
    const avisar = vi.fn();
    const rotulo = criarResolvedorDeRotulos({}, avisar);
    expect(rotulo("ligue-1")).toBe("Ligue 1");
    expect(rotulo("ligue-1")).toBe("Ligue 1");
    expect(avisar).toHaveBeenCalledTimes(1);
    expect(avisar.mock.calls[0][0]).toMatch(/ligue-1/);
    expect(avisar.mock.calls[0][0]).toBe(
      '[conteúdo] tag "ligue-1" sem rótulo em content/tags.json; usando "Ligue 1".',
    );
  });

  it("conectivos ficam minúsculos", () => {
    expect(humanizarTag("copa-do-litoral")).toBe("Copa do Litoral");
    expect(humanizarTag("liga-da-serra")).toBe("Liga da Serra");
    expect(humanizarTag("de-virada")).toBe("De Virada");
    expect(humanizarTag("rio-e-mar")).toBe("Rio e Mar");
    expect(humanizarTag("serie-2026")).toBe("Serie 2026");
  });

  it("lê um tags.json válido", () => {
    expect(lerRotulosDeTags('{"fc-aurora":"FC Aurora"}')).toEqual({
      "fc-aurora": "FC Aurora",
    });
  });

  it.each([
    ["{"],
    ["[]"],
    ['{"a": 1}'],
    ['{"Fora Do Padrao": "X"}'],
    ['{"a": ""}'],
    ["null"],
  ])("tags.json malformado → erro citando tags.json (%s)", (json) => {
    expect(() => lerRotulosDeTags(json)).toThrow(ContentError);
    expect(() => lerRotulosDeTags(json)).toThrow(/tags\.json/);
  });
});
