import { afterEach, describe, expect, it, vi } from "vitest";
import type { ArticleRepository } from "@/lib/content";
import {
  criarIndiceDeRotas,
  rotaExiste,
  ttlDoIndice,
  TTL_DO_INDICE_MS,
} from "@/lib/rotas";
import { artigo, repositorioEmMemoria } from "./helpers/repositorio-em-memoria";

/**
 * Índice em memória do Proxy (U12; ADR 0006, extensão da história 14). O Proxy não aplica
 * "use cache", então guarda os slugs que existem e só recarrega depois do TTL. O relógio
 * é injetado: nenhum teste espera 60 s de verdade.
 */

type Metodo = keyof ArticleRepository;

/** Repositório espião: conta as chamadas e deixa trocar o conteúdo e forçar falha. */
function espiao(inicial: ArticleRepository) {
  let atual = inicial;
  let falhar = false;
  const chamadas: Record<Metodo, number> = {
    list: 0,
    getBySlug: 0,
    search: 0,
    listEditorias: 0,
    listTags: 0,
  };
  const repositorio: ArticleRepository = {
    list: async (opts) => {
      chamadas.list++;
      if (falhar) throw new Error("banco fora do ar");
      return atual.list(opts);
    },
    getBySlug: async (slug) => {
      chamadas.getBySlug++;
      return atual.getBySlug(slug);
    },
    search: async (q) => {
      chamadas.search++;
      return atual.search(q);
    },
    listEditorias: async () => {
      chamadas.listEditorias++;
      if (falhar) throw new Error("banco fora do ar");
      return atual.listEditorias();
    },
    listTags: async () => {
      chamadas.listTags++;
      if (falhar) throw new Error("banco fora do ar");
      return atual.listTags();
    },
  };
  return {
    repositorio,
    chamadas,
    /** Quantas vezes o índice foi carregado (cada carga lê as tags uma vez). */
    cargas: () => chamadas.listTags,
    trocar: (novo: ArticleRepository) => {
      atual = novo;
    },
    falhar: (sim: boolean) => {
      falhar = sim;
    },
  };
}

function relogio(inicio = 1_000_000) {
  let agora = inicio;
  return {
    agora: () => agora,
    andar: (ms: number) => {
      agora += ms;
    },
  };
}

const url = (caminho: string) => new URL(caminho, "http://localhost");

const ANTIGA = artigo("cronica-antiga", "2026-10-18", "cronica");
const NOVA = artigo("cronica-nova", "2026-11-21", "cronica");

function montar(artigos = [ANTIGA], ttlMs = TTL_DO_INDICE_MS) {
  const spy = espiao(repositorioEmMemoria(artigos));
  const tempo = relogio();
  const indice = criarIndiceDeRotas({
    repositorio: () => spy.repositorio,
    ttlMs,
    agora: tempo.agora,
  });
  return { spy, tempo, indice };
}

describe("criarIndiceDeRotas", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("TTL padrão de 60 s", () => {
    expect(TTL_DO_INDICE_MS).toBe(60_000);
  });

  it("100 requisições em 60 s geram uma única carga, sem getBySlug", async () => {
    const { spy, tempo, indice } = montar();
    for (let i = 0; i < 100; i++) {
      await rotaExiste(indice, url("/materias/cronica-antiga"));
      tempo.andar(590); // 100 × 590 ms = 59 s
    }
    expect(spy.cargas()).toBe(1);
    expect(spy.chamadas.getBySlug).toBe(0);
  });

  it("requisições simultâneas dividem uma única carga", async () => {
    const { spy, indice } = montar();
    const respostas = await Promise.all(
      Array.from({ length: 50 }, () =>
        rotaExiste(indice, url("/materias/cronica-antiga")),
      ),
    );
    expect(respostas.every(Boolean)).toBe(true);
    expect(spy.cargas()).toBe(1);
  });

  it("depois do TTL, a próxima requisição recarrega", async () => {
    const { spy, tempo, indice } = montar();
    await rotaExiste(indice, url("/"));
    await rotaExiste(indice, url("/materias/cronica-antiga"));
    tempo.andar(TTL_DO_INDICE_MS - 1);
    await rotaExiste(indice, url("/materias/cronica-antiga"));
    expect(spy.cargas()).toBe(1);
    tempo.andar(1);
    await rotaExiste(indice, url("/materias/cronica-antiga"));
    expect(spy.cargas()).toBe(2);
  });

  it("caminho fora das rotas conferidas nem carrega o índice", async () => {
    const { spy, indice } = montar();
    expect(await rotaExiste(indice, url("/"))).toBe(true);
    expect(await rotaExiste(indice, url("/busca?q=x"))).toBe(true);
    expect(spy.cargas()).toBe(0);
  });

  it("matéria nova passa de 404 para 200 depois do TTL", async () => {
    const { spy, tempo, indice } = montar();
    expect(await rotaExiste(indice, url("/materias/cronica-nova"))).toBe(false);

    spy.trocar(repositorioEmMemoria([ANTIGA, NOVA]));
    tempo.andar(30_000);
    expect(await rotaExiste(indice, url("/materias/cronica-nova"))).toBe(false);

    tempo.andar(30_000);
    expect(await rotaExiste(indice, url("/materias/cronica-nova"))).toBe(true);
  });

  it("matéria despublicada volta a dar 404 depois do TTL", async () => {
    const { spy, tempo, indice } = montar([ANTIGA, NOVA]);
    expect(await rotaExiste(indice, url("/materias/cronica-nova"))).toBe(true);
    spy.trocar(repositorioEmMemoria([ANTIGA]));
    tempo.andar(TTL_DO_INDICE_MS);
    expect(await rotaExiste(indice, url("/materias/cronica-nova"))).toBe(false);
  });

  it("recarga que falha mantém o índice antigo e só tenta de novo depois do TTL", async () => {
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    const { spy, tempo, indice } = montar();
    expect(await rotaExiste(indice, url("/materias/cronica-antiga"))).toBe(
      true,
    );

    spy.falhar(true);
    tempo.andar(TTL_DO_INDICE_MS);
    expect(await rotaExiste(indice, url("/materias/cronica-antiga"))).toBe(
      true,
    );
    expect(await rotaExiste(indice, url("/materias/nao-existe"))).toBe(false);
    expect(erro).toHaveBeenCalledTimes(1);
    const cargas = spy.cargas();

    tempo.andar(1_000);
    await rotaExiste(indice, url("/materias/cronica-antiga"));
    expect(spy.cargas()).toBe(cargas);
  });

  it("sem índice nenhum (a primeira carga falhou), a rota passa adiante e a página decide", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { spy, indice } = montar();
    spy.falhar(true);
    expect(await rotaExiste(indice, url("/materias/nao-existe"))).toBe(true);
    expect(await rotaExiste(indice, url("/editorias/inexistente"))).toBe(true);
  });

  it("o repositório é pedido a cada carga (segue o ambiente do processo)", async () => {
    const tempo = relogio();
    let pedidos = 0;
    const indice = criarIndiceDeRotas({
      repositorio: () => {
        pedidos++;
        return repositorioEmMemoria([ANTIGA]);
      },
      agora: tempo.agora,
    });
    await rotaExiste(indice, url("/materias/cronica-antiga"));
    tempo.andar(TTL_DO_INDICE_MS);
    await rotaExiste(indice, url("/materias/cronica-antiga"));
    expect(pedidos).toBe(2);
  });
});

describe("ttlDoIndice", () => {
  it("sem a variável de teste, 60 s", () => {
    expect(ttlDoIndice({})).toBe(TTL_DO_INDICE_MS);
  });

  it("TTL_DO_INDICE_MS_TESTE com um inteiro ≥ 100 vale (só para o e2e de banco)", () => {
    expect(ttlDoIndice({ TTL_DO_INDICE_MS_TESTE: "1000" })).toBe(1000);
  });

  it.each(["", "abc", "0", "-5", "50", "1.5", "1e3"])(
    "TTL_DO_INDICE_MS_TESTE=%j inválido: avisa e fica com 60 s (o Proxy nunca quebra por isso)",
    (valor) => {
      const erro = vi.spyOn(console, "error").mockImplementation(() => {});
      expect(ttlDoIndice({ TTL_DO_INDICE_MS_TESTE: valor })).toBe(
        TTL_DO_INDICE_MS,
      );
      expect(String(erro.mock.calls[0]?.[0])).toContain(
        "TTL_DO_INDICE_MS_TESTE",
      );
      erro.mockRestore();
    },
  );
});
