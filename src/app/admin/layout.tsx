import type { Metadata } from "next";
import type { ReactNode } from "react";
import { RodapeDoAdmin } from "@/components/admin/RodapeDoAdmin";
import { NOME_DO_PORTAL } from "@/lib/site";

/**
 * Layout de todo o `/admin` (história 16; critério 6). Leva `noindex, nofollow` e o
 * rodapé do admin. O `/admin` não entra no sitemap (que só lista matérias e listagens) e
 * nenhuma página pública tem link para ele.
 *
 * Com `ADMIN_HABILITADO` desligado, o Proxy responde 404 antes de chegar aqui (U14).
 *
 * A sessão não é lida neste layout, porque `/admin/entrar` também está embaixo dele. Quem
 * confere a sessão e o status é o layout do grupo `(painel)`, dentro de um `<Suspense>`
 * (guia `authentication-with-cache-components.md`, passo 2).
 */
export const metadata: Metadata = {
  title: {
    default: `Admin · ${NOME_DO_PORTAL}`,
    template: `%s · Admin · ${NOME_DO_PORTAL}`,
  },
  robots: { index: false, follow: false },
};

export default function LayoutDoAdmin({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <RodapeDoAdmin />
    </>
  );
}
