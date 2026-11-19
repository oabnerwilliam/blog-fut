import { describe, expect, it } from "vitest";
import {
  correspondeABusca,
  normalizarParaBusca,
  termosDaBusca,
  textoBuscavel,
} from "@/lib/content/search";
import { montarArtigo } from "./helpers/artigo";

describe("search", () => {
  it("normalizarParaBusca remove acento, caixa e espaços extras", () => {
    expect(normalizarParaBusca("  São   PAULO\n do Vale ")).toBe(
      "sao paulo do vale",
    );
    expect(normalizarParaBusca("Ação Çé")).toBe("acao ce");
  });

  it("termosDaBusca quebra em termos e devolve [] para vazio", () => {
    expect(termosDaBusca("São Paulo")).toEqual(["sao", "paulo"]);
    expect(termosDaBusca("SAO PAULO")).toEqual(["sao", "paulo"]);
    expect(termosDaBusca("sao   paulo")).toEqual(["sao", "paulo"]);
    expect(termosDaBusca("")).toEqual([]);
    expect(termosDaBusca("   ")).toEqual([]);
  });

  it("textoBuscavel junta título, linha fina, tags e corpo normalizados", () => {
    const texto = textoBuscavel(
      montarArtigo({
        titulo: "Título",
        linha_fina: "Linha",
        tags: [{ slug: "copa-do-litoral", rotulo: "Copa do Litoral" }],
        corpo_md: "Corpo com Ênfase",
      }),
    );
    expect(texto).toContain("titulo");
    expect(texto).toContain("linha");
    expect(texto).toContain("copa do litoral");
    expect(texto).toContain("corpo com enfase");
  });

  it("busca com vários termos exige todos", () => {
    const texto = normalizarParaBusca(
      "O FC Aurora venceu em São Paulo do Vale",
    );
    expect(correspondeABusca(texto, ["aurora", "vale"])).toBe(true);
    expect(correspondeABusca(texto, ["aurora", "serra"])).toBe(false);
  });
});
