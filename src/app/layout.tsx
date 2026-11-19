import type { Metadata } from "next";
import "@/styles/tokens.css";
import "./globals.css";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SkipLink } from "@/components/layout/SkipLink";
import { DESCRICAO_DO_PORTAL, NOME_DO_PORTAL } from "@/lib/site";
import { classesDeFonte } from "./fonts";

export const metadata: Metadata = {
  title: NOME_DO_PORTAL,
  description: DESCRICAO_DO_PORTAL,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // Sem data-theme: o tema segue o sistema (a troca manual é da história 7).
    <html lang="pt-BR" className={classesDeFonte}>
      <body>
        <SkipLink />
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
