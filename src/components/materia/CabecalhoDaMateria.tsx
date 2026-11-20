import Link from "next/link";
import type { Article } from "@/lib/content";
import { formatarData } from "@/lib/datas";
import { hrefDaEditoria } from "@/lib/editorias";
import { SeloExemplo } from "./SeloExemplo";
import styles from "./CabecalhoDaMateria.module.css";

type Props = { artigo: Article };

/** Topo da matéria na faixa noturna: chapéu, título (h1), linha fina e ficha. */
export function CabecalhoDaMateria({ artigo }: Props) {
  return (
    <header className={styles.topo}>
      <div className="wrap">
        <p className={`label ${styles.chapeu}`}>
          <Link
            className={styles.editoria}
            href={hrefDaEditoria(artigo.editoria.slug)}
          >
            {artigo.editoria.rotulo}
          </Link>
          {artigo.ficticio && <SeloExemplo />}
        </p>
        <h1 className={styles.titulo}>{artigo.titulo}</h1>
        <div className={styles.linha}>
          <p className={styles.linhaFina}>{artigo.linha_fina}</p>
          <dl className={`label ${styles.ficha}`}>
            <dt>Por</dt>
            <dd>{artigo.autor}</dd>
            <dt>Data</dt>
            <dd className="mono">
              <time dateTime={artigo.publicado_em}>
                {formatarData(artigo.publicado_em)}
              </time>
            </dd>
            <dt>Leitura</dt>
            <dd className="mono">{artigo.tempo_de_leitura} min de leitura</dd>
          </dl>
        </div>
      </div>
    </header>
  );
}
