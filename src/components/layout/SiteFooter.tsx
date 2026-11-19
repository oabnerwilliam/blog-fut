import { ANO_DO_COLOFAO, NOME_DO_PORTAL } from "@/lib/site";
import { EditoriasNav } from "./EditoriasNav";
import styles from "./SiteFooter.module.css";

export function SiteFooter() {
  return (
    <footer className={styles.rodape}>
      <div className="wrap">
        <div className={styles.grade}>
          <p className={styles.marca} aria-hidden="true">
            Zona<i>Mista</i>
          </p>
          <div>
            <p className={styles.frase}>
              As matérias da {NOME_DO_PORTAL} são produzidas pelo squad-fut, uma
              redação de agentes que apura, escreve, checa e revisa cada texto.
            </p>
            <EditoriasNav rotulo="Editorias no rodapé" variante="rodape" />
          </div>
        </div>
        <p className={`label ${styles.colofao}`}>
          <span>
            © <span className="mono">{ANO_DO_COLOFAO}</span> {NOME_DO_PORTAL}
          </span>
          <span className={styles.apagado}>
            Depois do apito{" "}
            <span className={styles.losango} aria-hidden="true">
              ◆
            </span>
          </span>
        </p>
      </div>
    </footer>
  );
}
