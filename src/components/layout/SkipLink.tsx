/**
 * Primeiro filho do <body>. Leva ao <main id="conteudo" tabIndex={-1}> de cada página.
 * Visual em tokens.md §5.1.
 *
 * No foco, o contorno usa a cor do texto principal, afastado do botão por um vão. O halo
 * (sombra na cor do fundo, da largura do offset) garante que esse vão seja sempre papel,
 * inclusive embaixo, onde o link sobrepõe o cabeçalho. Por isso o contraste do contorno é
 * medido contra --color-bg, e não contra o âmbar: nem o azul do foco nem a tinta teriam
 * contraste sobre ele em todos os temas (no escuro, ink sobre âmbar fica abaixo de 3:1).
 */
export function SkipLink() {
  return (
    <a
      className="absolute -top-[200px] left-(--layout-gutter) z-20 rounded-(--radius) bg-amber px-4 py-[0.85rem] font-mono text-[0.8125rem] leading-none font-semibold tracking-[0.06em] text-badge-ink uppercase focus:top-[0.75rem] focus-visible:shadow-[0_0_0_var(--focus-offset)_var(--color-bg)] focus-visible:outline-offset-(--focus-offset) focus-visible:outline-ink"
      href="#conteudo"
    >
      Pular para o conteúdo
    </a>
  );
}
