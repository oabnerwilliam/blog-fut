/**
 * `GET /api/manter-ativo` (história 14, critério 6): o cron diário da Vercel faz uma
 * leitura leve para o Supabase gratuito não pausar. A leitura é trocada por um espião.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/manter-ativo/route";
import { cutucarBanco } from "@/lib/content";

vi.mock("@/lib/content", () => ({ cutucarBanco: vi.fn() }));

const SEGREDO = "segredo-do-cron";

function pedido(cabecalhos: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/manter-ativo", {
    headers: cabecalhos,
  });
}

beforeEach(() => {
  vi.stubEnv("CRON_SECRET", SEGREDO);
  vi.mocked(cutucarBanco).mockReset();
  vi.mocked(cutucarBanco).mockResolvedValue(true);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GET /api/manter-ativo", () => {
  it.each([
    ["sem Authorization", {}],
    ["valor errado", { authorization: `Bearer ${SEGREDO}x` }],
    ["sem o prefixo Bearer", { authorization: SEGREDO }],
    ["outro esquema", { authorization: `Basic ${SEGREDO}` }],
  ])("%s → 401 e o banco não é consultado", async (_caso, cabecalhos) => {
    const resposta = await GET(pedido(cabecalhos));
    expect(resposta.status).toBe(401);
    expect(cutucarBanco).not.toHaveBeenCalled();
  });

  it("CRON_SECRET não definido → 401, mesmo com 'Bearer ' vazio", async () => {
    vi.stubEnv("CRON_SECRET", undefined);
    const resposta = await GET(pedido({ authorization: "Bearer " }));
    expect(resposta.status).toBe(401);
    expect(cutucarBanco).not.toHaveBeenCalled();
  });

  it("segredo certo e banco respondendo → 200 { ok: true }", async () => {
    const resposta = await GET(pedido({ authorization: `Bearer ${SEGREDO}` }));
    expect(resposta.status).toBe(200);
    expect(await resposta.json()).toEqual({ ok: true });
    expect(cutucarBanco).toHaveBeenCalledTimes(1);
  });

  it("segredo certo e banco fora do ar → 503 { ok: false }", async () => {
    vi.mocked(cutucarBanco).mockResolvedValue(false);
    const resposta = await GET(pedido({ authorization: `Bearer ${SEGREDO}` }));
    expect(resposta.status).toBe(503);
    expect(await resposta.json()).toEqual({ ok: false });
  });

  it("a resposta nunca vai para cache", async () => {
    const resposta = await GET(pedido({ authorization: `Bearer ${SEGREDO}` }));
    expect(resposta.headers.get("cache-control")).toBe("no-store");
  });
});
