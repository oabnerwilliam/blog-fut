import type { Metadata } from "next";
import "@/styles/tokens.css";
import "./globals.css";
import { SkipLink } from "@/components/layout/SkipLink";
import { DESCRICAO_DO_PORTAL, NOME_DO_PORTAL, SITE_URL } from "@/lib/site";
import { SCRIPT_DO_TEMA } from "@/lib/tema";
import { classesDeFonte } from "./fonts";

export const metadata: Metadata = {
  metadataBase: SITE_URL,
  title: NOME_DO_PORTAL,
  description: DESCRICAO_DO_PORTAL,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // O script do tema põe data-theme e data-js no <html> antes de o React hidratar; por isso
    // o suppressHydrationWarning (só vale para os atributos do próprio <html>).
    <html lang="pt-BR" className={classesDeFonte} suppressHydrationWarning>
      <head>
        {/*
         * <script> comum, inline e síncrono, e não next/script: o `beforeInteractive` não
         * bloqueia (a doc do Next 16 diz que ele não segura a hidratação, e o inline vira uma
         * fila executada pelo runtime), então o primeiro paint sairia no tema do sistema. Um
         * <script> no <head> roda durante o parse, antes de o <body> existir, logo antes do
         * primeiro paint (o React sobe o <link> do CSS para o topo do <head>, mas o CSS também
         * bloqueia o paint). É estático: a página continua pré-renderizada.
         */}
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_DO_TEMA }} />
      </head>
      <body>
        <SkipLink />
        {/*
         * O cabeçalho e o rodapé ficam no layout de cada área: `(site)/layout.tsx` no
         * portal e `admin/layout.tsx` no admin (história 16). A 404 raiz monta os do portal.
         */}
        {children}
      </body>
    </html>
  );
}
