/**
 * Regras puras da tela de criação (história 18, critério 5; README de
 * docs/design/18-editor): o formulário com o slug, os rótulos e ids do bloco de erro, o
 * estado da prévia e o slug que acompanha o título.
 */
import { describe, expect, it } from "vitest";
import {
  camposDaCriacaoDoFormulario,
  estadoDaPrevia,
  IDS_DOS_CAMPOS,
  proximoSlug,
  ROTULOS_DOS_CAMPOS,
} from "@/lib/admin/telas";
import { NOMES_DOS_CAMPOS_DA_CRIACAO } from "@/lib/admin/tipos";

function formulario(valores: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(valores)) f.set(k, v);
  return f;
}

describe("camposDaCriacaoDoFormulario", () => {
  it("os campos da edição mais o slug, como foi digitado", () => {
    expect(
      camposDaCriacaoDoFormulario(
        formulario({
          titulo: "Nova",
          slug: "nova-materia",
          linha_fina: "Linha",
          editoria: "noticia",
          autor: "Marina Couto",
          corpo_md: "Texto.",
        }),
        ["psg"],
      ),
    ).toEqual({
      titulo: "Nova",
      slug: "nova-materia",
      titulo_seo: null,
      linha_fina: "Linha",
      editoria: "noticia",
      tags: ["psg"],
      meta_description: null,
      palavras_chave: [],
      autor: "Marina Couto",
      ficticio: false,
      corpo_md: "Texto.",
    });
  });

  it("sem o slug no formulário, vai vazio (o servidor recusa com a frase do slug)", () => {
    expect(camposDaCriacaoDoFormulario(formulario({}), []).slug).toBe("");
  });
});

describe("rótulos e ids do bloco de erro", () => {
  it("cobrem todos os campos da criação, inclusive o slug", () => {
    for (const campo of NOMES_DOS_CAMPOS_DA_CRIACAO) {
      expect(ROTULOS_DOS_CAMPOS[campo], campo).toBeTruthy();
      expect(IDS_DOS_CAMPOS[campo], campo).toMatch(/^c-/);
    }
    expect(ROTULOS_DOS_CAMPOS.slug).toBe("Slug");
    expect(IDS_DOS_CAMPOS.slug).toBe("c-slug");
  });
});

describe("proximoSlug", () => {
  it("acompanha o título enquanto a pessoa não mexeu no slug", () => {
    expect(proximoSlug("São Paulo vence", "", false)).toBe("sao-paulo-vence");
  });

  it("depois de editado, o slug não muda sozinho", () => {
    expect(proximoSlug("São Paulo vence", "meu-slug", true)).toBe("meu-slug");
  });
});

describe("estadoDaPrevia", () => {
  it("corpo vazio: vazia (nada a pedir)", () => {
    expect(estadoDaPrevia("  \n", { corpo: "", html: "" }, null)).toBe("vazia");
  });

  it("a prévia é do texto atual: em dia", () => {
    expect(
      estadoDaPrevia("abc", { corpo: "abc", html: "<p>abc</p>" }, null),
    ).toBe("em-dia");
  });

  it("o texto mudou e a resposta ainda não chegou: atualizando", () => {
    expect(
      estadoDaPrevia("abcd", { corpo: "abc", html: "<p>abc</p>" }, null),
    ).toBe("atualizando");
  });

  it("a action falhou para o texto atual: falhou", () => {
    expect(
      estadoDaPrevia("abcd", { corpo: "abc", html: "<p>abc</p>" }, "abcd"),
    ).toBe("falhou");
  });

  it("uma falha de um texto antigo não vale para o atual", () => {
    expect(
      estadoDaPrevia("abcde", { corpo: "abc", html: "<p>abc</p>" }, "abcd"),
    ).toBe("atualizando");
  });
});
