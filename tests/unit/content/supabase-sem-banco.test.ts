/**
 * O que os repositórios do Supabase decidem sem ir ao banco (história 13, critério 7).
 * O cliente é falso: qualquer uso dele falha o teste. O comportamento com o banco de
 * verdade fica na suíte de contrato, em `pnpm test:db`.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { TAG_MATERIAS, TAG_TAGS, tagDaMateria } from "@/lib/content/cache";
import type { ArticleRepository } from "@/lib/content/repository";
import { SupabaseArticleRepositoryEmCache } from "@/lib/content/supabase/repositorio-em-cache";
import { SupabaseArticleRepository } from "@/lib/content/supabase/repository";

const usos: string[] = [];
const clienteQueNaoPodeSerUsado = new Proxy(
  {},
  {
    get(_alvo, propriedade) {
      usos.push(String(propriedade));
      throw new Error(`o banco foi consultado (${String(propriedade)})`);
    },
  },
) as SupabaseClient;

const repositorios: [string, () => ArticleRepository][] = [
  [
    "SupabaseArticleRepository",
    () =>
      new SupabaseArticleRepository({
        client: clienteQueNaoPodeSerUsado,
        mostrarExemplos: true,
      }),
  ],
  [
    // As funções "use cache" nem são chamadas: nada de cacheTag fora do Next.
    "SupabaseArticleRepositoryEmCache",
    () =>
      new SupabaseArticleRepositoryEmCache(
        { url: "http://127.0.0.1:1", anonKey: "x" },
        true,
      ),
  ],
];

describe.each(repositorios)("%s sem banco", (_nome, criar) => {
  it.each([
    [{ page: 0 }, 'list(): "page" precisa ser um inteiro ≥ 1 (recebido: 0)'],
    [
      { pageSize: 0 },
      'list(): "pageSize" precisa ser um inteiro ≥ 1 (recebido: 0)',
    ],
    [{ page: Number.NaN }, 'list(): "page" precisa ser um inteiro ≥ 1'],
  ])("list(%j) → RangeError com a mensagem da v1", async (opts, mensagem) => {
    usos.length = 0;
    await expect(criar().list(opts)).rejects.toThrow(RangeError);
    await expect(criar().list(opts)).rejects.toThrow(mensagem);
    expect(usos).toEqual([]);
  });

  it.each(["", "Maiuscula", "../x", "a_b", "a--b", "-a"])(
    "getBySlug(%j) malformado → null",
    async (slug) => {
      usos.length = 0;
      expect(await criar().getBySlug(slug)).toBeNull();
      expect(usos).toEqual([]);
    },
  );

  it.each(["", "   ", "\t\n"])("search(%j) → []", async (consulta) => {
    usos.length = 0;
    expect(await criar().search(consulta)).toEqual([]);
    expect(usos).toEqual([]);
  });
});

describe("etiquetas do cache (usadas pela história 14)", () => {
  it("materias, tags e materia:<slug>", () => {
    expect(TAG_MATERIAS).toBe("materias");
    expect(TAG_TAGS).toBe("tags");
    expect(tagDaMateria("psg-balanco")).toBe("materia:psg-balanco");
  });
});
