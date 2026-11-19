import { stringify } from "yaml";

/** Frontmatter válido de uma matéria real (ficticio: false, com origem). */
export const FRONTMATTER_VALIDO: Readonly<Record<string, unknown>> = {
  slug: "materia-teste",
  titulo: "Título de teste",
  linha_fina: "Linha fina de teste",
  editoria: "cronica",
  tags: ["fc-aurora"],
  publicado_em: "2026-11-19",
  autor: "Squad Fut",
  ficticio: false,
  origem: "squad-fut/textos/materia-teste",
};

/**
 * Monta o texto de um arquivo .md com frontmatter válido e os overrides aplicados.
 * `undefined` remove o campo; `null` como overrides devolve o frontmatter válido.
 */
export function montarMateria(
  overrides: Record<string, unknown> | null = null,
  corpo = "Corpo da matéria.\n",
): string {
  const dados: Record<string, unknown> = { ...FRONTMATTER_VALIDO };
  for (const [chave, valor] of Object.entries(overrides ?? {})) {
    if (valor === undefined) delete dados[chave];
    else dados[chave] = valor;
  }
  return `---\n${stringify(dados)}---\n${corpo}`;
}

/** Número de linhas de YAML que montarMateria gera para os overrides dados. */
export function linhasDoFrontmatter(
  overrides: Record<string, unknown> | null = null,
): number {
  return montarMateria(overrides, "").split("\n").length - 3;
}
