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
  exchangeCodeForSession.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("callback do login", () => {
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
