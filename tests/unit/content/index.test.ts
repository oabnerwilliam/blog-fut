import { createClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as conteudo from "@/lib/content";
import { getRepository, readingTime, renderMarkdown } from "@/lib/content";
import { FileArticleRepository } from "@/lib/content/file-repository";
import { fetchSemCacheDoNext } from "@/lib/content/supabase/cliente";
import { SupabaseArticleRepositoryEmCache } from "@/lib/content/supabase/repositorio-em-cache";
import { SupabaseArticleRepository } from "@/lib/content/supabase/repository";

// Nenhum teste de unidade vai à rede: o cliente é falso e só registra os argumentos.
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({ falso: true })),
}));

const SUPABASE = {
  CONTENT_SOURCE: "supabase",
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "chave-anon-de-teste",
};

function usarSupabase(extra: Record<string, string | undefined> = {}) {
  for (const [nome, valor] of Object.entries({ ...SUPABASE, ...extra })) {
    vi.stubEnv(nome, valor);
  }
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.mocked(createClient).mockClear();
});

describe("@/lib/content", () => {
  it("a porta pública exporta getRepository, renderMarkdown e readingTime", () => {
    expect(typeof getRepository).toBe("function");
    expect(typeof renderMarkdown).toBe("function");
    expect(typeof readingTime).toBe("function");
    expect(Object.keys(conteudo).sort()).toEqual([
      "getRepository",
      "readingTime",
      "renderMarkdown",
    ]);
  });

  it("getRepository sem variáveis devolve o repositório de arquivos, sem ler o disco", () => {
    vi.stubEnv("CONTENT_SOURCE", undefined);
    vi.stubEnv("MOSTRAR_EXEMPLOS", undefined);
    expect(getRepository()).toBeInstanceOf(FileArticleRepository);
  });

  it("CONTENT_SOURCE=files devolve o repositório de arquivos", () => {
    vi.stubEnv("CONTENT_SOURCE", "files");
    expect(getRepository()).toBeInstanceOf(FileArticleRepository);
  });

  it.each(["FILES", "Supabase", "  ", ""])(
    "getRepository com CONTENT_SOURCE inválido lança (%j)",
    (valor) => {
      vi.stubEnv("CONTENT_SOURCE", valor);
      expect(() => getRepository()).toThrow(/CONTENT_SOURCE/);
      expect(() => getRepository()).toThrow(`"${valor}"`);
    },
  );

  it.each(["nao", "0", ""])(
    "getRepository com MOSTRAR_EXEMPLOS inválido lança (%j)",
    (valor) => {
      vi.stubEnv("MOSTRAR_EXEMPLOS", valor);
      expect(() => getRepository()).toThrow(/MOSTRAR_EXEMPLOS/);
    },
  );

  it("fora de produção cria uma instância nova a cada chamada", () => {
    vi.stubEnv("NODE_ENV", "test");
    expect(getRepository()).not.toBe(getRepository());
  });

  it("em produção reaproveita uma instância por valor de MOSTRAR_EXEMPLOS", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("MOSTRAR_EXEMPLOS", "true");
    const comExemplos = getRepository();
    expect(getRepository()).toBe(comExemplos);
    vi.stubEnv("MOSTRAR_EXEMPLOS", "false");
    const semExemplos = getRepository();
    expect(semExemplos).not.toBe(comExemplos);
    expect(getRepository()).toBe(semExemplos);
  });

  it("CONTENT_SOURCE=supabase devolve o repositório do Supabase com cache, sem ir ao banco", () => {
    usarSupabase();
    expect(getRepository()).toBeInstanceOf(SupabaseArticleRepositoryEmCache);
    expect(createClient).not.toHaveBeenCalled();
  });

  it("semCache (Proxy) devolve o repositório direto, com a chave anon e sem sessão", () => {
    // Chave própria: o cliente é memorizado por URL + chave.
    usarSupabase({
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "chave-anon-so-deste-teste",
    });
    expect(getRepository({ semCache: true })).toBeInstanceOf(
      SupabaseArticleRepository,
    );
    expect(createClient).toHaveBeenCalledWith(
      SUPABASE.NEXT_PUBLIC_SUPABASE_URL,
      "chave-anon-so-deste-teste",
      expect.objectContaining({
        auth: expect.objectContaining({ persistSession: false }),
        global: { fetch: fetchSemCacheDoNext },
      }),
    );
  });

  it("semCache não muda nada com files", () => {
    vi.stubEnv("CONTENT_SOURCE", "files");
    expect(getRepository({ semCache: true })).toBeInstanceOf(
      FileArticleRepository,
    );
  });

  it("supabase sem as variáveis lança listando as que faltam", () => {
    usarSupabase({
      NEXT_PUBLIC_SUPABASE_URL: undefined,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
    });
    expect(() => getRepository()).toThrow(
      "NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  });

  it("em produção a instância é memorizada por fonte e MOSTRAR_EXEMPLOS", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("MOSTRAR_EXEMPLOS", "true");
    vi.stubEnv("CONTENT_SOURCE", "files");
    const arquivos = getRepository();
    usarSupabase();
    const banco = getRepository();
    expect(banco).not.toBe(arquivos);
    expect(getRepository()).toBe(banco);
    expect(getRepository({ semCache: true })).not.toBe(banco);
    expect(getRepository({ semCache: true })).toBe(
      getRepository({ semCache: true }),
    );
    vi.stubEnv("MOSTRAR_EXEMPLOS", "false");
    expect(getRepository()).not.toBe(banco);
    vi.stubEnv("CONTENT_SOURCE", "files");
    vi.stubEnv("MOSTRAR_EXEMPLOS", "true");
    expect(getRepository()).toBe(arquivos);
  });
});
