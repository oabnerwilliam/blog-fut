/**
 * O `/admin` no Proxy (história 16, critério 5; U14; ADR 0006, "Extensão (história 16)").
 *
 * - `ADMIN_HABILITADO !== "true"`: todo `/admin/**` vira 404 real (rewrite para um caminho
 *   sem rota), inclusive o callback do login.
 * - Ligado: o Proxy não consulta o banco (o índice de rotas nem é carregado) e só
 *   renova a sessão quando ela venceu (`tests/unit/auth/sessao-no-proxy.test.ts`).
 */
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getRepository = vi.fn(() => {
  throw new Error("o /admin não pode ler o repositório");
});
vi.mock("@/lib/content", async (original) => ({
  ...(await original<typeof import("@/lib/content")>()),
  getRepository,
}));

const { proxy, config } = await import("@/proxy");

const CAMINHOS = [
  "/admin",
  "/admin/",
  "/admin/entrar",
  "/admin/acessos",
  "/admin/auth/callback?code=abc",
  "/admin/qualquer/coisa",
];

function pedido(caminho: string) {
  return new NextRequest(`http://localhost:3000${caminho}`);
}

let fetchFalso: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchFalso = vi.fn();
  vi.stubGlobal("fetch", fetchFalso);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("matcher", () => {
  it("cobre /admin e tudo abaixo dele, além das rotas da v1", () => {
    expect(config.matcher).toEqual([
      "/materias/:slug",
      "/editorias/:editoria",
      "/tags/:tag",
      "/admin/:path*",
    ]);
  });
});

describe("admin desligado", () => {
  it.each([undefined, "false", "TRUE", ""])(
    "ADMIN_HABILITADO=%j: todo /admin/** vira 404",
    async (valor) => {
      if (valor === undefined) vi.stubEnv("ADMIN_HABILITADO", undefined);
      else vi.stubEnv("ADMIN_HABILITADO", valor);
      for (const caminho of CAMINHOS) {
        const resposta = await proxy(pedido(caminho));
        expect(
          new URL(resposta.headers.get("x-middleware-rewrite")!).pathname,
          caminho,
        ).toBe("/_nao-encontrada");
      }
      expect(getRepository).not.toHaveBeenCalled();
      expect(fetchFalso).not.toHaveBeenCalled();
    },
  );
});

describe("admin ligado", () => {
  /** Entrar e o callback nunca exigem sessão: é por eles que ela começa. */
  const ABERTOS = ["/admin/entrar", "/admin/auth/callback?code=abc"];
  /** O painel sem cookie de sessão nenhum: vai para entrar sem passar pela página. */
  const DO_PAINEL = [
    "/admin",
    "/admin/",
    "/admin/acessos",
    "/admin/qualquer/coisa",
  ];

  it("entrar e o callback seguem adiante sem consultar o banco nem a rede", async () => {
    vi.stubEnv("ADMIN_HABILITADO", "true");
    for (const caminho of ABERTOS) {
      const resposta = await proxy(pedido(caminho));
      expect(resposta.headers.get("x-middleware-rewrite"), caminho).toBeNull();
      expect(resposta.headers.get("x-middleware-next"), caminho).toBe("1");
    }
    expect(getRepository).not.toHaveBeenCalled();
    expect(fetchFalso).not.toHaveBeenCalled();
  });

  it("o painel sem cookie de sessão redireciona para /admin/entrar (307), sem rede", async () => {
    vi.stubEnv("ADMIN_HABILITADO", "true");
    for (const caminho of DO_PAINEL) {
      const resposta = await proxy(pedido(caminho));
      expect(resposta.status, caminho).toBe(307);
      expect(new URL(resposta.headers.get("location")!).pathname, caminho).toBe(
        "/admin/entrar",
      );
    }
    expect(getRepository).not.toHaveBeenCalled();
    expect(fetchFalso).not.toHaveBeenCalled();
  });

  it("o painel com cookie de sessão segue para a página (quem confere é o servidor)", async () => {
    vi.stubEnv("ADMIN_HABILITADO", "true");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "chave-anon");
    const sessao = {
      access_token: "a",
      refresh_token: "r",
      token_type: "bearer",
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3000,
      user: { id: "u" },
    };
    const requisicao = new NextRequest("http://localhost:3000/admin/acessos", {
      headers: {
        cookie: `sb-127-auth-token=base64-${Buffer.from(JSON.stringify(sessao)).toString("base64url")}`,
      },
    });
    const resposta = await proxy(requisicao);
    expect(resposta.headers.get("x-middleware-next")).toBe("1");
    expect(fetchFalso).not.toHaveBeenCalled();
  });
});
