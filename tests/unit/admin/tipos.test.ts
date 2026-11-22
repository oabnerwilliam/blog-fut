/**
 * `src/lib/admin/tipos.ts` (história 17, critério 2): os campos editoriais do painel
 * vêm do zod da v1, sem slug, fonte, origem e publicado_em.
 */
import { describe, expect, it } from "vitest";
import {
  camposEditoriaisSchema,
  FONTES,
  filtrosDoPainelSchema,
  NOMES_DOS_CAMPOS,
  paraCamposDaRevisao,
  TAMANHO_MAXIMO_DO_CORPO,
} from "@/lib/admin/tipos";

const VALIDOS = {
  titulo: "PSG vence e respira",
  titulo_seo: null,
  linha_fina: "Linha fina",
  editoria: "noticia",
  tags: ["psg", "ligue-1"],
  meta_description: "Resumo",
  palavras_chave: ["psg"],
  autor: "Squad Fut",
  ficticio: false,
  corpo_md: "Primeiro parágrafo.\n\nSegundo.\n",
};

describe("camposEditoriaisSchema", () => {
  it("os campos são os editoriais, na ordem do formulário", () => {
    expect(NOMES_DOS_CAMPOS).toEqual([
      "titulo",
      "titulo_seo",
      "linha_fina",
      "editoria",
      "tags",
      "meta_description",
      "palavras_chave",
      "autor",
      "ficticio",
      "corpo_md",
    ]);
  });

  it.each(["slug", "fonte", "origem", "publicado_em", "status", "autor_id"])(
    "%s é recusado (campo desconhecido, não ignorado)",
    (campo) => {
      const resultado = camposEditoriaisSchema.safeParse({
        ...VALIDOS,
        [campo]: "x",
      });
      expect(resultado.success).toBe(false);
    },
  );

  it("aceita os campos válidos sem mexer no texto", () => {
    const resultado = camposEditoriaisSchema.parse(VALIDOS);
    expect(resultado).toEqual(VALIDOS);
  });

  it("as regras são as do frontmatter da v1", () => {
    for (const [nome, extra] of [
      ["título vazio", { titulo: "   " }],
      ["editoria fora da lista", { editoria: "opiniao" }],
      ["tag fora do kebab-case", { tags: ["São Paulo"] }],
      ["sem tags", { tags: [] }],
      ["tag repetida", { tags: ["psg", "psg"] }],
      ["ficticio como texto", { ficticio: "false" }],
      ["titulo_seo vazio", { titulo_seo: "" }],
    ] as const) {
      expect(
        camposEditoriaisSchema.safeParse({ ...VALIDOS, ...extra }).success,
        nome,
      ).toBe(false);
    }
  });

  it("o corpo não pode ficar vazio nem passar do teto", () => {
    expect(
      camposEditoriaisSchema.safeParse({ ...VALIDOS, corpo_md: " \n " })
        .success,
    ).toBe(false);
    expect(
      camposEditoriaisSchema.safeParse({
        ...VALIDOS,
        corpo_md: "x".repeat(TAMANHO_MAXIMO_DO_CORPO + 1),
      }).success,
    ).toBe(false);
  });

  it("o CRLF do textarea vira LF; o resto do corpo fica literal", () => {
    const resultado = camposEditoriaisSchema.parse({
      ...VALIDOS,
      corpo_md: "Linha  com espaço \r\n\r\n**negrito**\r",
    });
    expect(resultado.corpo_md).toBe("Linha  com espaço \n\n**negrito**\n");
  });
});

describe("paraCamposDaRevisao", () => {
  it("opcionais ausentes viram null e lista vazia", () => {
    const campos = camposEditoriaisSchema.parse({
      titulo: "T",
      linha_fina: "L",
      editoria: "cronica",
      tags: ["a"],
      autor: "A",
      ficticio: true,
      corpo_md: "c",
    });
    expect(paraCamposDaRevisao(campos)).toEqual({
      titulo: "T",
      titulo_seo: null,
      linha_fina: "L",
      editoria: "cronica",
      tags: ["a"],
      meta_description: null,
      palavras_chave: [],
      autor: "A",
      ficticio: true,
      corpo_md: "c",
    });
  });
});

describe("filtros", () => {
  it("Fonte é squad, painel ou importacao", () => {
    expect(FONTES).toEqual(["squad", "painel", "importacao"]);
  });

  it("aceita vazio e os valores conhecidos; recusa o resto", () => {
    expect(filtrosDoPainelSchema.parse({})).toEqual({});
    expect(
      filtrosDoPainelSchema.parse({
        status: "rascunho",
        editoria: "analise",
        fonte: "squad",
      }),
    ).toEqual({ status: "rascunho", editoria: "analise", fonte: "squad" });
    for (const filtro of [
      { status: "arquivado" },
      { editoria: "opiniao" },
      { fonte: "outra" },
      { slug: "x" },
    ]) {
      expect(
        filtrosDoPainelSchema.safeParse(filtro).success,
        JSON.stringify(filtro),
      ).toBe(false);
    }
  });
});
