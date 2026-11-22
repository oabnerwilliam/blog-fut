/**
 * Regras puras das telas do painel de matérias (história 17, critério 4; README de
 * docs/design/17-painel). Sem `server-only`: o formulário de edição (cliente) usa
 * `camposDoFormulario` e `sugerirSlug`.
 */
import { SLUG_REGEX } from "@/lib/content/schema";
import { isEditoria, rotuloDaEditoria, type Editoria } from "@/lib/editorias";
import type {
  CamposDaRevisao,
  CamposEditoriaisDeEntrada,
  FiltrosDoPainel,
  Fonte,
  HistoricoDaMateria,
  MateriaDoPainel,
  NomeDoCampo,
  ResumoDaMateria,
  RevisaoResumida,
} from "./tipos";

// ---------------------------------------------------------------------------
// Rótulos
// ---------------------------------------------------------------------------

const FONTES: Record<Fonte, string> = {
  squad: "do squad",
  painel: "painel",
  importacao: "importação",
};

/** "do squad", "painel" ou "importação" (a fonte da matéria e a origem da revisão). */
export function rotuloDaFonte(fonte: Fonte): string {
  return FONTES[fonte];
}

/** Os rótulos dos campos, como no formulário. */
export const ROTULOS_DOS_CAMPOS: Readonly<Record<NomeDoCampo, string>> = {
  titulo: "Título",
  titulo_seo: "Título para buscadores",
  linha_fina: "Linha fina",
  editoria: "Editoria",
  tags: "Tags",
  meta_description: "Descrição para buscadores",
  palavras_chave: "Palavras-chave",
  autor: "Autor",
  ficticio: "Conteúdo fictício",
  corpo_md: "Corpo",
};

/** O `id` de cada campo no formulário: os links do bloco de erro levam até ele. */
export const IDS_DOS_CAMPOS: Readonly<Record<NomeDoCampo, string>> = {
  titulo: "c-titulo",
  titulo_seo: "c-seo",
  linha_fina: "c-fina",
  editoria: "c-editoria",
  tags: "c-tag",
  meta_description: "c-meta",
  palavras_chave: "c-chaves",
  autor: "c-autor",
  ficticio: "c-ficticio",
  corpo_md: "c-corpo",
};

/** "não pode ficar vazio" → "Não pode ficar vazio." */
export function frase(mensagem: string): string {
  const texto = mensagem.trim();
  if (texto === "") return texto;
  const comPonto = /[.!?]$/.test(texto) ? texto : `${texto}.`;
  return comPonto[0].toLocaleUpperCase("pt-BR") + comPonto.slice(1);
}

// ---------------------------------------------------------------------------
// Formulário de edição
// ---------------------------------------------------------------------------

/** Campo opcional vazio (ou só espaço) vira `null`; o resto vai como foi digitado. */
function opcional(valor: FormDataEntryValue | null): string | null {
  if (typeof valor !== "string" || valor.trim() === "") return null;
  return valor;
}

function texto(valor: FormDataEntryValue | null): string {
  return typeof valor === "string" ? valor : "";
}

/**
 * O formulário vira os campos da action. As tags vêm do estado do componente (a lista com
 * os botões de remover), não do formulário. Palavras-chave: uma por linha, sem as linhas
 * vazias. Quem valida é o servidor.
 */
export function camposDoFormulario(
  formulario: FormData,
  tags: readonly string[],
): CamposEditoriaisDeEntrada {
  const palavras = texto(formulario.get("palavras_chave"))
    .split(/\r\n?|\n/)
    .map((p) => p.trim())
    .filter((p) => p !== "");
  return {
    titulo: texto(formulario.get("titulo")),
    titulo_seo: opcional(formulario.get("titulo_seo")),
    linha_fina: texto(formulario.get("linha_fina")),
    editoria: texto(formulario.get("editoria")) as Editoria,
    tags: [...tags],
    meta_description: opcional(formulario.get("meta_description")),
    palavras_chave: palavras,
    autor: texto(formulario.get("autor")),
    ficticio: formulario.get("ficticio") === "on",
    corpo_md: texto(formulario.get("corpo_md")),
  };
}

/** "Luis Enrique 2" → "luis-enrique-2": a sugestão da mensagem de tag inválida. */
export function sugerirSlug(entrada: string): string {
  return entrada
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export type TagNova =
  | { readonly ok: true; readonly slug: string }
  | { readonly ok: false; readonly mensagem: string };

/** Confere a tag digitada antes de pôr na lista. Repetida não entra, sem erro. */
export function conferirTagNova(
  entrada: string,
  atuais: readonly string[],
): TagNova | null {
  const slug = entrada.trim();
  if (slug === "") return null;
  if (!SLUG_REGEX.test(slug)) {
    const sugestao = sugerirSlug(slug);
    return {
      ok: false,
      mensagem: sugestao
        ? `“${slug}” não é um slug. Use letras minúsculas, números e hífen: ${sugestao}.`
        : `“${slug}” não é um slug. Use letras minúsculas, números e hífen.`,
    };
  }
  if (atuais.includes(slug)) return null;
  return { ok: true, slug };
}

// ---------------------------------------------------------------------------
// Lista
// ---------------------------------------------------------------------------

const STATUS = new Set(["rascunho", "publicado"]);
const FONTES_VALIDAS = new Set(Object.keys(FONTES));

function primeiro(valor: string | string[] | undefined): string | undefined {
  return Array.isArray(valor) ? valor[0] : valor;
}

/** Os filtros da URL. Valor desconhecido (ou vazio, o "Todos") é ignorado. */
export function lerFiltros(
  busca: Readonly<Record<string, string | string[] | undefined>>,
): FiltrosDoPainel {
  const filtros: {
    -readonly [K in keyof FiltrosDoPainel]: FiltrosDoPainel[K];
  } = {};
  const status = primeiro(busca.status);
  if (status && STATUS.has(status)) {
    filtros.status = status as FiltrosDoPainel["status"];
  }
  const editoria = primeiro(busca.editoria);
  if (editoria && isEditoria(editoria)) filtros.editoria = editoria;
  const fonte = primeiro(busca.fonte);
  if (fonte && FONTES_VALIDAS.has(fonte)) filtros.fonte = fonte as Fonte;
  return filtros;
}

export function temFiltro(filtros: FiltrosDoPainel): boolean {
  return Object.keys(filtros).length > 0;
}

export function filtrarMaterias(
  materias: readonly MateriaDoPainel[],
  filtros: FiltrosDoPainel,
): MateriaDoPainel[] {
  return materias.filter(
    (m) =>
      (!filtros.status || m.status === filtros.status) &&
      (!filtros.editoria || m.editoria === filtros.editoria) &&
      (!filtros.fonte || m.fonte === filtros.fonte),
  );
}

/** "rascunho · Perfil · painel": os filtros usados, na contagem do estado vazio. */
export function descreverFiltros(filtros: FiltrosDoPainel): string {
  return [
    filtros.status,
    filtros.editoria && rotuloDaEditoria(filtros.editoria),
    filtros.fonte && rotuloDaFonte(filtros.fonte),
  ]
    .filter(Boolean)
    .join(" · ");
}

export interface ResumoDaLista {
  readonly total: number;
  readonly publicadas: number;
  readonly rascunhos: number;
  readonly comAlteracoes: number;
}

export function resumirLista(
  materias: readonly MateriaDoPainel[],
): ResumoDaLista {
  return {
    total: materias.length,
    publicadas: materias.filter((m) => m.status === "publicado").length,
    rascunhos: materias.filter((m) => m.status === "rascunho").length,
    comAlteracoes: materias.filter((m) => m.alteracoesNaoPublicadas).length,
  };
}

/** "1 matéria", "9 matérias": o plural das contagens. */
export function plural(n: number, singular: string, pluralDe: string): string {
  return n === 1 ? singular : pluralDe;
}

// ---------------------------------------------------------------------------
// Estado da publicação (edição e histórico)
// ---------------------------------------------------------------------------

/** A revisão que o leitor vê agora; nula quando a matéria não está no site. */
export function revisaoNoSite(materia: ResumoDaMateria): number | null {
  return materia.status === "publicado" ? materia.revisaoPublicada : null;
}

/** Há algo para publicar: um rascunho, ou uma revisão salva depois da que está no site. */
export function temAlgoParaPublicar(materia: ResumoDaMateria): boolean {
  return (
    materia.status === "rascunho" ||
    materia.revisaoEmEdicao !== materia.revisaoPublicada
  );
}

export type Marcador = "em-edicao" | "publicada" | "texto-do-squad";

/**
 * Os marcadores de uma revisão no histórico (README, "Marcadores sem fundo"):
 * - "● Publicada" (contínuo): a que o site mostra agora;
 * - "◐ Em edição" (tracejado): a em edição, quando ela ainda não está no site;
 * - "◇ Texto do squad": a revisão 1 de uma matéria do squad.
 */
export function marcadoresDaRevisao(
  revisao: Pick<RevisaoResumida, "numero" | "origem">,
  materia: ResumoDaMateria,
): Marcador[] {
  const marcadores: Marcador[] = [];
  const noSite = revisaoNoSite(materia);
  if (revisao.numero === materia.revisaoEmEdicao && revisao.numero !== noSite) {
    marcadores.push("em-edicao");
  }
  if (revisao.numero === noSite) marcadores.push("publicada");
  if (revisao.numero === 1 && revisao.origem === "squad") {
    marcadores.push("texto-do-squad");
  }
  return marcadores;
}

// ---------------------------------------------------------------------------
// Histórico: o que a URL pede
// ---------------------------------------------------------------------------

export type VisaoDoHistorico =
  | { readonly tipo: "revisao"; readonly numero: number }
  | { readonly tipo: "comparar"; readonly de: number; readonly para: number };

function numeroDa(valor: string | string[] | undefined): number | null {
  const texto = primeiro(valor);
  if (texto === undefined || !/^\d{1,9}$/.test(texto)) return null;
  return Number(texto);
}

/**
 * `?ver=N` abre uma revisão; `?de=A&para=B` compara duas. Sem nada (ou com um número que
 * não existe), compara a do site com a em edição; se forem a mesma, a anterior com a em
 * edição; com uma revisão só, abre ela.
 */
export function escolherVisao(
  historico: Pick<HistoricoDaMateria, "revisoes"> & ResumoDaMateria,
  busca: Readonly<Record<string, string | string[] | undefined>>,
): VisaoDoHistorico {
  const existe = new Set(historico.revisoes.map((r) => r.numero));
  const ver = numeroDa(busca.ver);
  if (ver !== null && existe.has(ver)) return { tipo: "revisao", numero: ver };
  const de = numeroDa(busca.de);
  const para = numeroDa(busca.para);
  if (de !== null && para !== null && existe.has(de) && existe.has(para)) {
    return { tipo: "comparar", de, para };
  }
  const emEdicao = historico.revisaoEmEdicao;
  const noSite = revisaoNoSite(historico);
  if (noSite !== null && noSite !== emEdicao && existe.has(noSite)) {
    return { tipo: "comparar", de: noSite, para: emEdicao };
  }
  const anterior = historico.revisoes.find((r) => r.numero < emEdicao);
  if (anterior)
    return { tipo: "comparar", de: anterior.numero, para: emEdicao };
  return { tipo: "revisao", numero: emEdicao };
}

// ---------------------------------------------------------------------------
// Comparação dos campos
// ---------------------------------------------------------------------------

type CampoSemCorpo = Exclude<NomeDoCampo, "corpo_md">;

const CAMPOS_COMPARADOS: readonly CampoSemCorpo[] = [
  "titulo",
  "titulo_seo",
  "linha_fina",
  "editoria",
  "tags",
  "meta_description",
  "palavras_chave",
  "autor",
  "ficticio",
];

/** O valor de um campo como texto da tela. Vazio é "(vazio)". */
export function valorDoCampo(
  campo: CampoSemCorpo,
  campos: CamposDaRevisao,
): string {
  const valor = campos[campo];
  if (campo === "ficticio") return valor ? "Sim" : "Não";
  if (campo === "editoria") {
    return isEditoria(String(valor)) ? rotuloDaEditoria(valor as Editoria) : "";
  }
  if (Array.isArray(valor)) return valor.length ? valor.join(" · ") : "(vazio)";
  return typeof valor === "string" && valor !== "" ? valor : "(vazio)";
}

export interface CampoAlterado {
  readonly campo: CampoSemCorpo;
  readonly rotulo: string;
  readonly antes: string;
  readonly depois: string;
}

/** Os campos (fora o corpo) que mudaram de uma revisão para a outra. */
export function camposAlterados(
  de: CamposDaRevisao,
  para: CamposDaRevisao,
): CampoAlterado[] {
  return CAMPOS_COMPARADOS.flatMap((campo) => {
    const antes = valorDoCampo(campo, de);
    const depois = valorDoCampo(campo, para);
    return antes === depois
      ? []
      : [{ campo, rotulo: ROTULOS_DOS_CAMPOS[campo], antes, depois }];
  });
}

/** A ficha da revisão aberta: todos os campos, fora o corpo, com o valor da tela. */
export function fichaDaRevisao(
  campos: CamposDaRevisao,
): { rotulo: string; valor: string; mono: boolean }[] {
  return CAMPOS_COMPARADOS.map((campo) => ({
    rotulo:
      campo === "titulo_seo"
        ? "Título p/ buscadores"
        : campo === "meta_description"
          ? "Descrição p/ buscadores"
          : campo === "ficticio"
            ? "Fictício"
            : ROTULOS_DOS_CAMPOS[campo],
    valor: valorDoCampo(campo, campos),
    mono: campo === "tags",
  }));
}
