/**
 * Os campos da criação de matéria (história 18, critério 3): os editoriais da 17 mais o
 * `slug`, validado pelo `SLUG_REGEX`. E a prévia (critério 4): o mesmo `renderMarkdown`
 * sanitizado do site (ADR 0004), com o limite de tamanho do corpo.
 */
import { describe, expect, it } from "vitest";
import { renderizarPrevia } from "@/lib/admin/previa";
import { errosPorCampo, problemasDosCampos } from "@/lib/admin/painel";
import {
  camposDaCriacaoSchema,
  NOMES_DOS_CAMPOS_DA_CRIACAO,
  paraCamposDaCriacao,
  TAMANHO_MAXIMO_DO_CORPO,
} from "@/lib/admin/tipos";
import { renderMarkdown } from "@/lib/content/markdown";

const VALIDOS = {
  titulo: "Marcelina Arruda renova",
  slug: "marcelina-arruda-renova",
  titulo_seo: null,
  linha_fina: "A goleira fica até 2028",
  editoria: "noticia",
  tags: ["marcelina-arruda"],
  meta_description: null,
  palavras_chave: [],
  autor: "Marina Duarte",
  ficticio: false,
  corpo_md: "Primeiro parágrafo.\r\n\r\nSegundo.\r\n",
};

function erroDoSlug(slug: unknown): string | undefined {
  const resultado = camposDaCriacaoSchema.safeParse({ ...VALIDOS, slug });
  expect(resultado.success).toBe(false);
  if (resultado.success) return undefined;
  return errosPorCampo(resultado.error, NOMES_DOS_CAMPOS_DA_CRIACAO).slug;
}

describe("camposDaCriacaoSchema", () => {
  it("os campos são os editoriais mais o slug, logo depois do título", () => {
    expect(NOMES_DOS_CAMPOS_DA_CRIACAO).toEqual([
      "titulo",
      "slug",
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

  it("aceita os campos válidos; o corpo vem com \\n no lugar de \\r\\n", () => {
    expect(camposDaCriacaoSchema.parse(VALIDOS)).toEqual({
      ...VALIDOS,
      corpo_md: "Primeiro parágrafo.\n\nSegundo.\n",
    });
  });

  it("vira o formato da RPC, com nulos explícitos e listas sempre", () => {
    const sem: Record<string, unknown> = { ...VALIDOS };
    delete sem.titulo_seo;
    delete sem.meta_description;
    delete sem.palavras_chave;
    expect(paraCamposDaCriacao(camposDaCriacaoSchema.parse(sem))).toEqual({
      slug: VALIDOS.slug,
      titulo: VALIDOS.titulo,
      titulo_seo: null,
      linha_fina: VALIDOS.linha_fina,
      editoria: "noticia",
      tags: ["marcelina-arruda"],
      meta_description: null,
      palavras_chave: [],
      autor: "Marina Duarte",
      ficticio: false,
      corpo_md: "Primeiro parágrafo.\n\nSegundo.\n",
    });
  });

  it("slug vazio (título só com pontuação): um erro claro, um só", () => {
    const resultado = camposDaCriacaoSchema.safeParse({ ...VALIDOS, slug: "" });
    expect(resultado.success).toBe(false);
    if (resultado.success) return;
    expect(problemasDosCampos(resultado.error)).toEqual([
      'campo "slug": não pode ficar vazio; escreva o endereço da matéria com letras ou números',
    ]);
  });

  it.each([
    ["Com Maiúscula", /kebab-case/],
    ["com espaço", /kebab-case/],
    ["-ponta", /kebab-case/],
    ["hifen--duplo", /kebab-case/],
    ["acentuação", /kebab-case/],
    ["a".repeat(81), /80 caracteres/],
    [42, /texto/],
    [undefined, /obrigatório/],
  ])("slug %j recusado", (slug, mensagem) => {
    expect(erroDoSlug(slug)).toMatch(mensagem);
  });

  it("80 caracteres passa", () => {
    expect(
      camposDaCriacaoSchema.safeParse({ ...VALIDOS, slug: "a".repeat(80) })
        .success,
    ).toBe(true);
  });

  it.each(["fonte", "origem", "publicado_em", "status", "id"])(
    "%s é recusado (campo desconhecido)",
    (campo) => {
      expect(
        camposDaCriacaoSchema.safeParse({ ...VALIDOS, [campo]: "x" }).success,
      ).toBe(false);
    },
  );

  it("as regras dos campos editoriais são as da 17 (tag inválida, título vazio)", () => {
    const resultado = camposDaCriacaoSchema.safeParse({
      ...VALIDOS,
      titulo: "  ",
      tags: ["Tag Ruim"],
    });
    expect(resultado.success).toBe(false);
    if (resultado.success) return;
    expect(Object.keys(errosPorCampo(resultado.error))).toEqual([
      "titulo",
      "tags",
    ]);
  });
});

describe("renderizarPrevia", () => {
  it("devolve o HTML do mesmo renderMarkdown do site", async () => {
    const md = "Um parágrafo com **negrito**.\n\n## Seção\n\n- item\n";
    expect(await renderizarPrevia(md)).toEqual({
      ok: true,
      html: await renderMarkdown(md),
    });
  });

  it("tira <script>, onerror e javascript:", async () => {
    const resultado = await renderizarPrevia(
      '<script>alert(1)</script>\n\n<img src="x" onerror="alert(2)">\n\n[clique](javascript:alert(3))\n\n<a href="javascript:alert(4)">a</a>\n',
    );
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.html).not.toMatch(/<script/i);
    expect(resultado.html).not.toMatch(/onerror/i);
    expect(resultado.html).not.toMatch(/javascript:/i);
    expect(resultado.html).not.toContain("alert");
  });

  it("vazio → HTML vazio", async () => {
    expect(await renderizarPrevia("")).toEqual({ ok: true, html: "" });
  });

  it("acima do limite do corpo: recusa sem renderizar", async () => {
    const resultado = await renderizarPrevia(
      "a".repeat(TAMANHO_MAXIMO_DO_CORPO + 1),
    );
    expect(resultado).toMatchObject({
      ok: false,
      erro: "campos_invalidos",
      errosDosCampos: { corpo_md: expect.stringMatching(/200\.000/) },
    });
  });

  it("no limite: renderiza", async () => {
    const resultado = await renderizarPrevia(
      "a".repeat(TAMANHO_MAXIMO_DO_CORPO),
    );
    expect(resultado.ok).toBe(true);
  });

  it.each([null, undefined, 42, { md: "x" }, ["x"]])(
    "%j não é texto: recusa",
    async (valor) => {
      expect(await renderizarPrevia(valor)).toMatchObject({
        ok: false,
        erro: "campos_invalidos",
      });
    },
  );
});
