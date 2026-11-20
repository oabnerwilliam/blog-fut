import { rotuloDaContagem, type Listagem } from "@/lib/listagens";
import { FIO_DO_TOPO, TITULO_DO_TOPO } from "./classes";

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
      <div className={FIO_DO_TOPO}>
        <h1 className={TITULO_DO_TOPO}>{listagem.rotulo}</h1>
        <p className="label mono order-2 text-ink-muted">
          {rotuloDaContagem(listagem.total)}
        </p>
      </div>
    </header>
  );
}
