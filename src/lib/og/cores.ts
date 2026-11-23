/**
 * Cores da prévia do link (T02, direção A · Faixa noturna). O `ImageResponse` não lê CSS,
 * por isso os valores são literais aqui, e só aqui: cada um é a cópia de um token de
 * `src/styles/tokens.css`, conferida por `tests/unit/og/cores.test.ts`.
 */
export const CORES_DA_PREVIA = {
  /** `--color-night` (claro): fundo da faixa noturna. */
  noite: "#0E1120",
  /** `--color-night` (escuro): o refletor do gradiente, no canto superior direito. */
  noiteClara: "#1A2142",
  /** `--color-night-ink`: título e wordmark. */
  marfim: "#ECEBE5",
  /** `--color-night-ink-muted`: número da editoria, slogan e data. */
  cinza: "#A3A7B6",
  /** `--color-amber`: editoria, traço, losango e fundo do selo. */
  ambar: "#FFB000",
  /** `--color-night-rule`: filetes de 1 px. */
  filete: "#2C3148",
  /** `--color-badge-ink`: texto do selo "Exemplo". */
  tintaDoSelo: "#16181D",
} as const;
