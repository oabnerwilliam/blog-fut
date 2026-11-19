import Link from "next/link";
import { NOME_DO_PORTAL, SLOGAN, SLOGAN_LONGO } from "@/lib/site";
import { EditoriasNav } from "./EditoriasNav";
import styles from "./SiteHeader.module.css";

export type SiteHeaderProps = {
  /**
   * Data da edição (`publicado_em` da matéria mais recente). Entra na história 4, com
   * `formatarEdicao`. Nesta história o layout não a passa e a linha de cima mostra só o slogan.
   */
  edicao?: Date;
};

// `edicao` é contrato da história 4; por ora o parâmetro é recebido e ignorado.
export function SiteHeader(_: SiteHeaderProps) {
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
            {SLOGAN_LONGO[0]}
            <br />
            {SLOGAN_LONGO[1]}
          </p>
        </div>
      </div>
      <EditoriasNav rotulo="Editorias" variante="cabecalho" />
    </header>
  );
}
