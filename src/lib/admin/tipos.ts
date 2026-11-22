/**
 * Tipos e validação do painel de matérias (história 17, critério 2; spec v2 §7.7).
 *
 * Sem `server-only`: os componentes da fase 2 (inclusive os de cliente) usam os tipos e
 * as listas. Quem grava valida de novo no servidor (`materias.ts`), sempre.
 */
import { z } from "zod";
import { encontrarLinhasDeH1 } from "@/lib/content/markdown";
import { frontmatterSchema, SLUG_REGEX } from "@/lib/content/schema";
import type { FonteDaMateria } from "@/lib/content/types";
import { SLUGS_DE_EDITORIA, type Editoria } from "@/lib/editorias";
import { TAMANHO_MAXIMO_DO_SLUG } from "./slug";

/** De onde a matéria veio: o squad-fut, o painel (história 18) ou a importação da v1. */
export const FONTES = [
  "squad",
  "painel",
  "importacao",
] as const satisfies readonly FonteDaMateria[];
export type Fonte = (typeof FONTES)[number];

export const STATUS_DA_MATERIA = ["rascunho", "publicado"] as const;
export type StatusDaMateria = (typeof STATUS_DA_MATERIA)[number];

/** Quem criou cada revisão (`article_revisions.origem_da_revisao`). */
export type OrigemDaRevisao = Fonte;

const campo = frontmatterSchema.shape;

/**
 * A regra da v1 para `h1` no corpo, também no painel (história 18): o título da matéria
 * já é o `h1` da página. O detector é o mesmo do carregamento dos arquivos
 * (`encontrarLinhasDeH1`, ADR 0004): `#`, o sublinhado com `===` e `<h1>`, sem contar o
 * que está dentro de código. As linhas são as do corpo, contadas a partir de 1.
 *
 * Vale na criação e na edição, e por isso também no "Restaurar esta versão" (que grava
 * pelos mesmos campos). Nenhuma revisão 1 do squad tem `h1`: o `materia:enviar` e a
 * importação passam pelo parser da v1, que recusa o `h1`, e as 9 matérias da pasta de
 * conteúdo passam nele. Se uma revisão antiga do painel tiver `h1`, restaurá-la mostra este mesmo
 * erro, o que é aceitável: a pessoa troca o `#` por `##` e salva.
 */
export function mensagemDeH1(linhas: readonly number[]): string {
  const onde =
    linhas.length === 1
      ? `linha ${linhas[0]}`
      : `linhas ${linhas.slice(0, -1).join(", ")} e ${linhas[linhas.length - 1]}`;
  return `O título da matéria já é o h1. Use ## para subtítulos (${onde}).`;
}

/** Teto do corpo: bem acima da maior matéria do squad, abaixo do 1 MB das actions. */
export const TAMANHO_MAXIMO_DO_CORPO = 200_000;

/**
 * Os campos que o painel edita, com as mesmas regras do frontmatter da v1 (o mesmo zod,
 * campo a campo). Ficam de fora:
 * - `slug`: mudar o endereço quebraria links e o cache (fora do escopo da 17);
 * - `fonte` e `origem`: dizem de onde a matéria veio, e isso não muda;
 * - `publicado_em`: a data editorial não muda depois da primeira publicação (spec v2
 *   §7.1). A revisão copia a data da matéria (`salvar_revisao`, migração `_painel.sql`).
 *
 * Mais o `corpo_md`, que no `.md` fica fora do frontmatter. As quebras de linha do corpo
 * viram `\n`: o `textarea` do navegador manda `\r\n` (especificação do HTML), e sem isso
 * toda linha apareceria trocada no diff com a revisão 1 do squad. Nada mais é mexido no
 * texto.
 *
 * `strictObject`: um campo desconhecido (por exemplo, `slug` ou `status`) é recusado, e
 * não ignorado em silêncio.
 */
export const camposEditoriaisSchema = z.strictObject(
  {
    titulo: campo.titulo,
    titulo_seo: campo.titulo_seo,
    linha_fina: campo.linha_fina,
    editoria: campo.editoria,
    tags: campo.tags,
    meta_description: campo.meta_description,
    palavras_chave: campo.palavras_chave,
    autor: campo.autor,
    ficticio: campo.ficticio,
    corpo_md: z
      .string({ error: "o corpo precisa ser um texto" })
      .refine((s) => s.trim() !== "", { error: "não pode ficar vazio" })
      .refine((s) => s.length <= TAMANHO_MAXIMO_DO_CORPO, {
        error: `passa de ${TAMANHO_MAXIMO_DO_CORPO.toLocaleString("pt-BR")} caracteres`,
        abort: true,
      })
      .superRefine((corpo, ctx) => {
        const linhas = encontrarLinhasDeH1(corpo);
        if (linhas.length > 0) {
          ctx.addIssue({ code: "custom", message: mensagemDeH1(linhas) });
        }
      })
      .transform((s) => s.replace(/\r\n?/g, "\n")),
  },
  { error: "os campos precisam ser um objeto" },
);

/** O que a tela manda (antes da validação). */
export type CamposEditoriaisDeEntrada = z.input<typeof camposEditoriaisSchema>;

/** Os campos já validados, prontos para virar uma revisão. */
export type CamposEditoriais = z.output<typeof camposEditoriaisSchema>;

/** O formato de `public.salvar_revisao(campos jsonb)`: nulos explícitos e listas sempre. */
export interface CamposDaRevisao {
  readonly titulo: string;
  readonly titulo_seo: string | null;
  readonly linha_fina: string;
  readonly editoria: Editoria;
  readonly tags: readonly string[];
  readonly meta_description: string | null;
  readonly palavras_chave: readonly string[];
  readonly autor: string;
  readonly ficticio: boolean;
  readonly corpo_md: string;
}

export function paraCamposDaRevisao(campos: CamposEditoriais): CamposDaRevisao {
  return {
    titulo: campos.titulo,
    titulo_seo: campos.titulo_seo ?? null,
    linha_fina: campos.linha_fina,
    editoria: campos.editoria,
    tags: campos.tags,
    meta_description: campos.meta_description ?? null,
    palavras_chave: campos.palavras_chave ?? [],
    autor: campos.autor,
    ficticio: campos.ficticio,
    corpo_md: campos.corpo_md,
  };
}

/** Os nomes dos campos editoriais, na ordem do formulário. */
export const NOMES_DOS_CAMPOS = Object.keys(
  camposEditoriaisSchema.shape,
) as readonly (keyof CamposEditoriais)[];

export type NomeDoCampo = keyof CamposEditoriais;

/** A primeira mensagem de erro de cada campo inválido. */
export type ErrosDosCampos = Readonly<Partial<Record<NomeDoCampo, string>>>;

// ---------------------------------------------------------------------------
// Criação (história 18)
// ---------------------------------------------------------------------------

const { titulo, ...depoisDoTitulo } = camposEditoriaisSchema.shape;

/**
 * O slug de uma matéria nova: escolhido só na criação (sugerido por `gerarSlug` e
 * editável) e nunca mais muda. Mesmas regras do frontmatter (`SLUG_REGEX`), com o teto de
 * 80 caracteres do `gerarSlug`. O vazio (título só com pontuação, por exemplo) tem uma
 * mensagem própria e para por aí (`abort`), sem a mensagem do kebab-case junto.
 */
const slugDaCriacao = z
  .string({
    error: (issue) =>
      issue.input === undefined
        ? "obrigatório e ausente"
        : "o slug precisa ser um texto",
  })
  .refine((s) => s !== "", {
    error:
      "não pode ficar vazio; escreva o endereço da matéria com letras ou números",
    abort: true,
  })
  .refine((s) => s.length <= TAMANHO_MAXIMO_DO_SLUG, {
    error: `passa de ${TAMANHO_MAXIMO_DO_SLUG} caracteres`,
    abort: true,
  })
  .regex(SLUG_REGEX, {
    error:
      "precisa estar em kebab-case minúsculo (a-z, 0-9 e -, sem acento, sem hífen no começo, no fim ou repetido)",
  });

/**
 * Os campos de "Criar rascunho": os editoriais da 17 mais o `slug`, logo depois do título
 * (a ordem do formulário). Continua estrito: `fonte`, `origem`, `status` e
 * `publicado_em` quem decide é o banco (`criar_materia`, migração `_criar_materia.sql`).
 */
export const camposDaCriacaoSchema = z.strictObject(
  { titulo, slug: slugDaCriacao, ...depoisDoTitulo },
  { error: "os campos precisam ser um objeto" },
);

export type CamposDaCriacaoDeEntrada = z.input<typeof camposDaCriacaoSchema>;
export type CamposDaCriacao = z.output<typeof camposDaCriacaoSchema>;
export type NomeDoCampoDaCriacao = keyof CamposDaCriacao;

/** Os nomes dos campos da criação, na ordem do formulário. */
export const NOMES_DOS_CAMPOS_DA_CRIACAO = Object.keys(
  camposDaCriacaoSchema.shape,
) as readonly NomeDoCampoDaCriacao[];

/** Os erros por campo da criação: os da edição mais o `slug`. */
export type ErrosDaCriacao = Readonly<
  Partial<Record<NomeDoCampoDaCriacao, string>>
>;

/** O formato de `public.criar_materia(campos jsonb)`. */
export interface CamposDaMateriaNova extends CamposDaRevisao {
  readonly slug: string;
}

export function paraCamposDaCriacao(
  campos: CamposDaCriacao,
): CamposDaMateriaNova {
  const { slug, ...editoriais } = campos;
  return { slug, ...paraCamposDaRevisao(editoriais) };
}

/** Filtros da lista `/admin/materias`. Cada um é opcional; vazio é "todos". */
export const filtrosDoPainelSchema = z.strictObject({
  status: z.enum(STATUS_DA_MATERIA).optional(),
  editoria: z.enum(SLUGS_DE_EDITORIA).optional(),
  fonte: z.enum(FONTES).optional(),
});

export type FiltrosDoPainel = z.output<typeof filtrosDoPainelSchema>;

/** Uma linha da lista de matérias do painel. */
export interface MateriaDoPainel {
  readonly id: string;
  readonly slug: string;
  /** O título da revisão em edição (o que o admin está editando). */
  readonly titulo: string;
  /** O título que o site mostra; nulo enquanto a matéria nunca foi publicada. */
  readonly tituloPublicado: string | null;
  readonly editoria: Editoria;
  readonly status: StatusDaMateria;
  readonly fonte: Fonte;
  readonly ficticio: boolean;
  /** Data editorial, AAAA-MM-DD. */
  readonly publicadoEm: string;
  /** Última gravação na linha da matéria (ISO). */
  readonly atualizadoEm: string;
  readonly revisaoPublicada: number | null;
  readonly revisaoEmEdicao: number;
  /**
   * Há uma revisão salva depois da que está (ou esteve) no ar. Uma matéria que nunca foi
   * publicada não marca: ela inteira é rascunho, e o status já diz isso.
   */
  readonly alteracoesNaoPublicadas: boolean;
}

/** Os erros das actions do painel, com a mensagem em pt-BR para a tela. */
export type ErroDoPainel =
  | "nao_autorizado"
  | "id_invalido"
  | "campos_invalidos"
  | "filtros_invalidos"
  | "materia_inexistente"
  | "revisao_inexistente"
  | "revisao_concorrente"
  | "origem_obrigatoria"
  | "slug_ja_existe"
  | "falha";

export type Recusa = {
  readonly ok: false;
  readonly erro: ErroDoPainel;
  readonly mensagem: string;
  /** Só em `campos_invalidos`: um problema por linha, como o validador do squad. */
  readonly problemas?: readonly string[];
  /**
   * Em `campos_invalidos` (e no `slug_ja_existe` da criação): a mensagem de cada campo,
   * para marcar o formulário. Na edição, nunca vem o `slug`.
   */
  readonly errosDosCampos?: ErrosDaCriacao;
};

/** `{ ok: true, ...dados }` ou `{ ok: false, erro, mensagem }`. */
export type ResultadoDoPainel<T extends object = object> =
  ({ readonly ok: true } & T) | Recusa;

/** Uma revisão na lista do histórico (sem o corpo). */
export interface RevisaoResumida {
  readonly numero: number;
  readonly origem: OrigemDaRevisao;
  /** Quem salvou: o nome do admin, ou o `autor` da matéria nas do squad e da importação. */
  readonly autor: string;
  /** Quando foi salva (ISO). */
  readonly criadaEm: string;
  readonly titulo: string;
  readonly editoria: Editoria;
}

/** Uma revisão inteira: para abrir, comparar e restaurar. */
export interface RevisaoCompleta extends RevisaoResumida {
  readonly campos: CamposDaRevisao;
}

/** O que não muda pelo painel e diz onde a matéria está. */
export interface ResumoDaMateria {
  readonly id: string;
  readonly slug: string;
  readonly status: StatusDaMateria;
  readonly fonte: Fonte;
  readonly origem: string | null;
  /** Data editorial, AAAA-MM-DD. */
  readonly publicadoEm: string;
  readonly revisaoPublicada: number | null;
  readonly revisaoEmEdicao: number;
}

/** `/admin/materias/[id]`: a matéria com os campos da revisão em edição. */
export interface MateriaParaEdicao extends ResumoDaMateria {
  readonly campos: CamposDaRevisao;
  readonly emEdicao: RevisaoResumida;
  readonly totalDeRevisoes: number;
  /** Os slugs de `tags`, para o `datalist` (o admin lê todas). */
  readonly tagsExistentes: readonly string[];
}

/** `/admin/materias/[id]/historico`: a matéria e as revisões, da mais nova para a mais antiga. */
export interface HistoricoDaMateria extends ResumoDaMateria {
  /** O título da revisão em edição (o que o admin vê no painel). */
  readonly titulo: string;
  readonly editoria: Editoria;
  readonly revisoes: readonly RevisaoResumida[];
}
