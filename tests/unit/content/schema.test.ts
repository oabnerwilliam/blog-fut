import { describe, expect, it } from "vitest";
import {
  DATA_REGEX,
  SLUG_REGEX,
  formatarProblemas,
  frontmatterSchema,
  isDataDeCalendario,
} from "@/lib/content/schema";
import { SLUGS_DE_EDITORIA } from "@/lib/editorias";

const EDITORIA = SLUGS_DE_EDITORIA[1];

function minimo(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    slug: "materia-teste",
    titulo: "Título",
    linha_fina: "Linha fina",
    editoria: EDITORIA,
    tags: ["fc-aurora"],
    publicado_em: "2026-10-01",
    autor: "Squad Fut",
    ficticio: true,
    ...extra,
  };
}

function problemas(dados: Record<string, unknown>): string[] {
  const resultado = frontmatterSchema.safeParse(dados);
  if (resultado.success) return [];
  return formatarProblemas(resultado.error, dados);
}

function sem(campo: string): Record<string, unknown> {
  const dados = minimo();
  delete dados[campo];
  return dados;
}

describe("schema do frontmatter", () => {
  it("aceita o frontmatter mínimo válido", () => {
    const resultado = frontmatterSchema.safeParse(minimo());
    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect(resultado.data.titulo).toBe("Título");
      expect(resultado.data.publicado_em).toBe("2026-10-01");
    }
  });

  it("não apara nem altera o texto dos campos", () => {
    const resultado = frontmatterSchema.safeParse(
      minimo({ titulo: '  “Gol”  -- "aspas" ... ' }),
    );
    expect(resultado.success && resultado.data.titulo).toBe(
      '  “Gol”  -- "aspas" ... ',
    );
  });

  it("aceita os opcionais de SEO", () => {
    expect(
      problemas(
        minimo({
          titulo_seo: "SEO",
          meta_description: "Descrição",
          palavras_chave: ["um", "dois"],
        }),
      ),
    ).toEqual([]);
  });

  it("rejeita ficticio ausente", () => {
    const lista = problemas(sem("ficticio"));
    expect(lista).toHaveLength(1);
    expect(lista[0]).toMatch(/ficticio/);
  });

  it.each([
    "slug",
    "titulo",
    "linha_fina",
    "editoria",
    "tags",
    "publicado_em",
    "autor",
  ])("rejeita o obrigatório %s ausente", (campo) => {
    expect(problemas(sem(campo)).join("\n")).toMatch(new RegExp(`"${campo}"`));
  });

  it("rejeita texto obrigatório vazio ou só com espaços", () => {
    expect(problemas(minimo({ titulo: "   " })).join("\n")).toMatch(/titulo/);
  });

  it("origem: real sem origem → erro", () => {
    expect(problemas(minimo({ ficticio: false })).join("\n")).toMatch(
      /"origem"/,
    );
  });

  it("origem: real com origem só de espaços → erro", () => {
    expect(
      problemas(minimo({ ficticio: false, origem: "   " })).join("\n"),
    ).toMatch(/"origem"/);
  });

  it("origem: real com origem preenchida → ok", () => {
    expect(
      problemas(minimo({ ficticio: false, origem: "squad-fut/textos/x" })),
    ).toEqual([]);
  });

  it("origem: fictícia com origem preenchida → erro", () => {
    expect(
      problemas(minimo({ origem: "squad-fut/textos/x" })).join("\n"),
    ).toMatch(/"origem"/);
  });

  it("origem: fictícia com origem vazia ou ausente → ok", () => {
    expect(problemas(minimo())).toEqual([]);
    expect(problemas(minimo({ origem: "" }))).toEqual([]);
    expect(problemas(minimo({ origem: null }))).toEqual([]);
  });

  it("editoria fora do enum cita o campo, o valor e os aceitos", () => {
    const texto = problemas(minimo({ editoria: "opiniao" })).join("\n");
    expect(texto).toMatch(/"editoria"/);
    expect(texto).toMatch(/opiniao/);
    expect(texto).toContain(SLUGS_DE_EDITORIA.join(", "));
  });

  it("campo desconhecido cita a chave", () => {
    expect(problemas(minimo({ linhafina: "x" })).join("\n")).toMatch(
      /linhafina/,
    );
  });

  it.each(["PSG-Balanco", "são-paulo", "-a", "a--b", "a-"])(
    "slug fora do kebab-case → erro (%s)",
    (slug) => {
      expect(SLUG_REGEX.test(slug)).toBe(false);
      expect(problemas(minimo({ slug })).join("\n")).toMatch(/"slug"/);
    },
  );

  it.each([[[]], [["Ligue 1"]], [["psg", "psg"]], ["psg"]])(
    "tags vazias, fora do padrão, repetidas ou em texto → erro (%j)",
    (tags) => {
      expect(problemas(minimo({ tags })).join("\n")).toMatch(/"tags/);
    },
  );

  it("tag repetida cita a tag", () => {
    expect(problemas(minimo({ tags: ["aa", "aa"] })).join("\n")).toMatch(
      /repetida: aa/,
    );
  });

  it.each(["2026-13-45", "19/11/2026", "2026-02-30", "2026-1-5"])(
    "data inválida → erro (%s)",
    (data) => {
      expect(problemas(minimo({ publicado_em: data })).join("\n")).toMatch(
        /"publicado_em"/,
      );
    },
  );

  it("isDataDeCalendario confere o calendário", () => {
    expect(DATA_REGEX.test("2026-11-19")).toBe(true);
    expect(isDataDeCalendario("2026-11-19")).toBe(true);
    expect(isDataDeCalendario("2024-02-29")).toBe(true);
    expect(isDataDeCalendario("2026-02-29")).toBe(false);
    expect(isDataDeCalendario("2026-00-10")).toBe(false);
  });

  it.each([["sim"], [1], ["true"]])(
    "ficticio precisa ser booleano (%j)",
    (valor) => {
      expect(problemas(minimo({ ficticio: valor })).join("\n")).toMatch(
        /"ficticio"/,
      );
    },
  );

  it("formata cada problema com o campo e o valor recebido", () => {
    expect(problemas(minimo({ editoria: "Analise" }))[0]).toMatch(
      /^campo "editoria": .+ \(recebido: "Analise"\)$/,
    );
  });
});
