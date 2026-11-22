/**
 * Decisões de acesso (`src/lib/admin/decisoes.ts`) contra o Supabase local, com o JWT de
 * cada usuário (história 16, critério 4: aceitar, recusar, revogar e reabrir).
 *
 * O servidor confere `eh_admin` antes de gravar e recusa o próprio usuário. O RLS é a
 * segunda camada: o teste "sem a checagem do servidor" mostra que ele segura sozinho.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { decidirAcesso, TRANSICOES } from "@/lib/admin/decisoes";
import { clienteDeServico } from "./helpers/supabase-local";
import {
  apagarUsuarios,
  criarUsuario,
  definirStatus,
  type StatusDoPerfil,
  type UsuarioDeTeste,
} from "./helpers/usuarios";

const servico = clienteDeServico();
const EMAILS = {
  admin: "acessos-admin@exemplo.test",
  pendente: "acessos-pendente@exemplo.test",
  alvo: "acessos-alvo@exemplo.test",
};

let admin: UsuarioDeTeste;
let pendente: UsuarioDeTeste;
let alvo: UsuarioDeTeste;

async function perfilDe(id: string) {
  const { data } = await servico
    .from("perfis")
    .select("status,decidido_por,decidido_em")
    .eq("user_id", id)
    .single();
  return data as {
    status: StatusDoPerfil;
    decidido_por: string | null;
    decidido_em: string | null;
  };
}

beforeAll(async () => {
  admin = await criarUsuario(servico, {
    email: EMAILS.admin,
    status: "aprovado",
  });
  pendente = await criarUsuario(servico, { email: EMAILS.pendente });
  alvo = await criarUsuario(servico, { email: EMAILS.alvo });
});

afterAll(async () => {
  await apagarUsuarios(servico, Object.values(EMAILS));
});

beforeEach(async () => {
  await definirStatus(servico, alvo.id, "pendente");
  await definirStatus(servico, admin.id, "aprovado");
});

describe("decidirAcesso: as quatro ações", () => {
  it.each([
    ["aceitar", "pendente", "aprovado"],
    ["recusar", "pendente", "recusado"],
    ["revogar", "aprovado", "revogado"],
    ["reabrir", "recusado", "pendente"],
    ["reabrir", "revogado", "pendente"],
  ] as const)(
    "%s: %s → %s, assinado por quem decidiu",
    async (decisao, de, para) => {
      await definirStatus(servico, alvo.id, de);
      const antes = Date.now();
      const resultado = await decidirAcesso({
        cliente: admin.cliente,
        decisorId: admin.id,
        alvoId: alvo.id,
        decisao,
      });
      expect(resultado).toEqual({ ok: true, status: para });
      const perfil = await perfilDe(alvo.id);
      expect(perfil.status).toBe(para);
      expect(perfil.decidido_por).toBe(admin.id);
      expect(Date.parse(perfil.decidido_em!)).toBeGreaterThanOrEqual(
        antes - 5_000,
      );
    },
  );

  it("a tabela de transições é a da história", () => {
    expect(TRANSICOES).toEqual({
      aceitar: { de: ["pendente"], para: "aprovado" },
      recusar: { de: ["pendente"], para: "recusado" },
      revogar: { de: ["aprovado"], para: "revogado" },
      reabrir: { de: ["recusado", "revogado"], para: "pendente" },
    });
  });

  it.each([
    ["aceitar", "aprovado"],
    ["aceitar", "recusado"],
    ["recusar", "aprovado"],
    ["revogar", "pendente"],
    ["reabrir", "pendente"],
    ["reabrir", "aprovado"],
  ] as const)(
    "%s com o alvo %s: estado_mudou, nada gravado",
    async (decisao, de) => {
      await definirStatus(servico, alvo.id, de);
      const antes = await perfilDe(alvo.id);
      const resultado = await decidirAcesso({
        cliente: admin.cliente,
        decisorId: admin.id,
        alvoId: alvo.id,
        decisao,
      });
      expect(resultado).toMatchObject({ ok: false, erro: "estado_mudou" });
      expect(await perfilDe(alvo.id)).toEqual(antes);
    },
  );
});

describe("decidirAcesso: recusas", () => {
  it("o admin não decide sobre si mesmo", async () => {
    const resultado = await decidirAcesso({
      cliente: admin.cliente,
      decisorId: admin.id,
      alvoId: admin.id,
      decisao: "revogar",
    });
    expect(resultado).toMatchObject({ ok: false, erro: "proprio_usuario" });
    expect((await perfilDe(admin.id)).status).toBe("aprovado");
  });

  it("quem não é admin (eh_admin falso) não decide nada", async () => {
    const resultado = await decidirAcesso({
      cliente: pendente.cliente,
      decisorId: pendente.id,
      alvoId: alvo.id,
      decisao: "aceitar",
    });
    expect(resultado).toMatchObject({ ok: false, erro: "nao_autorizado" });
    expect((await perfilDe(alvo.id)).status).toBe("pendente");
  });

  it("decisorId que não é o dono do JWT: o RLS recusa (decidido_por precisa ser quem está logado)", async () => {
    const resultado = await decidirAcesso({
      cliente: admin.cliente,
      decisorId: pendente.id,
      alvoId: alvo.id,
      decisao: "aceitar",
    });
    expect(resultado.ok).toBe(false);
    expect((await perfilDe(alvo.id)).status).toBe("pendente");
  });

  it.each([
    ["vazio", ""],
    ["não é uuid", "abc"],
    [
      "injeção no filtro",
      `${"0".repeat(8)}-0000-0000-0000-000000000000,status.eq.aprovado`,
    ],
    ["número", 42],
    ["nulo", null],
  ])("alvoId inválido (%s): id_invalido", async (_nome, alvoId) => {
    const resultado = await decidirAcesso({
      cliente: admin.cliente,
      decisorId: admin.id,
      alvoId,
      decisao: "aceitar",
    });
    expect(resultado).toMatchObject({ ok: false, erro: "id_invalido" });
  });

  it("decisão desconhecida: decisao_invalida", async () => {
    const resultado = await decidirAcesso({
      cliente: admin.cliente,
      decisorId: admin.id,
      alvoId: alvo.id,
      decisao: "promover" as never,
    });
    expect(resultado).toMatchObject({ ok: false, erro: "decisao_invalida" });
    expect((await perfilDe(alvo.id)).status).toBe("pendente");
  });

  it("alvo que não existe: estado_mudou", async () => {
    const resultado = await decidirAcesso({
      cliente: admin.cliente,
      decisorId: admin.id,
      alvoId: "00000000-0000-4000-8000-000000000999",
      decisao: "aceitar",
    });
    expect(resultado).toMatchObject({ ok: false, erro: "estado_mudou" });
  });

  it("toda recusa tem mensagem em pt-BR para a tela", async () => {
    const resultado = await decidirAcesso({
      cliente: admin.cliente,
      decisorId: admin.id,
      alvoId: admin.id,
      decisao: "revogar",
    });
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.mensagem).toMatch(/próprio acesso/);
  });
});
