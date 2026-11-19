import Link from "next/link";
import { NOME_DO_PORTAL, SLOGAN } from "@/lib/site";
import { EditoriasNav } from "./EditoriasNav";
import styles from "./SiteHeader.module.css";

export type SiteHeaderProps = {
  /**
   * Data da edição (`publicado_em` da matéria mais recente). Entra na história 4, com
   * `formatarEdicao`. Nesta história o layout não a passa e a linha de cima mostra só o slogan.
   */
  edicao?: Date;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- `edicao` é contrato da história 4.
export function SiteHeader(props: SiteHeaderProps) {
  return (
    <header className={styles.cabecalho}>
      <div className="wrap">
        <p className={`label ${styles.linha}`}>
          <span>{SLOGAN}</span>
        </p>
        <div className={styles.principal}>
          <Link
            className={styles.wordmark}
            href="/"
            aria-label={`${NOME_DO_PORTAL}, página inicial`}
          >
            Zona<i>Mista</i>
          </Link>
          <p className={`label ${styles.slogan}`}>
            Análise, crônica e reportagem
            <br />
            apuradas pelo squad-fut
          </p>
        </div>
      </div>
      <EditoriasNav rotulo="Editorias" variante="cabecalho" />
    </header>
  );
}
