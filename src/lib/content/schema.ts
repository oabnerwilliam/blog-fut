import { z } from "zod";
import { SLUGS_DE_EDITORIA } from "@/lib/editorias";

/** kebab-case minúsculo: a-z, 0-9 e hífen, sem hífen no começo, no fim ou repetido. */
export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Data de calendário AAAA-MM-DD. */
export const DATA_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function bissexto(ano: number): boolean {
  return (ano % 4 === 0 && ano % 100 !== 0) || ano % 400 === 0;
}

const DIAS_POR_MES = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** Formato AAAA-MM-DD e data existente no calendário (2026-02-30 → false). Sem Date. */
export function isDataDeCalendario(valor: string): boolean {
  if (!DATA_REGEX.test(valor)) return false;
  const [ano, mes, dia] = valor.split("-").map(Number);
  if (mes < 1 || mes > 12 || dia < 1) return false;
  const diasNoMes = mes === 2 && bissexto(ano) ? 29 : DIAS_POR_MES[mes - 1];
  return dia <= diasNoMes;
}

/** Mensagem pt-BR que distingue o campo ausente do campo com tipo errado. */
function mensagem(motivo: string) {
  return (issue: { input?: unknown; code?: string }) =>
    issue.input === undefined && issue.code === "invalid_type"
      ? "obrigatório e ausente"
      : motivo;
}

/** Texto não vazio, sem transformar o valor (nada de .trim() transformador). */
function textoNaoVazio(campo: string) {
  return z
    .string({ error: mensagem(`${campo} precisa ser um texto`) })
    .refine((s) => s.trim() !== "", { error: "não pode ficar vazio" });
}

const tagsSchema = z
  .array(
    z.string({ error: "cada tag precisa ser um texto" }).regex(SLUG_REGEX, {
      error: "cada tag precisa estar em kebab-case minúsculo (a-z, 0-9 e -)",
    }),
    { error: mensagem("precisa ser uma lista, por exemplo [fc-aurora]") },
  )
  .min(1, { error: "precisa ter pelo menos 1 tag" })
  .superRefine((tags, ctx) => {
    const vistas = new Set<string>();
    for (const tag of tags) {
      if (vistas.has(tag)) {
        ctx.addIssue({ code: "custom", message: `tag repetida: ${tag}` });
      }
      vistas.add(tag);
    }
  });

export const frontmatterSchema = z
  .strictObject(
    {
      slug: z
        .string({ error: mensagem("precisa ser um texto") })
        .regex(SLUG_REGEX, {
          error:
            "precisa estar em kebab-case minúsculo (a-z, 0-9 e -, sem hífen no começo, no fim ou repetido)",
        }),
      titulo: textoNaoVazio("titulo"),
      titulo_seo: textoNaoVazio("titulo_seo").nullish(),
      linha_fina: textoNaoVazio("linha_fina"),
      editoria: z.enum(SLUGS_DE_EDITORIA, {
        error: mensagem(
          `editoria fora da lista; valores aceitos: ${SLUGS_DE_EDITORIA.join(", ")}`,
        ),
      }),
      tags: tagsSchema,
      meta_description: textoNaoVazio("meta_description").nullish(),
      palavras_chave: z
        .array(textoNaoVazio("cada palavra-chave"), {
          error: "precisa ser uma lista de textos",
        })
        .nullish(),
      publicado_em: z
        .string({
          error: mensagem("precisa ser uma data AAAA-MM-DD, sem aspas extras"),
        })
        .regex(DATA_REGEX, { error: "precisa estar no formato AAAA-MM-DD" })
        .refine(isDataDeCalendario, {
          error: "não é uma data de calendário válida",
        }),
      autor: textoNaoVazio("autor"),
      ficticio: z.boolean({ error: mensagem("precisa ser true ou false") }),
      origem: z
        .string({ error: "precisa ser um texto (caminho no squad-fut)" })
        .nullish(),
    },
    { error: "frontmatter precisa ser um objeto" },
  )
  .superRefine((dados, ctx) => {
    const origemVazia = (dados.origem ?? "").trim() === "";
    if (dados.ficticio === false && origemVazia) {
      ctx.addIssue({
        code: "custom",
        path: ["origem"],
        message: "obrigatória e não vazia quando ficticio: false",
      });
    }
    if (dados.ficticio === true && (dados.origem ?? "") !== "") {
      ctx.addIssue({
        code: "custom",
        path: ["origem"],
        message: "precisa ficar vazia ou ausente quando ficticio: true",
      });
    }
  });

export type Frontmatter = z.output<typeof frontmatterSchema>;

function valorEm(dados: unknown, caminho: readonly PropertyKey[]): unknown {
  let atual: unknown = dados;
  for (const chave of caminho) {
    if (typeof atual !== "object" || atual === null) return undefined;
    atual = (atual as Record<PropertyKey, unknown>)[chave];
  }
  return atual;
}

function descreverValor(valor: unknown): string {
  return valor === undefined ? "nada" : JSON.stringify(valor);
}

function nomeDoCampo(caminho: readonly PropertyKey[]): string {
  return caminho
    .map((chave, i) =>
      typeof chave === "number"
        ? `[${chave}]`
        : `${i > 0 ? "." : ""}${String(chave)}`,
    )
    .join("");
}

/** Converte cada issue em `campo "x": <motivo> (recebido: <valor>)`. */
export function formatarProblemas(erro: z.ZodError, dados: unknown): string[] {
  return erro.issues.flatMap((issue) => {
    if (issue.code === "unrecognized_keys") {
      return issue.keys.map(
        (chave) =>
          `campo desconhecido "${chave}" (campos aceitos: ${Object.keys(frontmatterSchema.shape).join(", ")})`,
      );
    }
    const campo = nomeDoCampo(issue.path);
    const valor = valorEm(dados, issue.path);
    if (campo === "") return [issue.message];
    return valor === undefined
      ? [`campo "${campo}": ${issue.message}`]
      : [
          `campo "${campo}": ${issue.message} (recebido: ${descreverValor(valor)})`,
        ];
  });
}
