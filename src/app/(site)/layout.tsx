import { Suspense, type ReactNode } from "react";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";

/**
 * Cabeçalho e rodapé do portal público. O grupo `(site)` não muda nenhuma URL: ele existe
 * para o `/admin` (história 16) ter o próprio topo e o próprio rodapé, sem o cabeçalho
 * público. O HTML das páginas públicas é o mesmo de antes (skip link, header, main,
 * footer), e as referências visuais da v1 não mudam.
 */
export default function LayoutDoSite({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      {/*
       * Com o conteúdo em cache, a página inteira entra no shell estático e este
       * <Suspense> não muda nada. Ele vale quando o banco está fora do ar no build: a
       * leitura que falha tem vida zero e fica fora do prerender (leitura-protegida.ts,
       * U11). A página vira dinâmica e o build passa, com cabeçalho e rodapé estáticos
       * (ADR 0008, §7). Sem ele, o Next recusa o build ("uncached data outside of
       * <Suspense>").
       */}
      <Suspense>{children}</Suspense>
      <SiteFooter />
    </>
  );
}
