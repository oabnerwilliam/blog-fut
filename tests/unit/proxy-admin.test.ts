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
  it("segue adiante sem consultar o banco nem a rede", async () => {
    vi.stubEnv("ADMIN_HABILITADO", "true");
    for (const caminho of CAMINHOS) {
      const resposta = await proxy(pedido(caminho));
      expect(resposta.headers.get("x-middleware-rewrite"), caminho).toBeNull();
      expect(resposta.headers.get("x-middleware-next"), caminho).toBe("1");
    }
    expect(getRepository).not.toHaveBeenCalled();
    expect(fetchFalso).not.toHaveBeenCalled();
  });
});
