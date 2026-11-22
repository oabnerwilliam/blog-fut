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
