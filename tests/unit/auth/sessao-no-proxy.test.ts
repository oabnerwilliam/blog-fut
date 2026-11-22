/**
 * Renovação da sessão no Proxy (história 16; ADR 0006, "Extensão (história 16)").
 *
 * O Proxy não consulta o banco no `/admin`. Ele só fala com o Auth quando o access token
 * do cookie venceu (uma vez por hora, por usuário), porque Server Components não gravam
 * cookie e o refresh token só pode ser usado uma vez. Um `fetch` falso prova quando há
 * rede e quando não há.
 */
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renovarSessaoDoAdmin } from "@/lib/auth/sessao-no-proxy";

const URL_DO_SUPABASE = "http://127.0.0.1:54321";
const AMBIENTE = {
  NEXT_PUBLIC_SUPABASE_URL: URL_DO_SUPABASE,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "chave-anon-de-teste",
};
/** Nome que o @supabase/ssr dá ao cookie para esta URL (`sb-<host>-auth-token`). */
const COOKIE = "sb-127-auth-token";

const USUARIO = {
  id: "00000000-0000-4000-8000-000000000001",
  aud: "authenticated",
  role: "authenticated",
  email: "sessao@exemplo.test",
  app_metadata: {},
  user_metadata: {},
  created_at: "2026-11-21T00:00:00Z",
};

function sessao(expiraEmSegundos: number, refresh = "refresh-1") {
  const agora = Math.floor(Date.now() / 1000);
  return {
    access_token: `token-que-vence-em-${expiraEmSegundos}`,
    refresh_token: refresh,
    token_type: "bearer",
    expires_in: 3600,
    expires_at: agora + expiraEmSegundos,
    user: USUARIO,
  };
}

/** O formato do @supabase/ssr: `base64-` + JSON da sessão em base64url. */
function valorDoCookie(dados: unknown): string {
  return `base64-${Buffer.from(JSON.stringify(dados)).toString("base64url")}`;
}

function pedido(caminho: string, cookies: Record<string, string> = {}) {
  const cabecalho = Object.entries(cookies)
    .map(([nome, valor]) => `${nome}=${valor}`)
    .join("; ");
  return new NextRequest(`http://localhost:3000${caminho}`, {
    headers: cabecalho ? { cookie: cabecalho } : {},
  });
}

let fetchFalso: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchFalso = vi.fn();
  vi.stubGlobal("fetch", fetchFalso);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("renovarSessaoDoAdmin", () => {
  it("sem cookie de sessão: segue adiante sem rede", async () => {
    const resposta = await renovarSessaoDoAdmin(pedido("/admin"), AMBIENTE);
    expect(resposta.headers.get("x-middleware-next")).toBe("1");
    expect(fetchFalso).not.toHaveBeenCalled();
  });

  it("o cookie do PKCE (code-verifier) sozinho não conta como sessão", async () => {
    const resposta = await renovarSessaoDoAdmin(
      pedido("/admin/auth/callback?code=abc", {
        [`${COOKIE}-code-verifier`]: "base64-InZlcmlmaWVyIg",
      }),
      AMBIENTE,
    );
    expect(resposta.headers.get("x-middleware-next")).toBe("1");
    expect(fetchFalso).not.toHaveBeenCalled();
  });

  it("sessão dentro do prazo: segue adiante sem rede e sem Set-Cookie", async () => {
    const resposta = await renovarSessaoDoAdmin(
      pedido("/admin", { [COOKIE]: valorDoCookie(sessao(3000)) }),
      AMBIENTE,
    );
    expect(resposta.headers.get("x-middleware-next")).toBe("1");
    expect(resposta.headers.get("set-cookie")).toBeNull();
    expect(fetchFalso).not.toHaveBeenCalled();
  });

  it("sessão vencida: renova no Auth e devolve o cookie novo na resposta", async () => {
    const nova = sessao(3600, "refresh-2");
    fetchFalso.mockResolvedValue(
      new Response(JSON.stringify(nova), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const resposta = await renovarSessaoDoAdmin(
      pedido("/admin/acessos", { [COOKIE]: valorDoCookie(sessao(-60)) }),
      AMBIENTE,
    );

    expect(fetchFalso).toHaveBeenCalledTimes(1);
    const [endereco, init] = fetchFalso.mock.calls[0] as [string, RequestInit];
    expect(endereco).toBe(
      `${URL_DO_SUPABASE}/auth/v1/token?grant_type=refresh_token`,
    );
    expect(JSON.parse(String(init.body))).toEqual({
      refresh_token: "refresh-1",
    });

    expect(resposta.headers.get("x-middleware-next")).toBe("1");
    const gravado = resposta.cookies.get(COOKIE);
    expect(gravado?.value).toBe(valorDoCookie(nova));
    // A renovação nunca pode ficar num cache compartilhado (CDN).
    expect(resposta.headers.get("cache-control")).toMatch(/no-store|private/);
  });

  it("refresh token recusado pelo Auth: apaga o cookie (a pessoa entra de novo)", async () => {
    fetchFalso.mockResolvedValue(
      new Response(
        JSON.stringify({
          code: "refresh_token_not_found",
          error_code: "refresh_token_not_found",
          msg: "Invalid Refresh Token: Refresh Token Not Found",
        }),
        { status: 400, headers: { "content-type": "application/json" } },
      ),
    );
    const resposta = await renovarSessaoDoAdmin(
      pedido("/admin", { [COOKIE]: valorDoCookie(sessao(-60)) }),
      AMBIENTE,
    );
    expect(resposta.headers.get("x-middleware-next")).toBe("1");
    const apagado = resposta.cookies.get(COOKIE);
    expect(apagado?.value).toBe("");
  });

  it("Auth lento: desiste no prazo e segue adiante, sem lançar", async () => {
    fetchFalso.mockReturnValue(new Promise(() => {}));
    const resposta = await renovarSessaoDoAdmin(
      pedido("/admin", { [COOKIE]: valorDoCookie(sessao(-60)) }),
      AMBIENTE,
      { limiteMs: 50 },
    );
    expect(resposta.headers.get("x-middleware-next")).toBe("1");
  });

  it("sem as variáveis do Supabase: segue adiante, sem lançar (a página mostra o erro)", async () => {
    const resposta = await renovarSessaoDoAdmin(
      pedido("/admin", { [COOKIE]: valorDoCookie(sessao(-60)) }),
      {},
    );
    expect(resposta.headers.get("x-middleware-next")).toBe("1");
    expect(fetchFalso).not.toHaveBeenCalled();
  });
});
