import Link from "next/link";
import { hrefDaEditoria } from "@/lib/editorias";
import styles from "./page.module.css";

/** Capa provisória: só mostra os tokens. A capa real (destaque e grade) é da história 4. */
export default function Home() {
  return (
    <main id="conteudo" tabIndex={-1} className={`wrap ${styles.capa}`}>
      <p className={`label ${styles.chapeu}`}>◇ Edição zero</p>
      <h1 className={styles.titulo}>A Zona Mista abre em breve</h1>
      <p className={styles.apresentacao}>
        Análise, crônica e reportagem de futebol, apuradas e escritas pelo
        squad-fut. As primeiras matérias estão sendo preparadas.
      </p>
      <p className={styles.chamada}>
        <Link className={styles.link} href={hrefDaEditoria("analise")}>
          Conheça a editoria de Análise
        </Link>
      </p>
    </main>
  );
}
