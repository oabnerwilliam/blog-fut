import type { Metadata } from "next";
import Link from "next/link";
import { CHAPEU, LINHA_FINA, LINK, TITULO } from "@/components/admin/classes";

export const metadata: Metadata = { title: "Painel" };

/**
 * Painel provisório (história 16, critério 4). A lista de matérias chega na história 17.
 * Só aparece para quem está aprovado: o layout do grupo `(painel)` confere antes.
 */
export default function Painel() {
  return (
    <main id="conteudo" tabIndex={-1}>
      <div className="wrap pt-(--space-section)">
        <p className={CHAPEU}>Admin</p>
        <h1 className={TITULO}>Painel</h1>
        <p className={LINHA_FINA}>
          Daqui a redação vai revisar e publicar as matérias do squad-fut. Por
          enquanto, o painel cuida de quem pode entrar.
        </p>
        <p className="mt-8">
          <Link className={LINK} href="/admin/acessos">
            Ver os pedidos de acesso
          </Link>
        </p>
      </div>
    </main>
  );
}
