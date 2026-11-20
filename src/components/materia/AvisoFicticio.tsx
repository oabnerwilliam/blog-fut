import styles from "./AvisoFicticio.module.css";

/** Faixa de aviso das matérias fictícias, antes do corpo (tokens.md §5.5). */
export function AvisoFicticio() {
  return (
    <div className={styles.aviso} role="note">
      <span className={`label ${styles.rotulo}`}>◇ Aviso</span>
      <p className={styles.frase}>
        <strong>Conteúdo fictício de demonstração.</strong> Clubes, pessoas e
        fatos desta matéria foram inventados para mostrar o layout do portal.
      </p>
    </div>
  );
}
