import { describe, expect, it } from "vitest";
import { lerUrlDoSite } from "@/lib/site";

describe("lerUrlDoSite", () => {
  it("usa http://localhost:3000 por padrão", () => {
    expect(lerUrlDoSite({}).href).toBe("http://localhost:3000/");
  });

  it("aceita uma URL http(s) absoluta", () => {
    expect(lerUrlDoSite({ SITE_URL: "https://zonamista.com.br" }).href).toBe(
      "https://zonamista.com.br/",
    );
  });

  it("dá erro claro com URL inválida", () => {
    for (const valor of ["zonamista.com.br", "", "ftp://x.com", "não é url"]) {
      expect(() => lerUrlDoSite({ SITE_URL: valor }), valor).toThrow(
        /SITE_URL inválido/,
      );
    }
  });
});
