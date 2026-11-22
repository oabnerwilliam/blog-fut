/**
 * O build do CI e o do Preview da Vercel rodam sem as variáveis do Supabase (história 16,
 * correção do PR #20). No prerender, o `connection()` nunca resolve: ele marca o ponto em
 * que a renderização espera a requisição. Então, antes dele, o servidor do admin não pode
 * ler a configuração do Supabase, senão o build quebra com "faltam variáveis de ambiente".
 *
 * Aqui o `connection()` falso imita o prerender (promessa que nunca resolve) e o ambiente
 * vem sem as variáveis: a função tem de ficar parada, e não lançar.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let liberar: () => void = () => {};
vi.mock("next/server", async (original) => ({
  ...(await original<typeof import("next/server")>()),
  connection: () =>
    new Promise<void>((resolver) => {
      liberar = resolver;
    }),
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("404");
  },
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [], set: () => {} }),
}));

const { criarClienteDoServidor, exigirAdminLigado, obterSessaoDoAdmin } =
  await import("@/lib/auth/servidor");

/** "Ainda parada depois de 50 ms" ou o erro que ela deu. */
async function situacao(promessa: Promise<unknown>) {
  return Promise.race([
    promessa.then(
      () => "resolveu",
      (erro: Error) => `lançou: ${erro.message}`,
    ),
    new Promise((r) => setTimeout(() => r("parada"), 50)),
  ]);
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("sem as variáveis do Supabase, no prerender", () => {
  it("criarClienteDoServidor espera o connection() antes de ler a config", async () => {
    expect(await situacao(criarClienteDoServidor())).toBe("parada");
  });

  it("obterSessaoDoAdmin também (o porteiro e o /admin/acessos usam)", async () => {
    expect(await situacao(obterSessaoDoAdmin())).toBe("parada");
  });

  it("exigirAdminLigado (primeira linha do porteiro e do /admin/acessos) também", async () => {
    vi.stubEnv("ADMIN_HABILITADO", "false");
    expect(await situacao(exigirAdminLigado())).toBe("parada");
  });

  it("passado o connection(), exigirAdminLigado dá 404 com o admin desligado e segue com ele ligado", async () => {
    vi.stubEnv("ADMIN_HABILITADO", "false");
    const desligado = exigirAdminLigado();
    await Promise.resolve();
    liberar();
    expect(await situacao(desligado)).toBe("lançou: 404");

    vi.stubEnv("ADMIN_HABILITADO", "true");
    const ligado = exigirAdminLigado();
    await Promise.resolve();
    liberar();
    expect(await situacao(ligado)).toBe("resolveu");
  });

  it("controle: passado o connection(), a config ausente lança", async () => {
    const promessa = criarClienteDoServidor();
    await Promise.resolve();
    liberar();
    expect(await situacao(promessa)).toMatch(/^lançou: .*faltam variáveis/);
  });
});
