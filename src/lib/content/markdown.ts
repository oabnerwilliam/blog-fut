import rehypeRaw from "rehype-raw";
import rehypeSanitize, {
  defaultSchema,
  type Options as EsquemaDeSanitizacao,
} from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

/**
 * Esquema do GitHub sem h1 (o título fica no frontmatter) e removendo, com o
 * conteúdo, os elementos que nunca podem chegar à página (ADR 0004).
 */
const ESQUEMA: EsquemaDeSanitizacao = {
  ...defaultSchema,
  tagNames: (defaultSchema.tagNames ?? []).filter((tag) => tag !== "h1"),
  strip: [
    ...(defaultSchema.strip ?? []),
    "style",
    "iframe",
    "object",
    "embed",
    "noscript",
    "template",
  ],
};

/** CommonMark puro, sem plugins tipográficos nem GFM: o texto sai como entrou. */
const processador = unified()
  .use(remarkParse)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeRaw)
  .use(rehypeSanitize, ESQUEMA)
  .use(rehypeStringify);

/** Markdown do corpo → HTML sanitizado. Síncrono por dentro (termina no prerender). */
export async function renderMarkdown(md: string): Promise<string> {
  return String(processador.processSync(md));
}

/** Tipo estrutural mínimo de um nó do mdast (sem importar tipos transitivos). */
interface NoMarkdown {
  readonly type: string;
  readonly depth?: number;
  readonly value?: string;
  readonly position?: { readonly start: { readonly line: number } };
  readonly children?: readonly NoMarkdown[];
}

const H1_EM_HTML = /<h1[\s>/]/i;
const parser = unified().use(remarkParse);

function ehH1(no: NoMarkdown): boolean {
  if (no.type === "heading") return no.depth === 1;
  if (no.type === "html") return H1_EM_HTML.test(no.value ?? "");
  return false;
}

function coletarH1(no: NoMarkdown, linhas: number[]): void {
  if (ehH1(no) && no.position) linhas.push(no.position.start.line);
  // code e inlineCode não têm filhos: um # dentro de código nunca é visitado.
  for (const filho of no.children ?? []) coletarH1(filho, linhas);
}

/** Linhas (1-based, relativas ao `md`) de cada h1: ATX, setext e <h1> em HTML. Ignora código. */
export function encontrarLinhasDeH1(md: string): number[] {
  const linhas: number[] = [];
  coletarH1(parser.parse(md) as NoMarkdown, linhas);
  return linhas;
}
