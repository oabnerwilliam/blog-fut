import path from "node:path";

/** Pasta das fixtures de conteúdo (nunca o content/ real). */
export const FIXTURES = path.resolve(__dirname, "../../fixtures/content");

export function fixture(nome: string): string {
  return path.join(FIXTURES, nome);
}
