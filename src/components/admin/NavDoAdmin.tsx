"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Itens da nav do admin. A história 17 acrescenta "Matérias". */
const ITENS = [
  { href: "/admin", rotulo: "Painel" },
  { href: "/admin/acessos", rotulo: "Acessos" },
] as const;

/**
 * Nav do admin, só para quem está aprovado (README do design, "Nav do admin"). É de
 * cliente só para marcar o item atual: um layout não recebe o caminho. As rotas do admin
 * são dinâmicas e estão dentro do `<Suspense>` do porteiro, então o `usePathname` não
 * segura o prerender (doc `use-pathname.md`, "Cache Components").
 */
export function NavDoAdmin() {
  const caminho = usePathname();
  return (
    <nav
      aria-label="Admin"
      className="border-b-(length:--rule-width) border-rule"
    >
      <ul className="mx-auto flex max-w-(--layout-max) flex-wrap gap-x-6 px-(--layout-gutter) py-[0.2rem]">
        {ITENS.map(({ href, rotulo }) => (
          <li key={href}>
            <Link
              aria-current={caminho === href ? "page" : undefined}
              className="inline-flex min-h-(--tap-min) items-center font-text text-nav leading-none font-medium [font-stretch:92%] hover:text-accent focus-visible:outline-offset-0 aria-[current=page]:text-accent aria-[current=page]:underline aria-[current=page]:decoration-(length:--rule-width-strong) aria-[current=page]:underline-offset-[0.35em]"
              href={href}
            >
              {rotulo}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
