import { afterEach, describe, expect, it, vi } from "vitest";
import * as conteudo from "@/lib/content";
import { getRepository, readingTime, renderMarkdown } from "@/lib/content";
import { FileArticleRepository } from "@/lib/content/file-repository";

afterEach(() => {
  vi.unstubAllEnvs();
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

  it.each(["supabase", "FILES", "  ", ""])(
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
});
