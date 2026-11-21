import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { ContentError, juntarErros } from "./errors";
import { parseArticleFile, type ArtigoCarregado } from "./parse-article";
import {
  criarResolvedorDeRotulos,
  lerRotulosDeTags,
  type Aviso,
  type RotulosDeTags,
} from "./tags";

/*
 * Leitura do disco, sem `server-only`: o `FileArticleRepository` (site) e o
 * `scripts/importar-conteudo.ts` (fora do Next) usam as mesmas funções, para o banco
 * receber exatamente o que o site de arquivos mostra (história 13).
 */

function ehErroDeArquivoAusente(erro: unknown): boolean {
  return (
    typeof erro === "object" &&
    erro !== null &&
    "code" in erro &&
    erro.code === "ENOENT"
  );
}

/** `<contentDir>/tags.json` validado; ausente → `{}`. */
export function lerRotulosDoDisco(contentDir: string): RotulosDeTags {
  let json: string;
  try {
    json = readFileSync(path.join(contentDir, "tags.json"), "utf8");
  } catch (erro) {
    if (ehErroDeArquivoAusente(erro)) return {};
    throw erro;
  }
  return lerRotulosDeTags(json);
}

function listarArquivosDeMaterias(pasta: string): string[] {
  try {
    return readdirSync(pasta, { withFileTypes: true })
      .filter((entrada) => entrada.isFile() && entrada.name.endsWith(".md"))
      .map((entrada) => entrada.name)
      .sort();
  } catch (erro) {
    if (ehErroDeArquivoAusente(erro)) {
      throw new ContentError("pasta content/materias não encontrada");
    }
    throw erro;
  }
}

/**
 * Lê tags.json (opcional) e materias/*.md e junta os erros de todos os arquivos.
 * Só lê a pasta materias/: a caixa de entrada (entrada/) nunca é lida.
 */
export function carregarArtigosDoDisco(
  contentDir: string,
  avisar: Aviso,
): ArtigoCarregado[] {
  const rotuloDaTag = criarResolvedorDeRotulos(
    lerRotulosDoDisco(contentDir),
    avisar,
  );
  const pasta = path.join(contentDir, "materias");
  const carregados: ArtigoCarregado[] = [];
  const erros: ContentError[] = [];
  for (const arquivo of listarArquivosDeMaterias(pasta)) {
    const conteudo = readFileSync(path.join(pasta, arquivo), "utf8");
    try {
      carregados.push(parseArticleFile(arquivo, conteudo, rotuloDaTag));
    } catch (erro) {
      if (!(erro instanceof ContentError)) throw erro;
      erros.push(erro);
    }
  }
  if (erros.length > 0) throw juntarErros(erros);
  return carregados;
}
