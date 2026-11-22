/**
 * Server actions de `src/lib/admin/materias.ts` e o `exigirAdmin` (história 17,
 * critério 3).
 *
 * As regras de cada gravação estão em `painel.ts` e são testadas no banco
 * (`tests/db/painel.test.ts`). Aqui fica o que a action acrescenta: quem não é admin
 * não chega ao banco, publicar e despublicar expiram as etiquetas do cache com o
 * `updateTag`, e salvar e restaurar só atualizam a tela.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const obterSessaoDoAdmin = vi.fn();
const criarClienteDoServidor = vi.fn();
const updateTag = vi.fn();
const refresh = vi.fn();
const rpc = vi.fn();
const nucleo = {
  listarMaterias: vi.fn(),
  gravarRevisao: vi.fn(),
  publicarRevisao: vi.fn(),
  despublicarMateria: vi.fn(),
  restaurarRevisao: vi.fn(),
};

vi.mock("@/lib/auth/servidor", () => ({
  obterSessaoDoAdmin,
  criarClienteDoServidor,
}));
vi.mock("@/lib/admin/painel", async (original) => ({
  ...(await original<typeof import("@/lib/admin/painel")>()),
  ...nucleo,
}));
vi.mock("next/cache", () => ({ updateTag, refresh }));

const acoes = await import("@/lib/admin/materias");
const { exigirAdmin } = await import("@/lib/admin/sessao");

const ADMIN = "00000000-0000-4000-8000-0000000000a1";
const MATERIA = "00000000-0000-4000-8000-0000000000c3";
const CLIENTE = { rpc };

function sessao(status: string | null) {
  return {
    usuario: { id: ADMIN, email: "admin@exemplo.test" },
    perfil: status === null ? null : { userId: ADMIN, status },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("ADMIN_HABILITADO", "true");
  obterSessaoDoAdmin.mockResolvedValue(sessao("aprovado"));
  criarClienteDoServidor.mockResolvedValue(CLIENTE);
  rpc.mockResolvedValue({ data: true, error: null });
  nucleo.listarMaterias.mockResolvedValue({ ok: true, materias: [] });
  nucleo.gravarRevisao.mockResolvedValue({ ok: true, numero: 2 });
  nucleo.publicarRevisao.mockResolvedValue({ ok: true, slug: "psg-vence" });
  nucleo.despublicarMateria.mockResolvedValue({ ok: true, slug: "psg-vence" });
  nucleo.restaurarRevisao.mockResolvedValue({ ok: true, numero: 4 });
});

/** Cada action com argumentos válidos. */
const CHAMADAS = {
  listarMateriasDoPainel: () => acoes.listarMateriasDoPainel({}),
  salvarRevisao: () => acoes.salvarRevisao(MATERIA, {} as never),
  publicarAlteracoes: () => acoes.publicarAlteracoes(MATERIA),
  despublicar: () => acoes.despublicar(MATERIA),
  restaurarRevisao: () => acoes.restaurarRevisao(MATERIA, 1),
} as const;

describe("o arquivo das actions", () => {
  it('só exporta as cinco actions (tudo que um "use server" exporta vira endpoint)', () => {
    expect(Object.keys(acoes).sort()).toEqual(Object.keys(CHAMADAS).sort());
  });
});

describe("exigirAdmin", () => {
  it("aprovado e eh_admin verdadeira: devolve o cliente da sessão", async () => {
    expect(await exigirAdmin()).toEqual({
      ok: true,
      admin: { cliente: CLIENTE, usuarioId: ADMIN },
    });
    expect(rpc).toHaveBeenCalledWith("eh_admin");
  });

  it("admin desligado (preview, testes com files): recusa sem ler a sessão", async () => {
    vi.stubEnv("ADMIN_HABILITADO", "false");
    expect(await exigirAdmin()).toMatchObject({
      ok: false,
      erro: "nao_autorizado",
    });
    expect(obterSessaoDoAdmin).not.toHaveBeenCalled();
  });

  it("perfil aprovado, mas eh_admin falsa no banco (revogado agora): recusa", async () => {
    rpc.mockResolvedValue({ data: false, error: null });
    expect(await exigirAdmin()).toMatchObject({
      ok: false,
      erro: "nao_autorizado",
    });
  });

  it("eh_admin com erro: falha tratada", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    rpc.mockResolvedValue({ data: null, error: { message: "fora do ar" } });
    expect(await exigirAdmin()).toMatchObject({ ok: false, erro: "falha" });
  });

  it("a leitura da sessão lança (banco fora do ar): falha tratada, sem lançar", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    obterSessaoDoAdmin.mockRejectedValue(new Error("fetch failed"));
    expect(await exigirAdmin()).toMatchObject({ ok: false, erro: "falha" });
  });
});

describe.each(Object.entries(CHAMADAS))("%s", (_nome, chamar) => {
  it.each([
    ["sem sessão", null],
    ["pendente", sessao("pendente")],
    ["recusado", sessao("recusado")],
    ["revogado", sessao("revogado")],
    ["sem perfil", sessao(null)],
  ])("%s: nao_autorizado, sem ir ao banco", async (_quem, valor) => {
    obterSessaoDoAdmin.mockResolvedValue(valor);
    const resultado = await chamar();
    expect(resultado).toMatchObject({ ok: false, erro: "nao_autorizado" });
    expect(resultado).toHaveProperty("mensagem");
    expect(criarClienteDoServidor).not.toHaveBeenCalled();
    for (const funcao of Object.values(nucleo)) {
      expect(funcao).not.toHaveBeenCalled();
    }
    expect(updateTag).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("com o admin", () => {
  it("listar: passa os filtros e não mexe no cache", async () => {
    await acoes.listarMateriasDoPainel({ status: "rascunho" });
    expect(nucleo.listarMaterias).toHaveBeenCalledWith(CLIENTE, {
      status: "rascunho",
    });
    expect(updateTag).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("salvar: grava com o cliente da sessão e só atualiza a tela (o site não muda)", async () => {
    const campos = { titulo: "Novo" } as never;
    expect(await acoes.salvarRevisao(MATERIA, campos)).toEqual({
      ok: true,
      numero: 2,
    });
    expect(nucleo.gravarRevisao).toHaveBeenCalledWith(CLIENTE, MATERIA, campos);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(updateTag).not.toHaveBeenCalled();
  });

  it("restaurar: cria a revisão nova e só atualiza a tela", async () => {
    expect(await acoes.restaurarRevisao(MATERIA, 1)).toEqual({
      ok: true,
      numero: 4,
    });
    expect(nucleo.restaurarRevisao).toHaveBeenCalledWith(CLIENTE, MATERIA, 1);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(updateTag).not.toHaveBeenCalled();
  });

  it.each([
    ["publicarAlteracoes", "publicarRevisao"],
    ["despublicar", "despublicarMateria"],
  ] as const)(
    "%s: expira materias e materia:<slug> com o updateTag",
    async (acao, funcao) => {
      expect(await acoes[acao](MATERIA)).toEqual({
        ok: true,
        slug: "psg-vence",
      });
      expect(nucleo[funcao]).toHaveBeenCalledWith(CLIENTE, MATERIA);
      expect(updateTag.mock.calls).toEqual([
        ["materias"],
        ["materia:psg-vence"],
      ]);
    },
  );

  it.each([
    ["salvarRevisao", "gravarRevisao"],
    ["restaurarRevisao", "restaurarRevisao"],
    ["publicarAlteracoes", "publicarRevisao"],
    ["despublicar", "despublicarMateria"],
  ] as const)(
    "%s recusado pelo núcleo: devolve a recusa e não mexe no cache nem na tela",
    async (acao, funcao) => {
      const recusa = {
        ok: false,
        erro: "materia_inexistente",
        mensagem: "Essa matéria não existe mais.",
      };
      nucleo[funcao].mockResolvedValue(recusa);
      expect(await CHAMADAS[acao]()).toEqual(recusa);
      expect(updateTag).not.toHaveBeenCalled();
      expect(refresh).not.toHaveBeenCalled();
    },
  );
});
