import { describe, expect, it, vi } from "vitest";
import { ContentError } from "@/lib/content/errors";
import { parseArticleFile } from "@/lib/content/parse-article";
import { readingTime } from "@/lib/content/reading-time";
import { CORPO_TIPOGRAFICO } from "./helpers/corpo-tipografico";
import { linhasDoFrontmatter, montarMateria } from "./helpers/materia";

const rotulo = (slug: string) => `Rótulo ${slug}`;
const ARQUIVO = "materia-teste.md";

function parse(conteudo: string, arquivo = ARQUIVO) {
  return parseArticleFile(arquivo, conteudo, rotulo);
}

function erroDe(conteudo: string, arquivo = ARQUIVO): string {
  try {
    parse(conteudo, arquivo);
  } catch (erro) {
    expect(erro).toBeInstanceOf(ContentError);
    return (erro as Error).message;
  }
  throw new Error("esperava um ContentError");
}

describe("parseArticleFile", () => {
  it("monta o Article completo de uma matéria válida", () => {
    const { arquivo, artigo } = parse(montarMateria(null, CORPO_TIPOGRAFICO));
    expect(arquivo).toBe(ARQUIVO);
    expect(artigo).toEqual({
      slug: "materia-teste",
      titulo: "Título de teste",
      linha_fina: "Linha fina de teste",
      editoria: { slug: "cronica", rotulo: "Crônica" },
      tags: [{ slug: "fc-aurora", rotulo: "Rótulo fc-aurora" }],
      publicado_em: "2026-11-19",
      autor: "Squad Fut",
      ficticio: false,
      tempo_de_leitura: readingTime(CORPO_TIPOGRAFICO),
      titulo_seo: null,
      meta_description: null,
      palavras_chave: [],
      origem: "squad-fut/textos/materia-teste",
      fonte: "squad",
      corpo_md: CORPO_TIPOGRAFICO,
    });
  });

  it("corpo é exposto sem nenhuma alteração", () => {
    expect(parse(montarMateria(null, CORPO_TIPOGRAFICO)).artigo.corpo_md).toBe(
      CORPO_TIPOGRAFICO,
    );
  });

  it("arquivo CRLF é lido e o corpo mantém os \\r\\n", () => {
    const crlf = montarMateria(null, CORPO_TIPOGRAFICO).replace(/\n/g, "\r\n");
    const { artigo } = parse(crlf);
    expect(artigo.titulo).toBe("Título de teste");
    expect(artigo.corpo_md).toBe(CORPO_TIPOGRAFICO.replace(/\n/g, "\r\n"));
  });

  it("os opcionais de SEO são repassados", () => {
    const { artigo } = parse(
      montarMateria({
        titulo_seo: "SEO",
        meta_description: "Descrição",
        palavras_chave: ["a", "b"],
      }),
    );
    expect(artigo.titulo_seo).toBe("SEO");
    expect(artigo.meta_description).toBe("Descrição");
    expect(artigo.palavras_chave).toEqual(["a", "b"]);
  });

  it("fictícia com origem vazia ou ausente expõe origem null", () => {
    expect(
      parse(montarMateria({ ficticio: true, origem: "" })).artigo.origem,
    ).toBeNull();
    expect(
      parse(montarMateria({ ficticio: true, origem: undefined })).artigo.origem,
    ).toBeNull();
  });

  it("fonte: squad quando há origem, importacao quando não há (história 18)", () => {
    expect(parse(montarMateria(null)).artigo.fonte).toBe("squad");
    expect(
      parse(montarMateria({ ficticio: true, origem: undefined })).artigo.fonte,
    ).toBe("importacao");
    expect(
      parse(montarMateria({ ficticio: true, origem: "" })).artigo.fonte,
    ).toBe("importacao");
  });

  it("o objeto devolvido é congelado", () => {
    const { artigo } = parse(montarMateria({ palavras_chave: ["a"] }));
    expect(Object.isFrozen(artigo)).toBe(true);
    expect(Object.isFrozen(artigo.editoria)).toBe(true);
    expect(Object.isFrozen(artigo.tags)).toBe(true);
    expect(Object.isFrozen(artigo.tags[0])).toBe(true);
    expect(Object.isFrozen(artigo.palavras_chave)).toBe(true);
  });

  it.each(["opiniao", "Analise", "análise"])(
    "editoria fora do enum → erro com o nome do arquivo (%s)",
    (editoria) => {
      const mensagem = erroDe(montarMateria({ editoria }));
      expect(mensagem).toContain(ARQUIVO);
      expect(mensagem).toMatch(/editoria/);
      expect(mensagem).toContain(editoria);
    },
  );

  it("campo obrigatório ausente cita arquivo e campo", () => {
    const mensagem = erroDe(montarMateria({ titulo: undefined }));
    expect(mensagem).toContain(ARQUIVO);
    expect(mensagem).toMatch(/"titulo"/);
  });

  it.each([
    ["tags", montarMateria({ tags: "psg" })],
    ["ficticio", montarMateria({ ficticio: "sim" })],
    [
      "ficticio",
      montarMateria(null).replace("ficticio: false", "ficticio: sim"),
    ],
  ])("tipo errado cita arquivo e campo (%s)", (campo, conteudo) => {
    const mensagem = erroDe(conteudo);
    expect(mensagem).toContain(ARQUIVO);
    expect(mensagem).toContain(`"${campo}"`);
  });

  it("campo desconhecido cita a chave", () => {
    const mensagem = erroDe(montarMateria({ linhafina: "x" }));
    expect(mensagem).toContain(ARQUIVO);
    expect(mensagem).toMatch(/linhafina/);
  });

  it.each(["PSG-Balanco", "são-paulo", "-a", "a--b", "a-"])(
    "slug fora do kebab-case → erro (%s)",
    (slug) => {
      const mensagem = erroDe(montarMateria({ slug }), `${slug}.md`);
      expect(mensagem).toContain(`${slug}.md`);
      expect(mensagem).toMatch(/"slug"/);
    },
  );

  it("slug diferente do nome do arquivo → erro", () => {
    const mensagem = erroDe(montarMateria({ slug: "b" }), "a.md");
    expect(mensagem).toContain(
      'a.md: slug "b" diferente do nome do arquivo "a.md"',
    );
  });

  it.each([[[]], [["Ligue 1"]], [["psg", "psg"]]])(
    "tags vazias, fora do padrão ou repetidas → erro (%j)",
    (tags) => {
      const mensagem = erroDe(montarMateria({ tags }));
      expect(mensagem).toContain(ARQUIVO);
      expect(mensagem).toMatch(/"tags/);
    },
  );

  it.each(["2026-13-45", "19/11/2026", "2026-02-30"])(
    "data inválida → erro (%s)",
    (data) => {
      const mensagem = erroDe(montarMateria({ publicado_em: data }));
      expect(mensagem).toContain(ARQUIVO);
      expect(mensagem).toMatch(/"publicado_em"/);
    },
  );

  it("data não muda de dia em America/Sao_Paulo", () => {
    vi.stubEnv("TZ", "America/Sao_Paulo");
    try {
      expect(new Date(2026, 0, 1).getTimezoneOffset()).toBe(180);
      const conteudo = montarMateria(null).replace(
        /publicado_em: .*\n/,
        "publicado_em: 2026-11-19\n",
      );
      expect(conteudo).toContain("publicado_em: 2026-11-19\n");
      expect(parse(conteudo).artigo.publicado_em).toBe("2026-11-19");
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("junta todos os problemas do arquivo num único erro", () => {
    const mensagem = erroDe(
      montarMateria({ titulo: undefined, editoria: "opiniao" }),
    );
    const linhas = mensagem.split("\n");
    expect(linhas).toHaveLength(2);
    expect(linhas.every((linha) => linha.startsWith(`${ARQUIVO}: `))).toBe(
      true,
    );
  });

  it("h1 no corpo → erro com arquivo e linha do arquivo", () => {
    const k = linhasDoFrontmatter();
    const mensagem = erroDe(
      montarMateria(null, "Abertura.\n\n# Título\n\nTexto.\n"),
    );
    expect(mensagem).toContain(ARQUIVO);
    expect(mensagem).toMatch(new RegExp(`linha ${k + 5}\\b`));
  });

  it("h1 setext e <h1> no corpo também são erro", () => {
    expect(erroDe(montarMateria(null, "Título\n===\n"))).toMatch(/h1/);
    expect(erroDe(montarMateria(null, "<h1>Título</h1>\n"))).toMatch(/h1/);
  });

  it("# em bloco de código ou no meio da linha não é h1", () => {
    const corpo = "```\n# não é título\n```\n\nO #1 do ranking.\n";
    expect(parse(montarMateria(null, corpo)).artigo.corpo_md).toBe(corpo);
  });
});
