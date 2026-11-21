/**
 * O cliente do site precisa mandar `cache: "no-store"` em toda requisição, para o fetch
 * cache do Next nunca guardar dados do banco por baixo do "use cache" (ADR 0008, §4).
 * O `fetch` global é trocado por um falso: nada vai à rede.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { criarClienteAnonimo } from "@/lib/content/supabase/cliente";

afterEach(() => {
  vi.unstubAllGlobals();
});

function fetchFalso() {
  return vi.fn<typeof fetch>(
    async () =>
      new Response("[]", {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  );
}

describe("criarClienteAnonimo", () => {
  it("repassa cache: no-store ao fetch em toda consulta (tabela e RPC)", async () => {
    const falso = fetchFalso();
    vi.stubGlobal("fetch", falso);
    // Chave própria: o cliente é memorizado por URL + chave.
    const cliente = criarClienteAnonimo({
      url: "http://127.0.0.1:1",
      anonKey: "chave-do-teste-de-fetch",
    });

    await cliente.from("tags").select("slug");
    await cliente.rpc("buscar_artigos", { termos: ["x"] });

    expect(falso).toHaveBeenCalledTimes(2);
    for (const [, init] of falso.mock.calls) {
      expect(init?.cache).toBe("no-store");
    }
    const [url, init] = falso.mock.calls[0];
    expect(String(url)).toContain("/rest/v1/tags");
    // O resto da requisição continua o do supabase-js (a chave anon vai no header).
    expect(new Headers(init?.headers).get("apikey")).toBe(
      "chave-do-teste-de-fetch",
    );
  });

  it("lê o fetch global na hora da chamada (o Next o substitui depois)", async () => {
    const cliente = criarClienteAnonimo({
      url: "http://127.0.0.1:1",
      anonKey: "chave-do-teste-de-fetch-tardio",
    });
    const falso = fetchFalso();
    vi.stubGlobal("fetch", falso);
    await cliente.from("tags").select("slug");
    expect(falso).toHaveBeenCalledOnce();
    expect(falso.mock.calls[0][1]?.cache).toBe("no-store");
  });
});
