/**
 * A regra da v1 para `h1` no corpo, agora no painel (história 18, fase 2): o título da
 * matéria já é o h1 da página. Vale na criação e na edição (os `CamposEditoriais`), com o
 * mesmo detector do carregamento dos arquivos (`encontrarLinhasDeH1`).
 */
import { describe, expect, it } from "vitest";
import { errosPorCampo } from "@/lib/admin/painel";
import {
  camposDaCriacaoSchema,
  camposEditoriaisSchema,
  NOMES_DOS_CAMPOS_DA_CRIACAO,
} from "@/lib/admin/tipos";

const EDITORIAIS = {
  titulo: "Marcelina Arruda renova",
  titulo_seo: null,
  linha_fina: "A goleira fica até 2028",
  editoria: "noticia",
  tags: ["marcelina-arruda"],
  meta_description: null,
  palavras_chave: [],
  autor: "Marina Duarte",
  ficticio: false,
  corpo_md: "Texto.\n",
};

function erroDoCorpo(corpo: string): string | undefined {
  const resultado = camposEditoriaisSchema.safeParse({
    ...EDITORIAIS,
    corpo_md: corpo,
  });
  if (resultado.success) return undefined;
  return errosPorCampo(resultado.error).corpo_md;
}

describe("h1 no corpo", () => {
  it.each([
    ["# Título\n\nTexto.\n", 1],
    ["Texto.\n\n# Título\n", 3],
    ["Texto.\n\nTítulo\n===\n", 3],
    ["Texto.\n\n<h1>Título</h1>\n", 3],
    ["Texto.\r\n\r\n# Título\r\n", 3],
  ])("%j: recusado, com a linha", (corpo, linha) => {
    expect(erroDoCorpo(corpo)).toBe(
      `O título da matéria já é o h1. Use ## para subtítulos (linha ${linha}).`,
    );
  });

  it("vários h1: todas as linhas", () => {
    expect(erroDoCorpo("# Um\n\nTexto.\n\n# Dois\n\n# Três\n")).toBe(
      "O título da matéria já é o h1. Use ## para subtítulos (linhas 1, 5 e 7).",
    );
  });

  it.each([
    "## Subtítulo\n\nTexto.\n",
    "Texto com # no meio.\n",
    "```\n# dentro de código\n```\n",
    "    # bloco indentado\n",
    "`# código em linha`\n",
    "Subtítulo\n---\n",
  ])("%j: aceito", (corpo) => {
    expect(erroDoCorpo(corpo)).toBeUndefined();
  });

  it("vale na criação também", () => {
    const resultado = camposDaCriacaoSchema.safeParse({
      ...EDITORIAIS,
      slug: "marcelina",
      corpo_md: "# Título\n",
    });
    expect(resultado.success).toBe(false);
    if (resultado.success) return;
    expect(
      errosPorCampo(resultado.error, NOMES_DOS_CAMPOS_DA_CRIACAO).corpo_md,
    ).toMatch(/já é o h1/);
  });
});

describe("as matérias do squad que já existem", () => {
  it("nenhuma das 9 do content/ tem h1: restaurar a revisão 1 nunca esbarra na regra", async () => {
    const path = await import("node:path");
    const { carregarArtigosDoDisco } = await import("@/lib/content/disco");
    const { encontrarLinhasDeH1 } = await import("@/lib/content/markdown");
    const artigos = carregarArtigosDoDisco(
      path.resolve(__dirname, "../../../content"),
      () => {},
    );
    expect(artigos).toHaveLength(9);
    for (const { arquivo, artigo } of artigos) {
      expect(encontrarLinhasDeH1(artigo.corpo_md), arquivo).toEqual([]);
    }
  });
});
