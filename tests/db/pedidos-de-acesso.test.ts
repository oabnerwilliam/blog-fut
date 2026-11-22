/**
 * `listarPedidosDeAcesso` (`src/lib/admin/perfis.ts`) contra o Supabase local, com o JWT
 * de cada usuário (história 16, critério 4: a lista de `/admin/acessos`).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { listarPedidosDeAcesso } from "@/lib/admin/perfis";
import { clienteDeServico } from "./helpers/supabase-local";
import {
  apagarUsuarios,
  criarUsuario,
  type UsuarioDeTeste,
} from "./helpers/usuarios";

const servico = clienteDeServico();
const EMAILS = {
  admin: "pedidos-admin@exemplo.test",
  outroAdmin: "pedidos-outro-admin@exemplo.test",
  pendente1: "pedidos-pendente1@exemplo.test",
  pendente2: "pedidos-pendente2@exemplo.test",
  recusado: "pedidos-recusado@exemplo.test",
  revogado: "pedidos-revogado@exemplo.test",
};

let admin: UsuarioDeTeste;
let outroAdmin: UsuarioDeTeste;
let pendente1: UsuarioDeTeste;
let pendente2: UsuarioDeTeste;
let recusado: UsuarioDeTeste;
let revogado: UsuarioDeTeste;

async function ajustar(id: string, campos: Record<string, unknown>) {
  const { error } = await servico
    .from("perfis")
    .update(campos)
    .eq("user_id", id);
  expect(error).toBeNull();
}

beforeAll(async () => {
  // Só os perfis deste arquivo: os de outros testes já foram apagados no afterAll deles.
  admin = await criarUsuario(servico, {
    email: EMAILS.admin,
    metadados: { full_name: "Marina Couto" },
  });
  outroAdmin = await criarUsuario(servico, {
    email: EMAILS.outroAdmin,
    metadados: { full_name: "Tiago Moreira" },
  });
  pendente1 = await criarUsuario(servico, {
    email: EMAILS.pendente1,
    metadados: { full_name: "Joana Prado" },
  });
  pendente2 = await criarUsuario(servico, { email: EMAILS.pendente2 });
  recusado = await criarUsuario(servico, {
    email: EMAILS.recusado,
    metadados: { full_name: "Carlos Henrique Duarte" },
  });
  revogado = await criarUsuario(servico, {
    email: EMAILS.revogado,
    metadados: { full_name: "Paula Viana" },
  });

  // Marina foi promovida por comando (decidido_por nulo); Tiago, por Marina.
  await ajustar(admin.id, {
    status: "aprovado",
    decidido_em: "2026-11-19T12:00:00Z",
  });
  await ajustar(outroAdmin.id, {
    status: "aprovado",
    decidido_por: admin.id,
    decidido_em: "2026-11-20T12:00:00Z",
  });
  await ajustar(pendente1.id, { created_at: "2026-11-21T12:14:00Z" });
  await ajustar(pendente2.id, { created_at: "2026-11-21T13:02:00Z" });
  await ajustar(recusado.id, {
    status: "recusado",
    decidido_por: admin.id,
    decidido_em: "2026-11-20T15:00:00Z",
  });
  await ajustar(revogado.id, {
    status: "revogado",
    decidido_por: outroAdmin.id,
    decidido_em: "2026-11-20T16:00:00Z",
  });
});

afterAll(async () => {
  await apagarUsuarios(servico, Object.values(EMAILS));
});

describe("listarPedidosDeAcesso", () => {
  it("o admin vê os três grupos, na ordem de chegada e de decisão", async () => {
    const pedidos = await listarPedidosDeAcesso(admin.cliente, admin.id);
    const resumo = (lista: typeof pedidos.pendentes) =>
      lista.map((p) => [p.nome, p.status, p.decisao, p.ehVoce]);

    expect(resumo(pedidos.pendentes)).toEqual([
      ["Joana Prado", "pendente", null, false],
      [EMAILS.pendente2, "pendente", null, false],
    ]);
    expect(resumo(pedidos.aprovados)).toEqual([
      ["Marina Couto", "aprovado", { por: "comando" }, true],
      [
        "Tiago Moreira",
        "aprovado",
        { por: "pessoa", nome: "Marina Couto" },
        false,
      ],
    ]);
    expect(resumo(pedidos.negados)).toEqual([
      [
        "Carlos Henrique Duarte",
        "recusado",
        { por: "pessoa", nome: "Marina Couto" },
        false,
      ],
      [
        "Paula Viana",
        "revogado",
        { por: "pessoa", nome: "Tiago Moreira" },
        false,
      ],
    ]);
  });

  it("cada pedido traz o que a linha mostra", async () => {
    const { pendentes, aprovados } = await listarPedidosDeAcesso(
      admin.cliente,
      admin.id,
    );
    expect(pendentes[0]).toEqual({
      userId: pendente1.id,
      nome: "Joana Prado",
      email: EMAILS.pendente1,
      avatarUrl: null,
      iniciais: "JP",
      status: "pendente",
      pedidoEm: expect.stringMatching(/^2026-11-21T12:14:00/),
      decididoEm: null,
      decisao: null,
      ehVoce: false,
    });
    expect(aprovados[0].decididoEm).toMatch(/^2026-11-19T12:00:00/);
  });

  it("um pendente, com o próprio JWT, só se vê a si mesmo", async () => {
    const pedidos = await listarPedidosDeAcesso(
      pendente1.cliente,
      pendente1.id,
    );
    expect(pedidos.pendentes.map((p) => p.userId)).toEqual([pendente1.id]);
    expect(pedidos.aprovados).toEqual([]);
    expect(pedidos.negados).toEqual([]);
  });
});
