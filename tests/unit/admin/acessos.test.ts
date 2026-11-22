/**
 * Server actions de `src/lib/admin/acessos.ts` (história 16, critério 4).
 *
 * A regra de cada decisão está em `decisoes.ts` e é testada no banco
 * (`tests/db/acessos.test.ts`). Aqui fica o que a action acrescenta: a sessão vem do
 * servidor (nunca do formulário), quem não está aprovado não chega ao banco, e a tela só
 * é atualizada quando a decisão foi gravada.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const obterSessaoDoAdmin = vi.fn();
const criarClienteDoServidor = vi.fn();
const decidirAcesso = vi.fn();
const refresh = vi.fn();

vi.mock("@/lib/auth/servidor", () => ({
  obterSessaoDoAdmin,
  criarClienteDoServidor,
}));
vi.mock("@/lib/admin/decisoes", async (original) => ({
  ...(await original<typeof import("@/lib/admin/decisoes")>()),
  decidirAcesso,
}));
vi.mock("next/cache", () => ({ refresh }));

const acoes = await import("@/lib/admin/acessos");

const ADMIN = "00000000-0000-4000-8000-0000000000a1";
const ALVO = "00000000-0000-4000-8000-0000000000b2";
const CLIENTE = { sou: "o cliente com a sessão" };

function sessao(status: string | null) {
  return {
    usuario: { id: ADMIN, email: "admin@exemplo.test" },
    perfil: status === null ? null : { userId: ADMIN, status },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  criarClienteDoServidor.mockResolvedValue(CLIENTE);
  decidirAcesso.mockResolvedValue({ ok: true, status: "aprovado" });
});

describe("as quatro actions", () => {
  it.each(["aceitar", "recusar", "revogar", "reabrir"] as const)(
    "%s: decide com o id da sessão e atualiza a tela",
    async (nome) => {
      obterSessaoDoAdmin.mockResolvedValue(sessao("aprovado"));
      const resultado = await acoes[nome](ALVO);
      expect(resultado).toEqual({ ok: true, status: "aprovado" });
      expect(decidirAcesso).toHaveBeenCalledWith({
        cliente: CLIENTE,
        decisorId: ADMIN,
        alvoId: ALVO,
        decisao: nome,
      });
      expect(refresh).toHaveBeenCalledTimes(1);
    },
  );

  it('o arquivo só exporta as quatro actions (tudo que um "use server" exporta vira endpoint)', () => {
    expect(Object.keys(acoes).sort()).toEqual([
      "aceitar",
      "reabrir",
      "recusar",
      "revogar",
    ]);
  });
});

describe("antes do banco", () => {
  it.each([
    ["sem sessão", null],
    ["pendente", sessao("pendente")],
    ["recusado", sessao("recusado")],
    ["revogado", sessao("revogado")],
    ["sem perfil", sessao(null)],
  ])("%s: nao_autorizado, sem chamar o banco", async (_nome, valor) => {
    obterSessaoDoAdmin.mockResolvedValue(valor);
    const resultado = await acoes.aceitar(ALVO);
    expect(resultado).toMatchObject({ ok: false, erro: "nao_autorizado" });
    expect(criarClienteDoServidor).not.toHaveBeenCalled();
    expect(decidirAcesso).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("falha ao ler a sessão (banco fora do ar): falha tratada, sem lançar", async () => {
    obterSessaoDoAdmin.mockRejectedValue(new Error("fetch failed"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const resultado = await acoes.revogar(ALVO);
    expect(resultado).toMatchObject({ ok: false, erro: "falha" });
    expect(decidirAcesso).not.toHaveBeenCalled();
  });
});

describe("depois do banco", () => {
  it("decisão recusada: devolve a mensagem e não atualiza a tela", async () => {
    obterSessaoDoAdmin.mockResolvedValue(sessao("aprovado"));
    decidirAcesso.mockResolvedValue({
      ok: false,
      erro: "proprio_usuario",
      mensagem: "Você não pode mudar o seu próprio acesso.",
    });
    const resultado = await acoes.revogar(ADMIN);
    expect(resultado).toMatchObject({ ok: false, erro: "proprio_usuario" });
    expect(refresh).not.toHaveBeenCalled();
  });
});
