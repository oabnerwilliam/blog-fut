/** Faixa de aviso das matérias fictícias, antes do corpo (tokens.md §5.5). */
export function AvisoFicticio() {
  return (
    <div
      className="mt-5 mb-4 grid max-w-(--layout-measure) gap-x-5 gap-y-[0.35rem] rounded-(--radius) border-y-(length:--rule-width-strong) border-notice-ink bg-notice-bg px-4 py-[0.85rem] text-notice-ink sm:grid-cols-[7rem_1fr] sm:items-baseline"
      role="note"
    >
      <span className="label font-semibold">◇ Aviso</span>
      <p className="font-text text-[1rem] leading-[1.45] font-normal">
        <strong className="font-bold">
          Conteúdo fictício de demonstração.
        </strong>{" "}
        Clubes, pessoas e fatos desta matéria foram inventados para mostrar o
        layout do portal.
      </p>
    </div>
  );
}
