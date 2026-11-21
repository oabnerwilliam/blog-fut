import { describe, expect, it } from "vitest";
import { lerUrlDoSite } from "@/lib/site";

describe("lerUrlDoSite", () => {
  it("usa http://localhost:3000 por padrão", () => {
    expect(lerUrlDoSite({}).href).toBe("http://localhost:3000/");
  });

  it("aceita uma URL http(s) absoluta só com a origem, com ou sem a barra final", () => {
    for (const [valor, esperado] of [
      ["https://zonamista.com.br", "https://zonamista.com.br/"],
      ["https://zonamista.com.br/", "https://zonamista.com.br/"],
      ["http://localhost:4000", "http://localhost:4000/"],
    ]) {
      expect(lerUrlDoSite({ SITE_URL: valor }).href, valor).toBe(esperado);
    }
  });

  it("dá erro claro com URL inválida", () => {
    for (const valor of ["zonamista.com.br", "", "ftp://x.com", "não é url"]) {
      expect(() => lerUrlDoSite({ SITE_URL: valor }), valor).toThrow(
        /SITE_URL inválido/,
      );
    }
  });

  it("recusa caminho, query ou hash e explica que só vale a origem", () => {
    for (const valor of [
      "https://x.com/blog",
      "https://x.com/blog/",
      "https://x.com/?a=1",
      "https://x.com?a=1",
      "https://x.com/#topo",
      "https://x.com#topo",
      "https://x.com/?",
      "https://x.com/#",
    ]) {
      expect(() => lerUrlDoSite({ SITE_URL: valor }), valor).toThrow(
        /SITE_URL inválido.*só a origem.*sem caminho, query ou hash/,
      );
    }
  });
});
