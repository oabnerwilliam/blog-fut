/** Carimbo "◇ Exemplo" das matérias fictícias (tokens.md §5.4). O losango vem do ::before. */
export function SeloExemplo({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-[0.35em] rounded-(--radius) bg-badge-bg px-[0.5em] pt-[0.34em] pb-[0.3em] font-mono text-label leading-none font-semibold tracking-[0.08em] text-badge-ink uppercase before:text-[0.95em] before:leading-none before:content-['◇'] ${className}`}
    >
      Exemplo
    </span>
  );
}
