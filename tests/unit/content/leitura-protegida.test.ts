/**
 * Banco fora do ar (risco 4 do plano v2, U11). Dentro do "use cache", a leitura que falha
 * não lança: devolve a falha e encurta a vida da entrada para zero. A doc do `cacheLife`
 * ("Prerendering behavior") diz que `revalidate: 0` tira a entrada do prerender: no
 * build sem banco, a página vira dinâmica em vez de quebrar. Fora do cache, a falha volta
 * a ser um erro, que chega ao `error.tsx` numa requisição.
 */
import { describe, expect, it } from "vitest";
import {
  desembrulhar,
  lerProtegido,
  VIDA_DA_FALHA,
  type PerfilDeVida,
} from "@/lib/content/supabase/leitura-protegida";

function espiaoDeVida() {
  const chamadas: PerfilDeVida[] = [];
  return { chamadas, marcar: (perfil: PerfilDeVida) => chamadas.push(perfil) };
}

describe("lerProtegido", () => {
  it("leitura que deu certo: ok com o valor, sem encurtar a vida", async () => {
    const vida = espiaoDeVida();
    expect(await lerProtegido(async () => [1, 2], vida.marcar)).toEqual({
      ok: true,
      valor: [1, 2],
    });
    expect(vida.chamadas).toEqual([]);
  });

  it("leitura que falhou: não lança, devolve a mensagem e marca vida zero", async () => {
    const vida = espiaoDeVida();
    const resultado = await lerProtegido(async () => {
      throw new Error("[conteúdo] falha ao ler as tags do Supabase");
    }, vida.marcar);
    expect(resultado).toEqual({
      ok: false,
      mensagem: "[conteúdo] falha ao ler as tags do Supabase",
    });
    expect(vida.chamadas).toEqual([VIDA_DA_FALHA]);
  });

  it("a vida da falha tira a entrada do prerender (revalidate 0) e não a guarda", () => {
    expect(VIDA_DA_FALHA).toEqual({ stale: 0, revalidate: 0, expire: 0 });
  });

  it("valor lançado que não é Error também vira mensagem", async () => {
    const resultado = await lerProtegido(
      async () => {
        throw "fora do ar";
      },
      () => {},
    );
    expect(resultado).toEqual({ ok: false, mensagem: "fora do ar" });
  });
});

describe("desembrulhar", () => {
  it("ok: devolve o valor", () => {
    expect(desembrulhar({ ok: true, valor: null })).toBeNull();
  });

  it("falha: lança um Error com a mensagem", () => {
    expect(() => desembrulhar({ ok: false, mensagem: "fora do ar" })).toThrow(
      new Error("fora do ar"),
    );
  });
});
