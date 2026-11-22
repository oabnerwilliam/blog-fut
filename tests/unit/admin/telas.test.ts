/**
 * Regras puras das telas do painel (`src/lib/admin/telas.ts`, história 17, critério 4) e
 * o diff com contexto (`comContexto`).
 */
import { describe, expect, it } from "vitest";
import { comContexto, diffDeLinhas } from "@/lib/admin/diff";
import { formatarDiaDoAdmin } from "@/lib/admin/formatos";
import {
  camposAlterados,
  camposDoFormulario,
  conferirTagNova,
  descreverFiltros,
  escolherVisao,
  filtrarMaterias,
  frase,
  lerFiltros,
  marcadoresDaRevisao,
  resumirLista,
  sugerirSlug,
  temAlgoParaPublicar,
  valorDoCampo,
} from "@/lib/admin/telas";
import type {
  CamposDaRevisao,
  MateriaDoPainel,
  ResumoDaMateria,
  RevisaoResumida,
} from "@/lib/admin/tipos";

const CAMPOS: CamposDaRevisao = {
  titulo: "Título",
  titulo_seo: null,
  linha_fina: "Linha",
  editoria: "analise",
  tags: ["psg", "ligue-1"],
  meta_description: null,
  palavras_chave: [],
  autor: "Squad Fut",
  ficticio: false,
  corpo_md: "a\n",
};

function resumo(extra: Partial<ResumoDaMateria> = {}): ResumoDaMateria {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    slug: "psg",
    status: "publicado",
    fonte: "squad",
    origem: "squad-fut/x",
    publicadoEm: "2026-11-19",
    revisaoPublicada: 3,
    revisaoEmEdicao: 5,
    ...extra,
  };
}

function revisoes(...numeros: number[]): RevisaoResumida[] {
  return numeros
    .sort((a, b) => b - a)
    .map((numero) => ({
      numero,
      origem: numero === 1 ? "squad" : "painel",
      autor: "Marina",
      criadaEm: "2026-11-21T12:00:00Z",
      titulo: `T${numero}`,
      editoria: "analise",
    }));
}

describe("formulário", () => {
  function formulario(valores: Record<string, string>) {
    const f = new FormData();
    for (const [k, v] of Object.entries(valores)) f.set(k, v);
    return f;
  }

  it("opcional vazio vira null; palavras-chave, uma por linha; o checkbox vira booleano", () => {
    expect(
      camposDoFormulario(
        formulario({
          titulo: "  Título com espaço  ",
          titulo_seo: "   ",
          linha_fina: "Linha",
          editoria: "noticia",
          meta_description: "",
          palavras_chave: "psg\r\n\r\n  ligue 1  \n",
          autor: "Squad Fut",
          ficticio: "on",
          corpo_md: "a\r\nb",
        }),
        ["psg"],
      ),
    ).toEqual({
      titulo: "  Título com espaço  ",
      titulo_seo: null,
      linha_fina: "Linha",
      editoria: "noticia",
      tags: ["psg"],
      meta_description: null,
      palavras_chave: ["psg", "ligue 1"],
      autor: "Squad Fut",
      ficticio: true,
      corpo_md: "a\r\nb",
    });
  });

  it("checkbox desmarcado (ausente) é false", () => {
    expect(camposDoFormulario(formulario({}), []).ficticio).toBe(false);
  });

  it("sugerirSlug tira acento, espaço e pontuação", () => {
    expect(sugerirSlug("Luis Enrique 2")).toBe("luis-enrique-2");
    expect(sugerirSlug("  São Paulo F.C.  ")).toBe("sao-paulo-f-c");
    expect(sugerirSlug("!!!")).toBe("");
  });

  it("conferirTagNova: slug válido entra; inválido explica; repetida e vazia são ignoradas", () => {
    expect(conferirTagNova("paris-fc", ["psg"])).toEqual({
      ok: true,
      slug: "paris-fc",
    });
    expect(conferirTagNova(" psg ", ["psg"])).toBeNull();
    expect(conferirTagNova("  ", [])).toBeNull();
    expect(conferirTagNova("Luis Enrique 2", [])).toEqual({
      ok: false,
      mensagem:
        "“Luis Enrique 2” não é um slug. Use letras minúsculas, números e hífen: luis-enrique-2.",
    });
  });

  it("frase: maiúscula e ponto final", () => {
    expect(frase("não pode ficar vazio")).toBe("Não pode ficar vazio.");
    expect(frase("Já tem ponto.")).toBe("Já tem ponto.");
  });
});

describe("lista", () => {
  const materia = (extra: Partial<MateriaDoPainel>): MateriaDoPainel => ({
    id: "x",
    slug: "x",
    titulo: "x",
    tituloPublicado: "x",
    editoria: "analise",
    status: "publicado",
    fonte: "importacao",
    ficticio: true,
    publicadoEm: "2026-10-01",
    atualizadoEm: "2026-11-01T00:00:00Z",
    revisaoPublicada: 1,
    revisaoEmEdicao: 1,
    alteracoesNaoPublicadas: false,
    ...extra,
  });

  it("lerFiltros ignora valores desconhecidos, vazios e repetidos além do primeiro", () => {
    expect(lerFiltros({})).toEqual({});
    expect(
      lerFiltros({ status: "rascunho", editoria: "perfil", fonte: "painel" }),
    ).toEqual({ status: "rascunho", editoria: "perfil", fonte: "painel" });
    expect(
      lerFiltros({ status: "", editoria: "opiniao", fonte: ["squad", "x"] }),
    ).toEqual({ fonte: "squad" });
  });

  it("filtra, resume e descreve os filtros", () => {
    const lista = [
      materia({ slug: "a" }),
      materia({ slug: "b", status: "rascunho", editoria: "perfil" }),
      materia({ slug: "c", fonte: "squad", alteracoesNaoPublicadas: true }),
    ];
    expect(
      filtrarMaterias(lista, { status: "rascunho" }).map((m) => m.slug),
    ).toEqual(["b"]);
    expect(filtrarMaterias(lista, { fonte: "squad" })).toHaveLength(1);
    expect(resumirLista(lista)).toEqual({
      total: 3,
      publicadas: 2,
      rascunhos: 1,
      comAlteracoes: 1,
    });
    expect(
      descreverFiltros({
        status: "rascunho",
        editoria: "perfil",
        fonte: "painel",
      }),
    ).toBe("rascunho · Perfil · painel");
  });

  it("formatarDiaDoAdmin não erra o dia pelo fuso", () => {
    expect(formatarDiaDoAdmin("2026-11-19")).toBe("19.11.2026");
    expect(() => formatarDiaDoAdmin("19/11/2026")).toThrow();
  });
});

describe("estado da publicação", () => {
  it("temAlgoParaPublicar: revisão nova, rascunho; nada quando em dia", () => {
    expect(temAlgoParaPublicar(resumo())).toBe(true);
    expect(temAlgoParaPublicar(resumo({ revisaoEmEdicao: 3 }))).toBe(false);
    expect(
      temAlgoParaPublicar(resumo({ revisaoEmEdicao: 3, status: "rascunho" })),
    ).toBe(true);
  });

  it("marcadores: publicada, em edição e texto do squad", () => {
    const m = resumo();
    expect(marcadoresDaRevisao({ numero: 5, origem: "painel" }, m)).toEqual([
      "em-edicao",
    ]);
    expect(marcadoresDaRevisao({ numero: 3, origem: "painel" }, m)).toEqual([
      "publicada",
    ]);
    expect(marcadoresDaRevisao({ numero: 1, origem: "squad" }, m)).toEqual([
      "texto-do-squad",
    ]);
    expect(marcadoresDaRevisao({ numero: 1, origem: "importacao" }, m)).toEqual(
      [],
    );
    // Em dia: a em edição é a do site, e só leva o contínuo.
    expect(
      marcadoresDaRevisao(
        { numero: 3, origem: "painel" },
        resumo({ revisaoEmEdicao: 3 }),
      ),
    ).toEqual(["publicada"]);
    // Despublicada: nenhuma revisão está no site.
    expect(
      marcadoresDaRevisao(
        { numero: 3, origem: "painel" },
        resumo({ revisaoEmEdicao: 3, status: "rascunho" }),
      ),
    ).toEqual(["em-edicao"]);
  });
});

describe("escolherVisao", () => {
  const historico = { ...resumo(), revisoes: revisoes(1, 2, 3, 4, 5) };

  it("?ver=N abre a revisão; ?de&para compara", () => {
    expect(escolherVisao(historico, { ver: "2" })).toEqual({
      tipo: "revisao",
      numero: 2,
    });
    expect(escolherVisao(historico, { de: "1", para: "4" })).toEqual({
      tipo: "comparar",
      de: 1,
      para: 4,
    });
  });

  it("sem nada, ou com número que não existe: a do site com a em edição", () => {
    for (const busca of [{}, { ver: "9" }, { de: "1", para: "x" }]) {
      expect(escolherVisao(historico, busca)).toEqual({
        tipo: "comparar",
        de: 3,
        para: 5,
      });
    }
  });

  it("em dia: a anterior com a em edição; com uma revisão só, abre ela", () => {
    expect(
      escolherVisao(
        { ...resumo({ revisaoEmEdicao: 3 }), revisoes: revisoes(1, 2, 3) },
        {},
      ),
    ).toEqual({ tipo: "comparar", de: 2, para: 3 });
    expect(
      escolherVisao(
        {
          ...resumo({ revisaoEmEdicao: 1, revisaoPublicada: 1 }),
          revisoes: revisoes(1),
        },
        {},
      ),
    ).toEqual({ tipo: "revisao", numero: 1 });
  });
});

describe("campos", () => {
  it("camposAlterados lista só o que mudou, com o valor da tela", () => {
    expect(
      camposAlterados(CAMPOS, {
        ...CAMPOS,
        titulo: "Novo",
        tags: ["psg"],
        ficticio: true,
        corpo_md: "outro",
      }),
    ).toEqual([
      { campo: "titulo", rotulo: "Título", antes: "Título", depois: "Novo" },
      { campo: "tags", rotulo: "Tags", antes: "psg · ligue-1", depois: "psg" },
      {
        campo: "ficticio",
        rotulo: "Conteúdo fictício",
        antes: "Não",
        depois: "Sim",
      },
    ]);
  });

  it("valorDoCampo: editoria pelo rótulo e vazio explícito", () => {
    expect(valorDoCampo("editoria", CAMPOS)).toBe("Análise");
    expect(valorDoCampo("titulo_seo", CAMPOS)).toBe("(vazio)");
    expect(valorDoCampo("palavras_chave", CAMPOS)).toBe("(vazio)");
  });
});

describe("comContexto", () => {
  const corpo = (n: number) =>
    Array.from({ length: n }, (_, i) => `linha ${i + 1}`).join("\n");

  it("deixa 2 linhas de contexto e esconde o resto, com a numeração da versão nova", () => {
    const antes = corpo(20);
    const depois = antes.replace("linha 10", "linha DEZ");
    const itens = comContexto(diffDeLinhas(antes, depois));
    expect(itens[0]).toEqual({
      tipo: "pulo",
      quantidade: 7,
      de: 1,
      ate: 7,
      ateOFim: false,
    });
    expect(
      itens.slice(1, 7).map((i) => (i.tipo === "pulo" ? "⋯" : i.texto)),
    ).toEqual([
      "linha 8",
      "linha 9",
      "linha 10",
      "linha DEZ",
      "linha 11",
      "linha 12",
    ]);
    expect(itens[7]).toEqual({
      tipo: "pulo",
      quantidade: 8,
      de: 13,
      ate: 20,
      ateOFim: true,
    });
  });

  it("não esconde uma linha só, e sem mudança devolve tudo", () => {
    const antes = corpo(6);
    const depois = antes.replace("linha 4", "QUATRO");
    const itens = comContexto(diffDeLinhas(antes, depois));
    // linha 1 seria o único escondido: fica visível.
    expect(itens.every((i) => i.tipo !== "pulo")).toBe(true);
    expect(comContexto(diffDeLinhas(antes, antes))).toHaveLength(6);
  });
});
