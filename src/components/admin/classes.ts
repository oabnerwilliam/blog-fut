/**
 * Classes compartilhadas das telas do admin (história 16; README de
 * docs/design/16-login-admin). Só tokens: nenhuma cor nova.
 */

const BASE_DO_BOTAO =
  "inline-flex flex-none cursor-pointer items-center justify-center gap-[0.5em] rounded-none border-(length:--rule-width) font-mono leading-none font-semibold tracking-[0.08em] whitespace-nowrap uppercase disabled:cursor-progress";

/** Secundário (como o Buscar): filete, sem fundo. Recusar, Revogar, Reabrir e Sair. */
export const BOTAO_SECUNDARIO = `${BASE_DO_BOTAO} min-h-(--tap-min) px-[0.9rem] text-label border-rule-strong bg-transparent text-ink hover:border-accent hover:text-accent`;

/** Primário (cheio de tinta): Aceitar. No hover, o fundo vai para o acento. */
export const BOTAO_PRIMARIO = `${BASE_DO_BOTAO} min-h-(--tap-min) px-[0.9rem] text-label border-rule-strong bg-ink text-bg hover:border-accent hover:bg-accent`;

/** Primário grande: Entrar com Google. */
export const BOTAO_PRIMARIO_GRANDE = `${BASE_DO_BOTAO} min-h-12 px-[1.4rem] text-[0.8125rem] border-rule-strong bg-ink text-bg hover:border-accent hover:bg-accent`;

/** Textos das telas de acesso (mockup: .chapeu, .titulo, .fina e .texto). */
export const CHAPEU = "label text-accent";
export const TITULO =
  "mt-[0.6rem] max-w-[16ch] font-display text-feature leading-[0.98] font-normal tracking-[-0.025em]";
export const LINHA_FINA =
  "mt-4 max-w-[40ch] font-text text-dek leading-normal font-normal text-pretty";
export const TEXTO =
  "mt-4 font-text text-body leading-[1.6] text-pretty text-ink-muted [&_.mono]:text-ink [&_strong]:text-ink";
export const LINK =
  "text-accent underline decoration-(length:--rule-width) underline-offset-[0.2em] hover:decoration-(length:--rule-width-strong)";

/* ===== Painel de matérias (história 17; README de docs/design/17-painel) ===== */

/** Botão de frase ("Publicar alterações", "Restaurar a revisão 3"): quebra linha em 320px. */
const BASE_DO_BOTAO_DE_FRASE =
  "inline-flex max-w-full flex-none cursor-pointer items-center justify-center gap-[0.5em] rounded-none border-(length:--rule-width) border-rule-strong px-[0.9rem] py-[0.55rem] text-center font-mono text-label leading-[1.2] font-semibold tracking-[0.08em] uppercase disabled:cursor-progress min-h-(--tap-min)";
export const BOTAO_DE_FRASE = `${BASE_DO_BOTAO_DE_FRASE} bg-transparent text-ink hover:border-accent hover:text-accent`;
export const BOTAO_DE_FRASE_CHEIO = `${BASE_DO_BOTAO_DE_FRASE} bg-ink text-bg hover:border-accent hover:bg-accent`;

/** `h1` das telas de uma matéria: o título dela, em --text-section, sem itálico. */
export const TITULO_DA_MATERIA =
  "mt-[0.6rem] max-w-[30ch] font-display text-section leading-[1.02] font-normal tracking-[-0.02em]";

/** "Publicação", "Campos editoriais", "Revisões". */
export const TITULO_DE_BLOCO =
  "border-b-(length:--rule-width) border-rule-strong pb-[0.6rem] font-display text-row-title leading-[1.06] font-normal tracking-[-0.012em] italic";

export const ROTULO = "font-text text-[0.9375rem] leading-[1.3] font-semibold";
export const OPCIONAL = "font-normal text-ink-muted";
export const DICA = "font-text text-[0.875rem] leading-[1.45] text-ink-muted";
export const NOTA = "font-text text-[0.9375rem] leading-[1.5] text-ink-muted";

/** Campos: filete forte de 1px, raio 0, sem fundo, 44px. Inválido: filete de 2px. */
export const ENTRADA =
  "m-0 min-h-11 w-full rounded-none border-(length:--rule-width) border-rule-strong bg-transparent px-3 py-[0.55rem] font-text text-[1rem] leading-[1.45] text-ink placeholder:text-ink-muted focus-visible:outline-offset-0 aria-[invalid=true]:border-(length:--rule-width-strong) aria-[invalid=true]:px-[calc(0.75rem-1px)] aria-[invalid=true]:py-[calc(0.55rem-1px)]";

/** O `select` com a seta desenhada em `currentColor` (`.seta-do-select`, globals.css). */
export const SELECT = `${ENTRADA} seta-do-select cursor-pointer appearance-none pr-9`;

/** "✕ O título não pode ficar vazio." Nunca só cor. */
export const MENSAGEM_DE_ERRO =
  "flex gap-[0.45em] font-text text-[0.9375rem] leading-[1.4] font-semibold text-ink before:font-medium before:content-['✕']";

/** Um campo do formulário: rótulo em cima, entrada, dica e erro. */
export const CAMPO = "grid grid-cols-[minmax(0,1fr)] gap-[0.4rem]";

/** Bloco de erro (o mesmo do erro de entrar da 16): filetes de 2px, sem fundo. */
export const BLOCO_DE_ERRO =
  "grid gap-x-5 gap-y-[0.3rem] border-y-(length:--rule-width-strong) border-rule-strong py-[0.85rem] focus-visible:outline-offset-0 min-[40rem]:grid-cols-[7rem_1fr] min-[40rem]:items-baseline";

/** A ficha `<dl>` em linhas de súmula. */
export const FICHA = "border-y-(length:--rule-width) border-rule-strong";
export const LINHA_DA_FICHA =
  "grid grid-cols-[minmax(0,1fr)] gap-x-5 gap-y-[0.35rem] py-[0.9rem] not-first:border-t-(length:--rule-width) not-first:border-rule";
