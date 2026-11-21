import { describe, expect, it } from "vitest";
import { lerConfiguracao } from "@/lib/content/config";

describe("lerConfiguracao", () => {
  it("CONTENT_SOURCE ausente ou files → arquivos", () => {
    expect(lerConfiguracao({}).source).toBe("files");
    expect(lerConfiguracao({ CONTENT_SOURCE: "files" }).source).toBe("files");
  });

  it.each(["FILES", "Supabase", "postgres", "  ", ""])(
    "CONTENT_SOURCE inválido → erro com o valor (%j)",
    (valor) => {
      expect(() => lerConfiguracao({ CONTENT_SOURCE: valor })).toThrow(
        `CONTENT_SOURCE inválido: "${valor}". Valores aceitos: files, supabase.`,
      );
    },
  );

  const SUPABASE = {
    CONTENT_SOURCE: "supabase",
    NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "chave-anon",
  };

  it("CONTENT_SOURCE=supabase com URL e chave anon → fonte supabase com as duas", () => {
    expect(lerConfiguracao(SUPABASE)).toEqual({
      source: "supabase",
      mostrarExemplos: true,
      supabase: {
        url: SUPABASE.NEXT_PUBLIC_SUPABASE_URL,
        anonKey: "chave-anon",
      },
    });
  });

  it("files não exige as variáveis do Supabase e não as expõe", () => {
    expect(lerConfiguracao({ CONTENT_SOURCE: "files" })).toEqual({
      source: "files",
      mostrarExemplos: true,
    });
  });

  it.each([
    [{ NEXT_PUBLIC_SUPABASE_URL: undefined }, "NEXT_PUBLIC_SUPABASE_URL"],
    [
      { NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined },
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    ],
    [{ NEXT_PUBLIC_SUPABASE_ANON_KEY: "  " }, "NEXT_PUBLIC_SUPABASE_ANON_KEY"],
    [
      {
        NEXT_PUBLIC_SUPABASE_URL: "",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined,
      },
      "NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY",
    ],
  ])("supabase sem %j → erro que lista %s", (faltando, lista) => {
    expect(() => lerConfiguracao({ ...SUPABASE, ...faltando })).toThrow(
      `CONTENT_SOURCE=supabase: faltam variáveis de ambiente (ausentes ou vazias): ${lista}.`,
    );
  });

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
