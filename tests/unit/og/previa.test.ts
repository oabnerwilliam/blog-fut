import { describe, expect, it } from "vitest";
import {
  ALT_DA_PREVIA_PADRAO,
  altDaPrevia,
  EDITORIAS_DA_PREVIA,
  numeroDaEditoria,
  reguaDoTitulo,
  TAMANHO_DA_PREVIA,
  textosDaPrevia,
} from "@/lib/og/previa";
import { DESCRICAO_DO_PORTAL, NOME_DO_PORTAL, SLOGAN } from "@/lib/site";
import { montarArtigo } from "../content/helpers/artigo";

const titulo = (n: number) => "a".repeat(n);

describe("TAMANHO_DA_PREVIA", () => {
  it("é 1200 × 630 (proporção 1,91:1 do Open Graph)", () => {
    expect(TAMANHO_DA_PREVIA).toEqual({ width: 1200, height: 630 });
  });
});

describe("reguaDoTitulo", () => {
  it.each([
    [1, 112, -2.2, 3],
    [45, 112, -2.2, 3],
    [46, 86, -1.7, 4],
    [80, 86, -1.7, 4],
    [81, 68, -1.4, 5],
    [120, 68, -1.4, 5],
    [121, 56, -1.1, 5],
    [160, 56, -1.1, 5],
  ])(
    "%i caracteres → %i px, letterSpacing %d, até %i linhas, sem lineClamp",
    (n, fonte, espacamento, linhas) => {
      const regua = reguaDoTitulo(titulo(n));
      expect(regua).toEqual({
        fontSize: fonte,
        letterSpacing: espacamento,
        linhasNoMaximo: linhas,
        lineClamp: undefined,
      });
    },
  );

  it("acima de 160 caracteres: 48 px e lineClamp 6, a rede de segurança", () => {
    expect(reguaDoTitulo(titulo(161))).toEqual({
      fontSize: 48,
      letterSpacing: -1,
      linhasNoMaximo: 6,
      lineClamp: 6,
    });
    expect(reguaDoTitulo(titulo(400)).lineClamp).toBe(6);
  });

  it("conta os espaços (é o `length` do título)", () => {
    expect(reguaDoTitulo(`${titulo(40)}      `).fontSize).toBe(86);
  });

  it("no limite, fonte × linhas cabe na altura útil de 344 px da direção A", () => {
    for (const n of [1, 46, 81, 121, 161]) {
      const { fontSize, linhasNoMaximo } = reguaDoTitulo(titulo(n));
      expect(fontSize * linhasNoMaximo).toBeLessThanOrEqual(344);
    }
  });

  it("os títulos do acervo caem nas faixas que o design mediu", () => {
    // PSG (67) e a entrevista (117), citados no README do design.
    expect(
      reguaDoTitulo(
        "O mercado enxuto do PSG deu certo até aqui. Falta aguentar até maio",
      ).fontSize,
    ).toBe(86);
    expect(reguaDoTitulo(titulo(117)).fontSize).toBe(68);
  });
});

describe("numeroDaEditoria", () => {
  it("segue a ordem da nav, com dois dígitos", () => {
    expect(numeroDaEditoria("analise")).toBe("01");
    expect(numeroDaEditoria("perfil")).toBe("05");
    expect(numeroDaEditoria("reportagem")).toBe("07");
  });
});

describe("EDITORIAS_DA_PREVIA", () => {
  it("lista as 7 editorias numeradas, na ordem da nav", () => {
    expect(EDITORIAS_DA_PREVIA).toEqual([
      { numero: "01", rotulo: "Análise" },
      { numero: "02", rotulo: "Crônica" },
      { numero: "03", rotulo: "Notícia" },
      { numero: "04", rotulo: "Coluna" },
      { numero: "05", rotulo: "Perfil" },
      { numero: "06", rotulo: "Entrevista" },
      { numero: "07", rotulo: "Reportagem" },
    ]);
  });
});

describe("textosDaPrevia", () => {
  it("monta editoria, número, título, data DD.MM.AAAA e o slogan na real", () => {
    const textos = textosDaPrevia(
      montarArtigo({
        titulo: "Hakimi, o lateral que virou artilheiro",
        editoria: { slug: "perfil", rotulo: "Perfil" },
        publicado_em: "2026-11-21",
        ficticio: false,
      }),
    );
    expect(textos).toEqual({
      numero: "05",
      editoria: "Perfil",
      titulo: "Hakimi, o lateral que virou artilheiro",
      data: "21.11.2026",
      ficticio: false,
      rodape: SLOGAN,
    });
  });

  it("na fictícia, marca o selo e troca o slogan pelo aviso", () => {
    const textos = textosDaPrevia(montarArtigo({ ficticio: true }));
    expect(textos.ficticio).toBe(true);
    expect(textos.rodape).toBe("Conteúdo fictício de demonstração");
  });

  it("usa o título da matéria, não o titulo_seo", () => {
    const textos = textosDaPrevia(
      montarArtigo({ titulo: "Título da arte", titulo_seo: "Título SEO" }),
    );
    expect(textos.titulo).toBe("Título da arte");
  });
});

describe("textos alternativos", () => {
  it("o da matéria é o título, com o aviso de exemplo nas fictícias", () => {
    expect(
      altDaPrevia(montarArtigo({ titulo: "Um título", ficticio: false })),
    ).toBe("Um título");
    expect(
      altDaPrevia(montarArtigo({ titulo: "Um título", ficticio: true })),
    ).toBe("Exemplo: Um título");
  });

  it("o padrão traz o nome e o lema do portal", () => {
    expect(ALT_DA_PREVIA_PADRAO).toBe(
      `${NOME_DO_PORTAL}: ${SLOGAN.toLowerCase()}. ${DESCRICAO_DO_PORTAL}`,
    );
  });
});
