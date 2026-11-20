/**
 * Link esticado (mockup: `.feature a::after`): o ::after cobre o bloco inteiro, que precisa
 * ser `relative`, e clicar em qualquer ponto abre a matéria. O contorno de foco continua no
 * próprio link (o portal mostra o foco no elemento focado, como nos testes de teclado).
 */
export const LINK_ESTICADO = "after:absolute after:inset-0 after:content-['']";

/** O título ganha sublinhado quando o leitor passa o mouse em qualquer ponto do bloco (`group`). */
export const SUBLINHA_NO_HOVER =
  "group-hover:underline group-hover:decoration-1 group-hover:underline-offset-[0.12em]";
