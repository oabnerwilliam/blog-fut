/** Erro de conteúdo: frontmatter, YAML, tags.json ou pasta de matérias inválidos. */
export class ContentError extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "ContentError";
  }
}

/** Uma linha por problema: `${arquivo}: ${problema}`. */
export function erroNoArquivo(
  arquivo: string,
  problemas: readonly string[],
): ContentError {
  return new ContentError(
    problemas.map((problema) => `${arquivo}: ${problema}`).join("\n"),
  );
}

/** Junta erros de vários arquivos num único ContentError. */
export function juntarErros(erros: readonly ContentError[]): ContentError {
  const linhas = erros.flatMap((erro) => erro.message.split("\n"));
  return new ContentError(
    `Conteúdo inválido em content/ (${linhas.length} problema(s)):\n${linhas.join("\n")}`,
  );
}
