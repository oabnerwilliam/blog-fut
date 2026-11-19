import { z } from "zod";
import { ContentError } from "./errors";
import { SLUG_REGEX } from "./schema";

export type RotulosDeTags = Readonly<Record<string, string>>;
export type Aviso = (mensagem: string) => void;

const CONECTIVOS: ReadonlySet<string> = new Set([
  "a",
  "as",
  "o",
  "os",
  "e",
  "de",
  "da",
  "das",
  "do",
  "dos",
  "em",
  "na",
  "nas",
  "no",
  "nos",
]);

function capitalizar(palavra: string): string {
  return palavra.charAt(0).toLocaleUpperCase("pt-BR") + palavra.slice(1);
}

/** `ligue-1` → `Ligue 1`; `copa-do-litoral` → `Copa do Litoral`. */
export function humanizarTag(slug: string): string {
  return slug
    .split("-")
    .map((palavra, i) =>
      i > 0 && CONECTIVOS.has(palavra) ? palavra : capitalizar(palavra),
    )
    .join(" ");
}

const rotulosSchema = z.record(
  z.string().regex(SLUG_REGEX),
  z.string().refine((s) => s.trim() !== ""),
);

/** JSON `{ "<slug>": "<Rótulo>" }`. Qualquer falha → ContentError citando tags.json. */
export function lerRotulosDeTags(json: string): RotulosDeTags {
  let dados: unknown;
  try {
    dados = JSON.parse(json);
  } catch (erro) {
    throw new ContentError(
      `tags.json: JSON inválido (${erro instanceof Error ? erro.message : String(erro)})`,
    );
  }
  if (typeof dados !== "object" || dados === null || Array.isArray(dados)) {
    throw new ContentError(
      'tags.json: precisa ser um objeto { "<slug>": "<Rótulo>" }',
    );
  }
  const resultado = rotulosSchema.safeParse(dados);
  if (!resultado.success) {
    const problemas = resultado.error.issues.map((issue) => {
      const chave = issue.path.map(String).join(".");
      return chave === ""
        ? issue.message
        : `"${chave}": ${issue.code === "invalid_key" ? "slug fora do kebab-case" : "o rótulo precisa ser um texto não vazio"}`;
    });
    throw new ContentError(`tags.json: ${problemas.join("; ")}`);
  }
  return Object.freeze(resultado.data);
}

/** Rótulo do tags.json ou humanizado. Avisa uma vez por slug por resolvedor. */
export function criarResolvedorDeRotulos(
  rotulos: RotulosDeTags,
  avisar: Aviso,
): (slug: string) => string {
  const avisados = new Set<string>();
  return (slug) => {
    if (Object.hasOwn(rotulos, slug)) return rotulos[slug];
    const rotulo = humanizarTag(slug);
    if (!avisados.has(slug)) {
      avisados.add(slug);
      avisar(
        `[conteúdo] tag "${slug}" sem rótulo em content/tags.json; usando "${rotulo}".`,
      );
    }
    return rotulo;
  };
}
