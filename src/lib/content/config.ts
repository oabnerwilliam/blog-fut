export type Ambiente = Readonly<Record<string, string | undefined>>;

export interface ContentConfig {
  readonly source: "files";
  readonly mostrarExemplos: boolean;
}

function lerFonte(valor: string | undefined): "files" {
  if (valor === undefined || valor === "files") return "files";
  throw new Error(
    `CONTENT_SOURCE inválido: "${valor}". Valores aceitos: files.`,
  );
}

function lerMostrarExemplos(valor: string | undefined): boolean {
  if (valor === undefined || valor === "true") return true;
  if (valor === "false") return false;
  throw new Error(
    `MOSTRAR_EXEMPLOS inválido: "${valor}". Use "true" ou "false".`,
  );
}

/** Lê e valida CONTENT_SOURCE e MOSTRAR_EXEMPLOS. Valor desconhecido nunca cai num padrão. */
export function lerConfiguracao(env: Ambiente): ContentConfig {
  return {
    source: lerFonte(env.CONTENT_SOURCE),
    mostrarExemplos: lerMostrarExemplos(env.MOSTRAR_EXEMPLOS),
  };
}
