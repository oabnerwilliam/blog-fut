import styles from "./SeloExemplo.module.css";

/** Carimbo "◇ Exemplo" das matérias fictícias (tokens.md §5.4). O losango vem do CSS. */
export function SeloExemplo() {
  return <span className={styles.selo}>Exemplo</span>;
}
