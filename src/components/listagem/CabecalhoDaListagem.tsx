import { rotuloDaContagem, type Listagem } from "@/lib/listagens";

type Props = { listagem: Listagem };

/**
 * Topo da página de uma editoria ou tag: chapéu ("Editoria"/"Tag"), o único h1 da página
 * com o rótulo e, no fio de baixo (como nos títulos de seção da capa), a contagem total.
 */
export function CabecalhoDaListagem({ listagem }: Props) {
  return (
    <header className="pt-(--space-section)">
      <p className="label text-accent">
        {listagem.tipo === "editoria" ? "Editoria" : "Tag"}
      </p>
      <div className="mt-[1.1rem] mb-6 flex flex-wrap items-baseline gap-x-[0.9rem] gap-y-2 after:order-1 after:h-(--rule-width) after:min-w-8 after:flex-1 after:self-center after:bg-rule-strong after:content-['']">
        <h1 className="max-w-[18ch] font-display text-h1 leading-[0.93] font-normal tracking-[-0.03em]">
          {listagem.rotulo}
        </h1>
        <p className="label mono order-2 text-ink-muted">
          {rotuloDaContagem(listagem.total)}
        </p>
      </div>
    </header>
  );
}
