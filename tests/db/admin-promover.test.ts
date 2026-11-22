/**
 * `pnpm admin:promover` contra o Supabase local (história 16, critério 7). E-mails só
 * `@exemplo.test`, e a saída do comando nunca mostra o e-mail inteiro.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { executarPromoverAdmin, promoverAdmin } from "../../scripts/lib/admin";
import type { Ambiente } from "../../scripts/lib/ambiente";
import { ErroDoComando } from "../../scripts/lib/materias";
import { clienteDeServico, supabaseLocal } from "./helpers/supabase-local";
import {
  apagarUsuarios,
  criarUsuario,
  definirStatus,
  type UsuarioDeTeste,
} from "./helpers/usuarios";

const servico = clienteDeServico();
const EMAILS = {
  pessoa: "promover-pessoa@exemplo.test",
  parecida: "promover_pessoa@exemplo.test",
  curinga: "promoverXpessoa@exemplo.test",
};

let pessoa: UsuarioDeTeste;
let parecida: UsuarioDeTeste;
let curinga: UsuarioDeTeste;

async function statusDe(id: string) {
  const { data } = await servico
    .from("perfis")
    .select("status,decidido_por,decidido_em")
    .eq("user_id", id)
    .single();
  return data as {
    status: string;
    decidido_por: string | null;
    decidido_em: string | null;
  };
}

beforeAll(async () => {
  pessoa = await criarUsuario(servico, { email: EMAILS.pessoa });
  parecida = await criarUsuario(servico, { email: EMAILS.parecida });
  curinga = await criarUsuario(servico, { email: EMAILS.curinga });
});

afterAll(async () => {
  await apagarUsuarios(servico, Object.values(EMAILS));
});

beforeEach(async () => {
  for (const u of [pessoa, parecida, curinga]) {
    await definirStatus(servico, u.id, "pendente");
  }
});

describe("promoverAdmin", () => {
  it("torna aprovado o perfil desse e-mail, sem diferenciar maiúsculas", async () => {
    const resultado = await promoverAdmin({
      cliente: servico,
      email: "PROMOVER-Pessoa@Exemplo.TEST",
    });
    expect(resultado).toEqual({ estado: "promovido", anterior: "pendente" });
    const perfil = await statusDe(pessoa.id);
    expect(perfil.status).toBe("aprovado");
    // Ninguém decidiu pelo painel: quem promoveu foi o comando.
    expect(perfil.decidido_por).toBeNull();
    expect(perfil.decidido_em).not.toBeNull();
    // Só ele: o "_" e o "x" de e-mails parecidos não viram curinga.
    expect((await statusDe(parecida.id)).status).toBe("pendente");
    expect((await statusDe(curinga.id)).status).toBe("pendente");
  });

  it("o _ do e-mail não casa com outra letra", async () => {
    await promoverAdmin({ cliente: servico, email: EMAILS.parecida });
    expect((await statusDe(parecida.id)).status).toBe("aprovado");
    expect((await statusDe(pessoa.id)).status).toBe("pendente");
    expect((await statusDe(curinga.id)).status).toBe("pendente");
  });

  it("já aprovado: avisa e não grava de novo", async () => {
    await definirStatus(servico, pessoa.id, "aprovado");
    const antes = await statusDe(pessoa.id);
    expect(
      await promoverAdmin({ cliente: servico, email: EMAILS.pessoa }),
    ).toEqual({ estado: "ja_aprovado" });
    expect(await statusDe(pessoa.id)).toEqual(antes);
  });

  it("recusado ou revogado também vira aprovado (o comando é a decisão de quem opera)", async () => {
    await definirStatus(servico, pessoa.id, "revogado");
    expect(
      await promoverAdmin({ cliente: servico, email: EMAILS.pessoa }),
    ).toEqual({ estado: "promovido", anterior: "revogado" });
  });

  it("sem perfil: explica que a pessoa precisa entrar uma vez antes", async () => {
    await expect(
      promoverAdmin({ cliente: servico, email: "ninguem@exemplo.test" }),
    ).rejects.toThrow(ErroDoComando);
    await expect(
      promoverAdmin({ cliente: servico, email: "ninguem@exemplo.test" }),
    ).rejects.toThrow(/entrar uma vez em \/admin\/entrar/);
  });
});

describe("executarPromoverAdmin (a CLI)", () => {
  const ambiente = (): Ambiente => {
    const { url, serviceRoleKey } = supabaseLocal();
    return {
      url,
      serviceRoleKey,
      host: new URL(url).host,
      variaveis: {},
    };
  };

  it("promove e imprime o e-mail mascarado", async () => {
    const linhas: string[] = [];
    await executarPromoverAdmin([EMAILS.pessoa], {
      carregarAmbiente: async () => ambiente(),
      criarCliente: () => servico,
      escrever: (linha) => linhas.push(linha),
    });
    expect((await statusDe(pessoa.id)).status).toBe("aprovado");
    const saida = linhas.join("\n");
    expect(saida).toContain("p***@exemplo.test");
    expect(saida).toMatch(/agora é admin/);
    expect(saida).not.toContain(EMAILS.pessoa);
  });

  it("já aprovado: avisa e termina sem erro (código 0)", async () => {
    await definirStatus(servico, pessoa.id, "aprovado");
    const linhas: string[] = [];
    await executarPromoverAdmin([EMAILS.pessoa], {
      carregarAmbiente: async () => ambiente(),
      criarCliente: () => servico,
      escrever: (linha) => linhas.push(linha),
    });
    expect(linhas.join("\n")).toMatch(/já é admin/);
  });

  it("sem perfil: lança ErroDoComando (a CLI sai com código 1), sem o e-mail inteiro", async () => {
    const erro = await executarPromoverAdmin(["ninguem@exemplo.test"], {
      carregarAmbiente: async () => ambiente(),
      criarCliente: () => servico,
      escrever: () => {},
    }).catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(ErroDoComando);
    expect((erro as Error).message).not.toContain("ninguem@exemplo.test");
    expect((erro as Error).message).toContain("n***@exemplo.test");
  });
});
