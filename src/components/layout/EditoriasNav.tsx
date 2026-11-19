import Link from "next/link";
import { EDITORIAS, hrefDaEditoria } from "@/lib/editorias";
import styles from "./EditoriasNav.module.css";

type Props = {
  /** Rótulo acessível da <nav>. */
  rotulo: string;
  variante: "cabecalho" | "rodape";
};

/** Os 7 links de editoria, na ordem da lista fechada. A numeração 01–07 do cabeçalho é só CSS. */
export function EditoriasNav({ rotulo, variante }: Props) {
  return (
    <nav aria-label={rotulo} className={styles[variante]}>
      <ul className={styles.lista}>
        {EDITORIAS.map(({ slug, rotulo: nome }) => (
          <li key={slug} className={styles.item}>
            <Link className={styles.link} href={hrefDaEditoria(slug)}>
              {nome}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
