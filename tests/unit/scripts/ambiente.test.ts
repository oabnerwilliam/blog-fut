import { describe, expect, it, vi, type Mock } from "vitest";
import {
  carregarAmbiente,
  type DependenciasDoAmbiente,
} from "../../../scripts/lib/ambiente";

const LOCAL = [
  "NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY=anon-local",
  "SUPABASE_SERVICE_ROLE_KEY=service-local-NAO-IMPRIMIR",
].join("\n");

const PROD = [
  "NEXT_PUBLIC_SUPABASE_URL=https://abcd1234.supabase.co",
  "SUPABASE_SERVICE_ROLE_KEY=service-prod-NAO-IMPRIMIR",
].join("\n");

class Saida extends Error {
  constructor(readonly codigo: number) {
    super(`saiu com ${codigo}`);
  }
}

type Perguntar = (pergunta: string) => Promise<string>;

function dependencias(
  extra: Partial<Omit<DependenciasDoAmbiente, "perguntar">> = {},
): DependenciasDoAmbiente & {
  linhas: string[];
  lidos: string[];
  perguntar: Mock<Perguntar>;
} {
  const linhas: string[] = [];
  const lidos: string[] = [];
  const perguntar = vi.fn<Perguntar>(async () => "s");
  return {
    raiz: "/projeto",
    lerArquivo: (caminho) => {
      lidos.push(caminho.replace(/\\/g, "/"));
      if (caminho.endsWith(".env.prod.local")) return PROD;
      if (caminho.endsWith(".env.local")) return LOCAL;
      throw new Error(`inesperado: ${caminho}`);
    },
    ehTTY: false,
    escrever: (linha) => linhas.push(linha),
    sair: (codigo) => {
      throw new Saida(codigo);
    },
    perguntar,
    linhas,
    lidos,
    ...extra,
  };
}

function semChaves(linhas: readonly string[]) {
  for (const linha of linhas) {
    expect(linha).not.toMatch(/NAO-IMPRIMIR|anon-local/);
  }
}

describe("carregarAmbiente", () => {
  it("local (padrão): lê .env.local, não pergunta e não fala em produção", async () => {
    const deps = dependencias();
    const ambiente = await carregarAmbiente({ prod: false, sim: false }, deps);
    expect(ambiente).toEqual({
      url: "http://127.0.0.1:54321",
      serviceRoleKey: "service-local-NAO-IMPRIMIR",
      host: "127.0.0.1:54321",
      variaveis: {
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-local",
        SUPABASE_SERVICE_ROLE_KEY: "service-local-NAO-IMPRIMIR",
      },
    });
    expect(deps.lidos).toEqual(["/projeto/.env.local"]);
    expect(deps.perguntar).not.toHaveBeenCalled();
    expect(deps.linhas.join("\n")).not.toMatch(/PRODUÇÃO/);
    semChaves(deps.linhas);
  });

  it("prod num terminal + 's': mostra o destino, pergunta e segue", async () => {
    const deps = dependencias({ ehTTY: true });
    deps.perguntar.mockResolvedValue(" S ");
    const ambiente = await carregarAmbiente({ prod: true, sim: false }, deps);
    expect(deps.lidos).toEqual(["/projeto/.env.prod.local"]);
    expect(deps.linhas).toContain("Destino: PRODUÇÃO (abcd1234.supabase.co)");
    expect(deps.perguntar).toHaveBeenCalledWith(
      expect.stringMatching(/\[s\/N\]/),
    );
    expect(ambiente.host).toBe("abcd1234.supabase.co");
    expect(ambiente.serviceRoleKey).toBe("service-prod-NAO-IMPRIMIR");
    semChaves(deps.linhas);
  });

  it.each(["N", "", "sim", "nao"])(
    "prod num terminal + %j: aborta com código 1",
    async (resposta) => {
      const deps = dependencias({ ehTTY: true });
      deps.perguntar.mockResolvedValue(resposta);
      await expect(
        carregarAmbiente({ prod: true, sim: false }, deps),
      ).rejects.toEqual(new Saida(1));
      expect(deps.linhas).toContain("Destino: PRODUÇÃO (abcd1234.supabase.co)");
      semChaves(deps.linhas);
    },
  );

  it("prod fora de terminal sem --sim: aborta com código 1 sem perguntar", async () => {
    const deps = dependencias({ ehTTY: false });
    await expect(
      carregarAmbiente({ prod: true, sim: false }, deps),
    ).rejects.toEqual(new Saida(1));
    expect(deps.perguntar).not.toHaveBeenCalled();
    expect(deps.linhas).toContain("Destino: PRODUÇÃO (abcd1234.supabase.co)");
    expect(deps.linhas.join("\n")).toMatch(/--sim/);
    semChaves(deps.linhas);
  });

  it("prod fora de terminal com --sim: segue sem perguntar", async () => {
    const deps = dependencias({ ehTTY: false });
    const ambiente = await carregarAmbiente({ prod: true, sim: true }, deps);
    expect(ambiente.url).toBe("https://abcd1234.supabase.co");
    expect(deps.perguntar).not.toHaveBeenCalled();
    expect(deps.linhas).toContain("Destino: PRODUÇÃO (abcd1234.supabase.co)");
    semChaves(deps.linhas);
  });

  it("prod num terminal com --sim: --sim já é a confirmação", async () => {
    const deps = dependencias({ ehTTY: true });
    await carregarAmbiente({ prod: true, sim: true }, deps);
    expect(deps.perguntar).not.toHaveBeenCalled();
  });

  it("arquivo ausente: erro que aponta a doc, sem cair em outro arquivo", async () => {
    const deps = dependencias({
      lerArquivo: (caminho) => {
        throw Object.assign(new Error(`ENOENT: ${caminho}`), {
          code: "ENOENT",
        });
      },
    });
    await expect(
      carregarAmbiente({ prod: false, sim: false }, deps),
    ).rejects.toThrow(/\.env\.local não encontrado.*supabase-local\.md/);
  });

  it("chaves faltando: lista todas pelo nome, nunca pelo valor", async () => {
    const deps = dependencias({
      lerArquivo: () => "NEXT_PUBLIC_SUPABASE_ANON_KEY=anon-local\n",
    });
    const promessa = carregarAmbiente({ prod: false, sim: false }, deps);
    await expect(promessa).rejects.toThrow(
      ".env.local sem NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY",
    );
  });
});
