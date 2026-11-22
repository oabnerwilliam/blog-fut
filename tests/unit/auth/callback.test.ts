/**
 * `/admin/auth/callback` (história 16, critério 4): a troca do code pela sessão. O cliente
 * do servidor é falso; o caminho com o Auth de verdade (code inválido) está no e2e de banco.
 */
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const exchangeCodeForSession = vi.fn();
vi.mock("@/lib/auth/servidor", () => ({
  criarClienteDoServidor: async () => ({ auth: { exchangeCodeForSession } }),
}));

/** Com `noPrerender`, o connection() imita o build: nunca resolve. */
let noPrerender = false;
vi.mock("next/server", async (original) => ({
  ...(await original<typeof import("next/server")>()),
  connection: () =>
    noPrerender ? new Promise<void>(() => {}) : Promise.resolve(),
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("404");
  },
}));

const { GET } = await import("@/app/admin/auth/callback/route");

function chamar(busca: string) {
  return GET(
    new NextRequest(`http://localhost:3000/admin/auth/callback${busca}`),
  );
}

function destino(resposta: Response) {
  const url = new URL(resposta.headers.get("location")!);
  return url.pathname + url.search;
}

beforeEach(() => {
  noPrerender = false;
  vi.unstubAllEnvs();
  vi.stubEnv("ADMIN_HABILITADO", "true");
  exchangeCodeForSession.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("callback do login", () => {
  it("no build, para no connection() antes do 404: a rota não sai estática", async () => {
    noPrerender = true;
    vi.stubEnv("ADMIN_HABILITADO", "false");
    const situacao = await Promise.race([
      chamar("?code=abc").then(
        () => "respondeu",
        () => "lançou",
      ),
      new Promise((r) => setTimeout(() => r("parada"), 50)),
    ]);
    expect(situacao).toBe("parada");
  });

  it("com o admin desligado: 404, sem tentar a troca (defesa em profundidade)", async () => {
    vi.stubEnv("ADMIN_HABILITADO", "false");
    await expect(chamar("?code=abc")).rejects.toThrow("404");
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("troca o code pela sessão e vai para /admin", async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null });
    const resposta = await chamar("?code=abc");
    expect(exchangeCodeForSession).toHaveBeenCalledWith("abc");
    expect(resposta.status).toBe(307);
    expect(destino(resposta)).toBe("/admin");
  });

  it("troca recusada: volta para entrar com o aviso, sem o texto do erro na URL", async () => {
    exchangeCodeForSession.mockResolvedValue({
      error: { message: "invalid flow state <script>" },
    });
    const resposta = await chamar("?code=vencido");
    expect(destino(resposta)).toBe("/admin/entrar?erro=login");
  });

  it("o Auth fora do ar (lança): volta para entrar com o aviso", async () => {
    exchangeCodeForSession.mockRejectedValue(new Error("fetch failed"));
    expect(destino(await chamar("?code=abc"))).toBe("/admin/entrar?erro=login");
  });

  it("sem code ou com ?error= do Google: nem tenta a troca", async () => {
    for (const busca of ["", "?error=access_denied&error_description=x"]) {
      expect(destino(await chamar(busca))).toBe("/admin/entrar?erro=login");
    }
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("um next= ou destino na URL não muda para onde vai (sem redirecionamento aberto)", async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null });
    const resposta = await chamar("?code=abc&next=https://exemplo.test/fora");
    expect(new URL(resposta.headers.get("location")!).origin).toBe(
      "http://localhost:3000",
    );
    expect(destino(resposta)).toBe("/admin");
  });
});
