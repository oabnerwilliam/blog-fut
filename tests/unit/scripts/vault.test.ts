/**
 * `pnpm db:vault [--prod] [--sim] [--url <base>]` (história 14, critério 3). O banco e o
 * `carregarAmbiente` são falsos: o teste confere o que seria gravado, a trava do
 * `--prod` e que o segredo nunca aparece na saída.
 */
import { describe, expect, it, vi } from "vitest";
import type { Ambiente, OpcoesDoAmbiente } from "../../../scripts/lib/ambiente";
import {
  configurarVault,
  executarConfigurarVault,
  lerArgumentosDoVault,
  urlDoWebhook,
} from "../../../scripts/lib/vault";

const SEGREDO = "segredo-NAO-IMPRIMIR-0123456789";

class Saida extends Error {
  constructor(readonly codigo: number) {
    super(`saiu com ${codigo}`);
  }
}

function ambiente(variaveis: Record<string, string> = {}): Ambiente {
  return {
    url: "http://127.0.0.1:54321",
    serviceRoleKey: "service-NAO-IMPRIMIR",
    host: "127.0.0.1:54321",
    variaveis: { REVALIDATE_SECRET: SEGREDO, ...variaveis },
  };
}

function clienteFalso(erro: { message: string } | null = null) {
  const rpc = vi.fn(async (_nome: string, _args: Record<string, string>) => ({
    error: erro,
  }));
  return { rpc };
}

function preparar({
  variaveis = {},
  carregar,
  erro = null,
}: {
  variaveis?: Record<string, string>;
  carregar?: (opcoes: OpcoesDoAmbiente) => Promise<Ambiente>;
  erro?: { message: string } | null;
} = {}) {
  const linhas: string[] = [];
  const cliente = clienteFalso(erro);
  const criarCliente = vi.fn(() => cliente);
  const deps = {
    carregarAmbiente: vi.fn(carregar ?? (async () => ambiente(variaveis))),
    criarCliente,
    escrever: (linha: string) => linhas.push(linha),
  };
  return { deps, linhas, cliente, criarCliente };
}

function semSegredo(linhas: readonly string[]) {
  for (const linha of linhas) expect(linha).not.toMatch(/NAO-IMPRIMIR/);
}

describe("lerArgumentosDoVault", () => {
  it("sem nada: local, sem --sim, sem --url", () => {
    expect(lerArgumentosDoVault([])).toEqual({
      prod: false,
      sim: false,
      url: undefined,
    });
  });

  it("--prod --sim --url <base> e --url=<base>", () => {
    expect(
      lerArgumentosDoVault(["--prod", "--sim", "--url", "https://a.b"]),
    ).toEqual({ prod: true, sim: true, url: "https://a.b" });
    expect(lerArgumentosDoVault(["--url=http://x:3000"]).url).toBe(
      "http://x:3000",
    );
  });

  it("--url sem valor e opção desconhecida → erro", () => {
    expect(() => lerArgumentosDoVault(["--url"])).toThrow(/--url/);
    expect(() => lerArgumentosDoVault(["--dir", "x"])).toThrow(
      /Opção desconhecida/,
    );
  });
});

describe("urlDoWebhook", () => {
  it.each([
    ["https://blog.vercel.app", "https://blog.vercel.app/api/revalidar"],
    ["https://blog.vercel.app/", "https://blog.vercel.app/api/revalidar"],
    [
      "http://host.docker.internal:3102",
      "http://host.docker.internal:3102/api/revalidar",
    ],
  ])("%s → %s", (base, esperado) => {
    expect(urlDoWebhook(base)).toBe(esperado);
  });

  it.each([
    "blog.vercel.app",
    "ftp://x",
    "https://x.app/caminho",
    "https://x.app?q=1",
  ])("%s → erro (só a origem http/https)", (base) => {
    expect(() => urlDoWebhook(base)).toThrow(/origem/);
  });
});

describe("configurarVault", () => {
  it("chama a função SQL com a URL do webhook e o segredo", async () => {
    const cliente = clienteFalso();
    await configurarVault(cliente, {
      base: "http://host.docker.internal:3102",
      segredo: SEGREDO,
    });
    expect(cliente.rpc).toHaveBeenCalledWith("configurar_revalidacao", {
      p_url: "http://host.docker.internal:3102/api/revalidar",
      p_segredo: SEGREDO,
    });
  });

  it("erro do banco vira erro, sem o segredo na mensagem", async () => {
    const cliente = clienteFalso({ message: "permission denied" });
    await expect(
      configurarVault(cliente, { base: "https://a.app", segredo: SEGREDO }),
    ).rejects.toThrow(/permission denied/);
    await expect(
      configurarVault(cliente, { base: "https://a.app", segredo: SEGREDO }),
    ).rejects.not.toThrow(/NAO-IMPRIMIR/);
  });
});

describe("executarConfigurarVault", () => {
  it("local com --url: grava e relata o destino, sem o segredo", async () => {
    const { deps, linhas, cliente } = preparar();
    await executarConfigurarVault(
      ["--url", "http://host.docker.internal:3000"],
      deps,
    );
    expect(deps.carregarAmbiente).toHaveBeenCalledWith({
      prod: false,
      sim: false,
    });
    expect(cliente.rpc).toHaveBeenCalledWith("configurar_revalidacao", {
      p_url: "http://host.docker.internal:3000/api/revalidar",
      p_segredo: SEGREDO,
    });
    expect(linhas.join("\n")).toContain(
      "http://host.docker.internal:3000/api/revalidar",
    );
    semSegredo(linhas);
  });

  it("sem --url, a base é o SITE_URL do arquivo de ambiente", async () => {
    const { deps, cliente } = preparar({
      variaveis: { SITE_URL: "https://zona-mista.vercel.app" },
    });
    await executarConfigurarVault(["--prod", "--sim"], deps);
    expect(deps.carregarAmbiente).toHaveBeenCalledWith({
      prod: true,
      sim: true,
    });
    expect(cliente.rpc.mock.calls[0]?.[1].p_url).toBe(
      "https://zona-mista.vercel.app/api/revalidar",
    );
  });

  it("--prod sem --sim fora de terminal: o carregarAmbiente aborta e nada é gravado", async () => {
    const { deps, criarCliente } = preparar({
      carregar: async ({ prod, sim }) => {
        if (prod && !sim) throw new Saida(1);
        return ambiente();
      },
    });
    await expect(executarConfigurarVault(["--prod"], deps)).rejects.toEqual(
      new Saida(1),
    );
    expect(criarCliente).not.toHaveBeenCalled();
  });

  it("sem SITE_URL e sem --url: erro que explica o --url", async () => {
    const { deps, criarCliente } = preparar();
    await expect(executarConfigurarVault([], deps)).rejects.toThrow(
      /SITE_URL.*--url/,
    );
    expect(criarCliente).not.toHaveBeenCalled();
  });

  it("sem REVALIDATE_SECRET no arquivo: erro, sem gravar", async () => {
    const { deps, criarCliente } = preparar({
      carregar: async () => ({ ...ambiente(), variaveis: {} }),
    });
    await expect(
      executarConfigurarVault(["--url", "https://a.app"], deps),
    ).rejects.toThrow(/REVALIDATE_SECRET/);
    expect(criarCliente).not.toHaveBeenCalled();
  });
});
