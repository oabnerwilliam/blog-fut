/**
 * Entrar e sair (história 16, critério 4): `src/lib/auth/acoes.ts`.
 *
 * O cliente do servidor é falso aqui. O fluxo de verdade (cookies, PKCE, Supabase) é
 * coberto pelo e2e de banco, que confere o endereço do Google montado pelo Auth local.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const signInWithOAuth = vi.fn();
const signOut = vi.fn();
const criarClienteDoServidor = vi.fn(async () => ({
  auth: { signInWithOAuth, signOut },
}));
let cabecalhos = new Headers();

class Redirecionou extends Error {
  constructor(readonly destino: string) {
    super(`redirect ${destino}`);
  }
}

vi.mock("@/lib/auth/servidor", () => ({ criarClienteDoServidor }));
vi.mock("next/headers", () => ({ headers: async () => cabecalhos }));
vi.mock("next/navigation", () => ({
  redirect: (destino: string) => {
    throw new Redirecionou(destino);
  },
}));

const { entrarComGoogle, sair } = await import("@/lib/auth/acoes");
const { origemDaAcao } = await import("@/lib/auth/config");

async function destinoDe(promessa: Promise<unknown>): Promise<string> {
  const erro = await promessa.catch((e: unknown) => e);
  expect(erro).toBeInstanceOf(Redirecionou);
  return (erro as Redirecionou).destino;
}

beforeEach(() => {
  vi.clearAllMocks();
  cabecalhos = new Headers({ origin: "https://zonamista.exemplo.test" });
});

describe("origemDaAcao", () => {
  it("usa o Origin da requisição (o Next já confere que ele bate com o Host)", () => {
    expect(origemDaAcao(new Headers({ origin: "http://localhost:3102" }))).toBe(
      "http://localhost:3102",
    );
  });

  it("sem Origin, monta pelo host e pelo protocolo encaminhado", () => {
    expect(
      origemDaAcao(
        new Headers({
          "x-forwarded-host": "blog.exemplo.test",
          "x-forwarded-proto": "https",
        }),
      ),
    ).toBe("https://blog.exemplo.test");
    expect(origemDaAcao(new Headers({ host: "127.0.0.1:3000" }))).toBe(
      "http://127.0.0.1:3000",
    );
  });

  it("recusa origem que não é http(s)", () => {
    expect(() => origemDaAcao(new Headers({ origin: "null" }))).toThrow();
    expect(() =>
      origemDaAcao(new Headers({ origin: "javascript:alert(1)" })),
    ).toThrow();
  });
});

describe("entrarComGoogle", () => {
  it("pede ao Auth o endereço do Google, com o callback desta origem, e redireciona", async () => {
    signInWithOAuth.mockResolvedValue({
      data: { url: "http://127.0.0.1:54321/auth/v1/authorize?provider=google" },
      error: null,
    });
    expect(await destinoDe(entrarComGoogle())).toBe(
      "http://127.0.0.1:54321/auth/v1/authorize?provider=google",
    );
    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: "https://zonamista.exemplo.test/admin/auth/callback",
      },
    });
  });

  it("com erro do Auth, volta para /admin/entrar com o aviso", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    signInWithOAuth.mockResolvedValue({
      data: { url: null },
      error: { message: "provider is not enabled" },
    });
    expect(await destinoDe(entrarComGoogle())).toBe("/admin/entrar?erro=login");
  });
});

describe("sair", () => {
  it("encerra a sessão deste navegador e volta para /admin/entrar", async () => {
    signOut.mockResolvedValue({ error: null });
    expect(await destinoDe(sair())).toBe("/admin/entrar");
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("mesmo com o Auth fora do ar, volta para /admin/entrar", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    signOut.mockRejectedValue(new Error("fetch failed"));
    expect(await destinoDe(sair())).toBe("/admin/entrar");
  });
});
