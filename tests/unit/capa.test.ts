import { describe, expect, it } from "vitest";
import type {
  ArticleRepository,
  ArticleSummary,
  ListOptions,
  Taxonomy,
} from "@/lib/content";
import { escolherDestaque, montarCapa } from "@/lib/capa";
import { EDITORIAS, rotuloDaEditoria, type Editoria } from "@/lib/editorias";

function materia(
  slug: string,
  publicado_em: string,
  editoria: Editoria,
  ficticio = true,
): ArticleSummary {
  return {
    slug,
    titulo: `Título de ${slug}`,
    linha_fina: `Linha fina de ${slug}`,
    editoria: { slug: editoria, rotulo: rotuloDaEditoria(editoria) },
    tags: [],
    publicado_em,
    autor: "squad-fut",
    ficticio,
    fonte: ficticio ? "importacao" : "squad",
    tempo_de_leitura: 5,
  };
}

/**
 * Repositório falso em memória. Recebe as matérias JÁ em ordem (como o catálogo real
 * entrega) e registra as chamadas de `list()` para o teste conferir o que a capa pediu.
 */
function repositorioFalso(materias: ArticleSummary[]) {
  const chamadas: ListOptions[] = [];
  const repositorio: ArticleRepository = {
    async list(opts = {}) {
      chamadas.push(opts);
      const tamanho = opts.pageSize ?? 12;
      const pagina = opts.page ?? 1;
      const filtradas = materias.filter(
        (m) => opts.editoria === undefined || m.editoria.slug === opts.editoria,
      );
      return {
        itens: filtradas.slice((pagina - 1) * tamanho, pagina * tamanho),
        pagina,
        totalPaginas: Math.ceil(filtradas.length / tamanho),
        total: filtradas.length,
      };
    },
    async getBySlug() {
      throw new Error("a capa não deve chamar getBySlug");
    },
    async search() {
      throw new Error("a capa não deve chamar search");
    },
    async listEditorias(): Promise<Taxonomy[]> {
      return EDITORIAS.map((e) => ({
        slug: e.slug,
        rotulo: e.rotulo,
        total: materias.filter((m) => m.editoria.slug === e.slug).length,
      }));
    },
    async listTags() {
      throw new Error("a capa não deve chamar listTags");
    },
  };
  return { repositorio, chamadas };
}

describe("escolherDestaque", () => {
  it("só com fictícias, devolve a fictícia mais recente (a primeira da lista)", () => {
    const itens = [
      materia("c", "2026-10-28", "analise"),
      materia("b", "2026-10-25", "cronica"),
      materia("a", "2026-10-18", "cronica"),
    ];
    expect(escolherDestaque(itens)?.slug).toBe("c");
  });

  it("uma real mais antiga que as fictícias vence", () => {
    const itens = [
      materia("ficticia-nova", "2026-10-28", "analise"),
      materia("real-nova", "2026-10-20", "noticia", false),
      materia("ficticia-velha", "2026-10-18", "cronica"),
      materia("real-velha", "2026-10-01", "coluna", false),
    ];
    expect(escolherDestaque(itens)?.slug).toBe("real-nova");
  });

  it("lista vazia devolve null", () => {
    expect(escolherDestaque([])).toBeNull();
  });

  it("limite documentado: só olha a lista que recebe (a primeira página), sem buscar outras", () => {
    // Se a real estiver fora da primeira página, ela não é vista; pela spec, as fictícias
    // têm datas antes de 2026-11-01, então uma real nova sempre fica no topo.
    const primeiraPagina = Array.from({ length: 12 }, (_, i) =>
      materia(
        `ficticia-${i}`,
        `2026-10-${String(28 - i).padStart(2, "0")}`,
        "analise",
      ),
    );
    expect(escolherDestaque(primeiraPagina)?.slug).toBe("ficticia-0");
  });
});

describe("montarCapa", () => {
  const MATERIAS = [
    materia("analise-1", "2026-10-28", "analise"),
    materia("cronica-1", "2026-10-25", "cronica"),
    materia("noticia-real", "2026-10-22", "noticia", false),
    materia("cronica-2", "2026-10-18", "cronica"),
    materia("perfil-1", "2026-10-14", "perfil"),
    materia("cronica-3", "2026-10-12", "cronica"),
    materia("cronica-4", "2026-10-10", "cronica"),
    materia("perfil-2", "2026-10-08", "perfil"),
  ];

  it("destaque é a real; Últimas são a primeira página menos o destaque, na ordem", async () => {
    const { repositorio } = repositorioFalso(MATERIAS);
    const capa = await montarCapa(repositorio);
    expect(capa.destaque?.slug).toBe("noticia-real");
    expect(capa.ultimas.map((m) => m.slug)).toEqual([
      "analise-1",
      "cronica-1",
      "cronica-2",
      "perfil-1",
      "cronica-3",
      "cronica-4",
      "perfil-2",
    ]);
  });

  it("Últimas usam só a primeira página de list()", async () => {
    const muitas = Array.from({ length: 15 }, (_, i) =>
      materia(
        `m-${String(i).padStart(2, "0")}`,
        `2026-10-${String(28 - i).padStart(2, "0")}`,
        "analise",
      ),
    );
    const { repositorio } = repositorioFalso(muitas);
    const capa = await montarCapa(repositorio);
    expect(capa.destaque?.slug).toBe("m-00");
    expect(capa.ultimas).toHaveLength(11);
    expect(capa.ultimas.at(-1)?.slug).toBe("m-11");
  });

  it("editorias: só as que têm matéria, na ordem de listEditorias()", async () => {
    const { repositorio } = repositorioFalso(MATERIAS);
    const capa = await montarCapa(repositorio);
    expect(capa.editorias.map((e) => [e.slug, e.total])).toEqual([
      ["analise", 1],
      ["cronica", 4],
      ["noticia", 1],
      ["perfil", 2],
    ]);
  });

  it("faixas: uma por editoria com 2+ matérias, com as 3 mais recentes, pedidas a list({ editoria, pageSize: 3 })", async () => {
    const { repositorio, chamadas } = repositorioFalso(MATERIAS);
    const capa = await montarCapa(repositorio);
    expect(
      capa.faixas.map((f) => [f.editoria.slug, f.itens.map((m) => m.slug)]),
    ).toEqual([
      ["cronica", ["cronica-1", "cronica-2", "cronica-3"]],
      ["perfil", ["perfil-1", "perfil-2"]],
    ]);
    expect(chamadas).toContainEqual({ editoria: "cronica", pageSize: 3 });
    expect(chamadas).toContainEqual({ editoria: "perfil", pageSize: 3 });
    expect(chamadas.filter((c) => c.editoria !== undefined)).toHaveLength(2);
  });

  it("uma matéria pode estar no destaque, nas Últimas e numa faixa ao mesmo tempo", async () => {
    const { repositorio } = repositorioFalso([
      materia("cronica-a", "2026-10-25", "cronica"),
      materia("cronica-b", "2026-10-18", "cronica"),
    ]);
    const capa = await montarCapa(repositorio);
    expect(capa.destaque?.slug).toBe("cronica-a");
    expect(capa.ultimas.map((m) => m.slug)).toEqual(["cronica-b"]);
    expect(capa.faixas[0].itens.map((m) => m.slug)).toEqual([
      "cronica-a",
      "cronica-b",
    ]);
  });

  it("sem matérias: destaque null e listas vazias", async () => {
    const { repositorio } = repositorioFalso([]);
    expect(await montarCapa(repositorio)).toEqual({
      destaque: null,
      ultimas: [],
      editorias: [],
      faixas: [],
    });
  });
});
