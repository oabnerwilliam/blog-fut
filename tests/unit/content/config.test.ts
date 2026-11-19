import { describe, expect, it } from "vitest";
import { lerConfiguracao } from "@/lib/content/config";

describe("lerConfiguracao", () => {
  it("CONTENT_SOURCE ausente ou files → arquivos", () => {
    expect(lerConfiguracao({}).source).toBe("files");
    expect(lerConfiguracao({ CONTENT_SOURCE: "files" }).source).toBe("files");
  });

  it.each(["supabase", "FILES", "  ", ""])(
    "CONTENT_SOURCE inválido → erro com o valor (%j)",
    (valor) => {
      expect(() => lerConfiguracao({ CONTENT_SOURCE: valor })).toThrow(
        `CONTENT_SOURCE inválido: "${valor}". Valores aceitos: files.`,
      );
    },
  );

  it("MOSTRAR_EXEMPLOS ausente ou true → mostra; false → esconde", () => {
    expect(lerConfiguracao({}).mostrarExemplos).toBe(true);
    expect(lerConfiguracao({ MOSTRAR_EXEMPLOS: "true" }).mostrarExemplos).toBe(
      true,
    );
    expect(lerConfiguracao({ MOSTRAR_EXEMPLOS: "false" }).mostrarExemplos).toBe(
      false,
    );
  });

  it.each(["nao", "0", "", "TRUE"])(
    "MOSTRAR_EXEMPLOS inválido → erro (%j)",
    (valor) => {
      expect(() => lerConfiguracao({ MOSTRAR_EXEMPLOS: valor })).toThrow(
        /MOSTRAR_EXEMPLOS/,
      );
      expect(() => lerConfiguracao({ MOSTRAR_EXEMPLOS: valor })).toThrow(
        `"${valor}"`,
      );
    },
  );
});
