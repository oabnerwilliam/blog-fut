import styles from "./SkipLink.module.css";

/** Primeiro filho do <body>. Leva ao <main id="conteudo" tabIndex={-1}> de cada página. */
export function SkipLink() {
  return (
    <a className={styles.pular} href="#conteudo">
      Pular para o conteúdo
    </a>
  );
}
