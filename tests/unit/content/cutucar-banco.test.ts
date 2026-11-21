/**
 * Leitura leve do keep-alive (`/api/manter-ativo`, história 14): `select slug from
 * articles limit 1` com a chave anon. O cliente Supabase é falso: nada vai à rede.
 */
import { createClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cutucarBanco } from "@/lib/content";

const consulta = {
  tabela: "",
  colunas: "",
  limite: 0,
  resultado: { error: null as unknown, data: [] as unknown[] },
};

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from(tabela: string) {
      consulta.tabela = tabela;
      return {
        select(colunas: string) {
          consulta.colunas = colunas;
          return {
            limit: async (n: number) => {
              consulta.limite = n;
              if (consulta.resultado instanceof Error) throw consulta.resultado;
              return consulta.resultado;
            },
          };
        },
      };
    },
  })),
}));

function usarSupabase(url: string) {
  vi.stubEnv("CONTENT_SOURCE", "supabase");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", url);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "chave-anon-de-teste");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.mocked(createClient).mockClear();
  consulta.resultado = { error: null, data: [] };
});

describe("cutucarBanco", () => {
  it("com files não há banco: true, sem criar cliente", async () => {
    vi.stubEnv("CONTENT_SOURCE", "files");
    expect(await cutucarBanco()).toBe(true);
    expect(createClient).not.toHaveBeenCalled();
  });

  it("com supabase: select slug from articles limit 1, com a chave anon", async () => {
    usarSupabase("http://127.0.0.1:54399");
    expect(await cutucarBanco()).toBe(true);
    expect(consulta).toMatchObject({
      tabela: "articles",
      colunas: "slug",
      limite: 1,
    });
    expect(vi.mocked(createClient).mock.calls[0]?.[1]).toBe(
      "chave-anon-de-teste",
    );
  });

  it("erro do PostgREST → false", async () => {
    usarSupabase("http://127.0.0.1:54398");
    consulta.resultado = { error: { message: "fetch failed" }, data: [] };
    expect(await cutucarBanco()).toBe(false);
  });

  it("exceção do cliente → false, sem lançar", async () => {
    usarSupabase("http://127.0.0.1:54397");
    consulta.resultado = new Error("rede") as never;
    expect(await cutucarBanco()).toBe(false);
  });

  it("configuração incompleta → false, sem lançar", async () => {
    vi.stubEnv("CONTENT_SOURCE", "supabase");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    expect(await cutucarBanco()).toBe(false);
  });
});
