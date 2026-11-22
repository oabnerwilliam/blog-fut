import type { Metadata } from "next";
import Link from "next/link";
import { CHAPEU, LINHA_FINA, LINK, TITULO } from "@/components/admin/classes";

export const metadata: Metadata = { title: "Painel" };

/**
 * Painel (história 16, critério 4). A história 17 acrescentou a lista de matérias.
 * Só aparece para quem está aprovado: o layout do grupo `(painel)` confere antes.
 */
export default function Painel() {
  return (
    <main id="conteudo" tabIndex={-1}>
      <div className="wrap pt-(--space-section)">
        <p className={CHAPEU}>Admin</p>
        <h1 className={TITULO}>Painel</h1>
        <p className={LINHA_FINA}>
          Daqui a redação revisa e publica as matérias do squad-fut e decide
          quem pode entrar.
        </p>
        <ul className="mt-8 grid gap-3">
          <li>
            <Link className={LINK} href="/admin/materias">
              Ver as matérias
            </Link>
          </li>
          <li>
            <Link className={LINK} href="/admin/acessos">
              Ver os pedidos de acesso
            </Link>
          </li>
        </ul>
      </div>
    </main>
  );
}
