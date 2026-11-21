/**
 * `pnpm materia:enviar` e `pnpm materia:publicar` (história 15) sem banco: argumentos,
 * leitura da caixa de entrada (numa pasta temporária, nunca a content/entrada real), o
 * que vai para a RPC e a trava do `--prod` (critério 8). O banco de verdade está em
 * tests/db/materia-enviar.test.ts.
 */
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  carregarAmbiente,
  type DependenciasDoAmbiente,
} from "../../../scripts/lib/ambiente";
import {
  MENSAGEM_SLUG_EXISTENTE,
  dadosDoEnvio,
  enviarMateria,
  executarEnviarMateria,
  executarPublicarMateria,
  lerArgumentosDaMateria,
  lerMateriaDaEntrada,
  type DependenciasDoComando,
} from "../../../scripts/lib/materias";

const MATERIA = [
  "---",
  "slug: gol-de-teste",
  "titulo: Gol de teste",
  "linha_fina: Uma linha fina",
  "editoria: noticia",
  "tags: [fc-aurora, copa-do-litoral]",
  "publicado_em: 2026-11-21",
  "autor: Squad Fut",
  "ficticio: true",
  "---",
  "Corpo com acento: São Paulo.  ",
  "",
  "Segundo parágrafo.",
  "",
].join("\r\n");

let entrada = "";

beforeEach(() => {
  entrada = mkdtempSync(path.join(tmpdir(), "blog-fut-entrada-"));
});

afterEach(() => {
  rmSync(entrada, { recursive: true, force: true });
});

class Saida extends Error {
  constructor(readonly codigo: number) {
    super(`saiu com ${codigo}`);
  }
}

describe("lerArgumentosDaMateria", () => {
  it("slug, --prod e --sim em qualquer ordem", () => {
    expect(lerArgumentosDaMateria(["gol-de-teste"], "enviar")).toEqual({
      slug: "gol-de-teste",
      prod: false,
      sim: false,
    });
    expect(
      lerArgumentosDaMateria(["--prod", "gol-de-teste", "--sim"], "enviar"),
    ).toEqual({ slug: "gol-de-teste", prod: true, sim: true });
  });

  it("sem slug, com dois slugs ou com opção desconhecida → erro com o uso", () => {
    expect(() => lerArgumentosDaMateria([], "enviar")).toThrow(
      /Uso: pnpm materia:enviar <slug> \[--prod\] \[--sim\]/,
    );
    expect(() => lerArgumentosDaMateria(["a", "b"], "publicar")).toThrow(
      /Uso: pnpm materia:publicar/,
    );
    expect(() => lerArgumentosDaMateria(["a", "--dir"], "enviar")).toThrow(
      /Opção desconhecida: --dir/,
    );
  });

  it("slug fora do kebab-case (ou com caminho) → erro, antes de abrir arquivo", () => {
    for (const slug of ["../segredo", "Gol", "gol.md", "a/b"]) {
      expect(() => lerArgumentosDaMateria([slug], "enviar")).toThrow(
        /Slug inválido/,
      );
    }
  });
});

describe("lerMateriaDaEntrada", () => {
  it("usa o parser da v1 com os finais de linha em LF e o corpo literal", () => {
    writeFileSync(path.join(entrada, "gol-de-teste.md"), MATERIA);
    const artigo = lerMateriaDaEntrada(entrada, "gol-de-teste");
    expect(artigo.slug).toBe("gol-de-teste");
    expect(artigo.corpo_md).toBe(
      "Corpo com acento: São Paulo.  \n\nSegundo parágrafo.\n",
    );
    // rótulo humanizado, como no site
    expect(artigo.tags.map((t) => t.rotulo)).toEqual([
      "Fc Aurora",
      "Copa do Litoral",
    ]);
  });

  it("arquivo ausente → erro que cita o caminho", () => {
    expect(() => lerMateriaDaEntrada(entrada, "nao-existe")).toThrow(
      /nao-existe\.md/,
    );
  });

  it("frontmatter inválido → erro que cita o arquivo e o campo", () => {
    writeFileSync(
      path.join(entrada, "gol-de-teste.md"),
      MATERIA.replace("editoria: noticia", "editoria: fofoca"),
    );
    expect(() => lerMateriaDaEntrada(entrada, "gol-de-teste")).toThrow(
      /gol-de-teste\.md: campo "editoria"/,
    );
  });

  it("matéria real sem origem → erro claro", () => {
    writeFileSync(
      path.join(entrada, "gol-de-teste.md"),
      MATERIA.replace("ficticio: true", "ficticio: false"),
    );
    expect(() => lerMateriaDaEntrada(entrada, "gol-de-teste")).toThrow(
      /campo "origem": obrigatória/,
    );
  });
});

describe("dadosDoEnvio", () => {
  it("leva os campos editoriais, a origem e os rótulos das tags", () => {
    writeFileSync(path.join(entrada, "gol-de-teste.md"), MATERIA);
    const dados = dadosDoEnvio(lerMateriaDaEntrada(entrada, "gol-de-teste"));
    expect(dados).toEqual({
      slug: "gol-de-teste",
      titulo: "Gol de teste",
      titulo_seo: null,
      linha_fina: "Uma linha fina",
      editoria: "noticia",
      tags: ["fc-aurora", "copa-do-litoral"],
      meta_description: null,
      palavras_chave: [],
      publicado_em: "2026-11-21",
      autor: "Squad Fut",
      ficticio: true,
      origem: null,
      corpo_md: "Corpo com acento: São Paulo.  \n\nSegundo parágrafo.\n",
      rotulos: {
        "fc-aurora": "Fc Aurora",
        "copa-do-litoral": "Copa do Litoral",
      },
    });
  });
});

function clienteFalso(
  resposta: { data: unknown; error: unknown } = { data: "id-1", error: null },
) {
  const rpc = vi.fn(async () => resposta);
  return { rpc } as unknown as SupabaseClient & { rpc: typeof rpc };
}

describe("enviarMateria", () => {
  it("move o arquivo para enviadas/ só depois de o banco confirmar", async () => {
    writeFileSync(path.join(entrada, "gol-de-teste.md"), MATERIA);
    const cliente = clienteFalso();
    const resultado = await enviarMateria({
      cliente,
      entrada,
      slug: "gol-de-teste",
    });
    expect(cliente.rpc).toHaveBeenCalledWith("enviar_materia_do_squad", {
      dados: expect.objectContaining({ slug: "gol-de-teste" }),
    });
    expect(resultado).toMatchObject({
      id: "id-1",
      slug: "gol-de-teste",
      titulo: "Gol de teste",
      status: "rascunho",
    });
    expect(existsSync(path.join(entrada, "gol-de-teste.md"))).toBe(false);
    expect(
      readFileSync(path.join(entrada, "enviadas", "gol-de-teste.md"), "utf8"),
    ).toBe(MATERIA);
  });

  it("slug existente → a mensagem exata, e o arquivo fica onde estava", async () => {
    writeFileSync(path.join(entrada, "gol-de-teste.md"), MATERIA);
    const cliente = clienteFalso({
      data: null,
      error: {
        code: "P0001",
        message: "Já existe uma matéria com o slug gol-de-teste.",
        hint: "materia_ja_existe",
      },
    });
    await expect(
      enviarMateria({ cliente, entrada, slug: "gol-de-teste" }),
    ).rejects.toThrow(
      "Já existe uma matéria com o slug gol-de-teste. Edite pelo painel.",
    );
    expect(MENSAGEM_SLUG_EXISTENTE("x")).toBe(
      "Já existe uma matéria com o slug x. Edite pelo painel.",
    );
    expect(existsSync(path.join(entrada, "gol-de-teste.md"))).toBe(true);
    expect(existsSync(path.join(entrada, "enviadas"))).toBe(false);
  });

  it("frontmatter inválido: nem chama o banco", async () => {
    writeFileSync(path.join(entrada, "gol-de-teste.md"), "sem frontmatter\n");
    const cliente = clienteFalso();
    await expect(
      enviarMateria({ cliente, entrada, slug: "gol-de-teste" }),
    ).rejects.toThrow(/gol-de-teste\.md/);
    expect(cliente.rpc).not.toHaveBeenCalled();
  });
});

const LOCAL = [
  'NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321"',
  'SUPABASE_SERVICE_ROLE_KEY="service-local-NAO-IMPRIMIR"',
].join("\n");
const PROD = [
  "NEXT_PUBLIC_SUPABASE_URL=https://abcd1234.supabase.co",
  "SUPABASE_SERVICE_ROLE_KEY=service-prod-NAO-IMPRIMIR",
].join("\n");

/** O carregarAmbiente de verdade, com arquivos e terminal falsos (fora de TTY). */
function preparar(cliente: SupabaseClient = clienteFalso()) {
  const linhas: string[] = [];
  const lidos: string[] = [];
  const dependenciasDoAmbiente: DependenciasDoAmbiente = {
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
    perguntar: async () => {
      throw new Error("não deveria perguntar");
    },
  };
  const criarCliente = vi.fn(() => cliente);
  const deps: DependenciasDoComando = {
    carregarAmbiente: (opcoes) =>
      carregarAmbiente(opcoes, dependenciasDoAmbiente),
    criarCliente,
    escrever: (linha) => linhas.push(linha),
    entrada,
  };
  return { deps, linhas, lidos, criarCliente };
}

describe("trava de produção (critério 8)", () => {
  it("materia:enviar sem --prod: destino local (.env.local)", async () => {
    writeFileSync(path.join(entrada, "gol-de-teste.md"), MATERIA);
    const { deps, linhas, lidos, criarCliente } = preparar();
    await executarEnviarMateria(["gol-de-teste"], deps);
    expect(lidos).toEqual(["/projeto/.env.local"]);
    expect(criarCliente).toHaveBeenCalledWith(
      expect.objectContaining({ host: "127.0.0.1:54321" }),
    );
    expect(linhas).toContain("Destino: local (127.0.0.1:54321)");
    expect(linhas.join("\n")).not.toMatch(/PRODUÇÃO|NAO-IMPRIMIR/);
    expect(linhas.join("\n")).toMatch(/gol-de-teste/);
    expect(linhas.join("\n")).toMatch(/Gol de teste/);
    expect(linhas.join("\n")).toMatch(/rascunho/);
  });

  it.each([
    { comando: "materia:enviar", executar: executarEnviarMateria },
    { comando: "materia:publicar", executar: executarPublicarMateria },
  ])(
    "$comando --prod fora de TTY e sem --sim: aborta antes de tocar o banco",
    async ({ executar }) => {
      writeFileSync(path.join(entrada, "gol-de-teste.md"), MATERIA);
      const { deps, linhas, lidos, criarCliente } = preparar();
      await expect(executar(["gol-de-teste", "--prod"], deps)).rejects.toEqual(
        new Saida(1),
      );
      expect(lidos).toEqual(["/projeto/.env.prod.local"]);
      expect(criarCliente).not.toHaveBeenCalled();
      expect(linhas).toContain("Destino: PRODUÇÃO (abcd1234.supabase.co)");
      expect(existsSync(path.join(entrada, "gol-de-teste.md"))).toBe(true);
      expect(linhas.join("\n")).not.toMatch(/NAO-IMPRIMIR/);
    },
  );

  it("materia:enviar --prod --sim: segue para a produção sem perguntar", async () => {
    writeFileSync(path.join(entrada, "gol-de-teste.md"), MATERIA);
    const { deps, linhas, criarCliente } = preparar();
    await executarEnviarMateria(["gol-de-teste", "--prod", "--sim"], deps);
    expect(criarCliente).toHaveBeenCalledWith(
      expect.objectContaining({ host: "abcd1234.supabase.co" }),
    );
    expect(linhas).toContain("Destino: PRODUÇÃO (abcd1234.supabase.co)");
    expect(linhas.filter((l) => l.startsWith("Destino:"))).toHaveLength(1);
  });
});
