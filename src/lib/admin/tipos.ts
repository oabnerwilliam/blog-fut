/**
 * Tipos e validação do painel de matérias (história 17, critério 2; spec v2 §7.7).
 *
 * Sem `server-only`: os componentes da fase 2 (inclusive os de cliente) usam os tipos e
 * as listas. Quem grava valida de novo no servidor (`materias.ts`), sempre.
 */
import { z } from "zod";
import { frontmatterSchema } from "@/lib/content/schema";
import { SLUGS_DE_EDITORIA, type Editoria } from "@/lib/editorias";

/** De onde a matéria veio: o squad-fut, o painel (história 18) ou a importação da v1. */
export const FONTES = ["squad", "painel", "importacao"] as const;
export type Fonte = (typeof FONTES)[number];

export const STATUS_DA_MATERIA = ["rascunho", "publicado"] as const;
export type StatusDaMateria = (typeof STATUS_DA_MATERIA)[number];

/** Quem criou cada revisão (`article_revisions.origem_da_revisao`). */
export type OrigemDaRevisao = Fonte;

const campo = frontmatterSchema.shape;

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
  | "falha";

export type Recusa = {
  readonly ok: false;
  readonly erro: ErroDoPainel;
  readonly mensagem: string;
  /** Só em `campos_invalidos`: um problema por linha, como o validador do squad. */
  readonly problemas?: readonly string[];
  /** Só em `campos_invalidos`: a mensagem de cada campo, para marcar o formulário. */
  readonly errosDosCampos?: ErrosDosCampos;
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
