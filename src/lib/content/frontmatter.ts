import { YAMLParseError, parse } from "yaml";
import { erroNoArquivo } from "./errors";

export interface ArquivoSeparado {
  /** Resultado do YAML (validado depois pelo schema). */
  readonly dados: unknown;
  /** Tudo depois do `---` de fechamento, menos 1 quebra de linha. Nada mais muda. */
  readonly corpo: string;
  /** Linha (1-based) do arquivo onde está a 1ª linha do corpo. */
  readonly linhaInicialDoCorpo: number;
}

const ABERTURA = /^---\r?\n/;
const FECHAMENTO = /^---\r?(?:\n|$)/gm;

/** Separa o frontmatter do corpo sem alterar o corpo e faz o parse do YAML (esquema core). */
export function separarFrontmatter(
  arquivo: string,
  conteudo: string,
): ArquivoSeparado {
  const texto = conteudo.startsWith("﻿") ? conteudo.slice(1) : conteudo;

  const abertura = ABERTURA.exec(texto);
  if (!abertura) {
    throw erroNoArquivo(arquivo, [
      "frontmatter ausente: a 1ª linha precisa ser ---",
    ]);
  }

  const inicioDoYaml = abertura[0].length;
  const fechamentoRe = new RegExp(FECHAMENTO);
  fechamentoRe.lastIndex = inicioDoYaml;
  const fechamento = fechamentoRe.exec(texto);
  if (!fechamento) {
    throw erroNoArquivo(arquivo, ["frontmatter sem --- de fechamento"]);
  }

  const yaml = texto.slice(inicioDoYaml, fechamento.index);
  const corpo = texto.slice(fechamento.index + fechamento[0].length);
  const linhasDeYaml = yaml.split("\n").length - 1;

  let dados: unknown;
  try {
    dados = parse(yaml, {
      schema: "core",
      uniqueKeys: true,
      prettyErrors: true,
    });
  } catch (erro) {
    if (erro instanceof YAMLParseError) {
      const linha = (erro.linePos?.[0].line ?? 0) + 1;
      const motivo = erro.message.split("\n")[0];
      throw erroNoArquivo(arquivo, [
        `YAML inválido na linha ${linha}: ${motivo}`,
      ]);
    }
    throw erro;
  }

  if (typeof dados !== "object" || dados === null || Array.isArray(dados)) {
    throw erroNoArquivo(arquivo, ["frontmatter precisa ser um objeto"]);
  }

  return { dados, corpo, linhaInicialDoCorpo: linhasDeYaml + 3 };
}
