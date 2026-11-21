/**
 * `POST /api/revalidar` (história 14, critério 1): o webhook do banco invalida as
 * etiquetas do cache. O `revalidateTag` do Next é trocado por um espião.
 */
import { revalidateTag } from "next/cache";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/revalidar/route";

vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));

const SEGREDO = "segredo-de-teste-com-32-caracteres!";

function pedido(
  corpo: unknown,
  cabecalhos: Record<string, string> = { "x-revalidate-secret": SEGREDO },
): Request {
  return new Request("http://localhost/api/revalidar", {
    method: "POST",
    headers: { "content-type": "application/json", ...cabecalhos },
    body: typeof corpo === "string" ? corpo : JSON.stringify(corpo),
  });
}

beforeEach(() => {
  vi.stubEnv("REVALIDATE_SECRET", SEGREDO);
  vi.mocked(revalidateTag).mockClear();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/revalidar: segredo", () => {
  it.each([
    ["sem o header", {}],
    [
      "segredo errado, mesmo tamanho",
      { "x-revalidate-secret": SEGREDO.replace("s", "x") },
    ],
    ["segredo de tamanho diferente", { "x-revalidate-secret": "curto" }],
    ["segredo mais longo", { "x-revalidate-secret": `${SEGREDO}a` }],
    ["header vazio", { "x-revalidate-secret": "" }],
  ])("%s → 401 e nada invalidado", async (_caso, cabecalhos) => {
    const resposta = await POST(
      pedido({ tabela: "articles", slug: "a" }, cabecalhos),
    );
    expect(resposta.status).toBe(401);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("REVALIDATE_SECRET não definido no servidor → 401, mesmo com header", async () => {
    vi.stubEnv("REVALIDATE_SECRET", undefined);
    const resposta = await POST(pedido({ tabela: "tags" }));
    expect(resposta.status).toBe(401);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("REVALIDATE_SECRET vazio no servidor → 401, mesmo com header vazio", async () => {
    vi.stubEnv("REVALIDATE_SECRET", "");
    const resposta = await POST(
      pedido({ tabela: "tags" }, { "x-revalidate-secret": "" }),
    );
    expect(resposta.status).toBe(401);
  });

  it("o 401 vem antes de ler o corpo: payload inválido sem segredo continua 401", async () => {
    const resposta = await POST(pedido("{ não é json", {}));
    expect(resposta.status).toBe(401);
  });
});

describe("POST /api/revalidar: payload", () => {
  it.each([
    ["JSON quebrado", "{ não é json"],
    ["sem tabela", { slug: "a" }],
    ["tabela desconhecida", { tabela: "perfis" }],
    ["slug malformado", { tabela: "articles", slug: "../x" }],
    [
      "slug_antigo malformado",
      { tabela: "articles", slug: "a", slug_antigo: "A B" },
    ],
    ["slug que não é texto", { tabela: "articles", slug: 1 }],
    [
      "slug longo demais (etiqueta passa de 256)",
      { tabela: "articles", slug: "a".repeat(250) },
    ],
    ["corpo que não é objeto", [1, 2]],
  ])("%s → 400 e nada invalidado", async (_caso, corpo) => {
    const resposta = await POST(pedido(corpo));
    expect(resposta.status).toBe(400);
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});

describe("POST /api/revalidar: o que invalida", () => {
  it("articles com slug: materias e materia:<slug>, com expire 0", async () => {
    const resposta = await POST(pedido({ tabela: "articles", slug: "psg" }));
    expect(resposta.status).toBe(200);
    expect(await resposta.json()).toEqual({
      revalidado: ["materias", "materia:psg"],
    });
    expect(vi.mocked(revalidateTag).mock.calls).toEqual([
      ["materias", { expire: 0 }],
      ["materia:psg", { expire: 0 }],
    ]);
  });

  it("articles com slug_antigo (o slug mudou): invalida os dois", async () => {
    const resposta = await POST(
      pedido({ tabela: "articles", slug: "novo", slug_antigo: "velho" }),
    );
    expect(await resposta.json()).toEqual({
      revalidado: ["materias", "materia:novo", "materia:velho"],
    });
  });

  it("slug_antigo igual ao slug não repete a etiqueta", async () => {
    const resposta = await POST(
      pedido({ tabela: "articles", slug: "a", slug_antigo: "a" }),
    );
    expect(await resposta.json()).toEqual({
      revalidado: ["materias", "materia:a"],
    });
  });

  it("articles sem slug (null aceito): só materias", async () => {
    const resposta = await POST(
      pedido({ tabela: "articles", slug: null, slug_antigo: null }),
    );
    expect(await resposta.json()).toEqual({ revalidado: ["materias"] });
  });

  it("tags: tags e materias (os rótulos aparecem nas listagens)", async () => {
    const resposta = await POST(pedido({ tabela: "tags", slug: "psg" }));
    expect(resposta.status).toBe(200);
    expect(await resposta.json()).toEqual({ revalidado: ["tags", "materias"] });
  });

  it("campos a mais no corpo são ignorados", async () => {
    const resposta = await POST(pedido({ tabela: "tags", operacao: "UPDATE" }));
    expect(resposta.status).toBe(200);
  });
});
