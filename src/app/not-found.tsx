import Link from "next/link";
import styles from "./not-found.module.css";

/** 404 do portal: renderizada dentro do layout raiz (cabeçalho e rodapé). */
export default function NaoEncontrada() {
  return (
    <main id="conteudo" tabIndex={-1} className={`wrap ${styles.pagina}`}>
      <p className={`label ${styles.chapeu}`}>Erro 404</p>
      <h1 className={styles.titulo}>Página não encontrada</h1>
      <p className={styles.texto}>
        O endereço pode ter mudado ou a matéria não existe mais.
      </p>
      <p className={styles.chamada}>
        <Link className={styles.link} href="/">
          Voltar para a capa
        </Link>
      </p>
    </main>
  );
}
