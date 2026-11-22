"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Itens da nav do admin (a 17 acrescentou "Matérias", e a 18, "Nova matéria"). */
const ITENS = [
  { href: "/admin", rotulo: "Painel" },
  { href: "/admin/materias", rotulo: "Matérias" },
  { href: "/admin/materias/nova", rotulo: "Nova matéria" },
  { href: "/admin/acessos", rotulo: "Acessos" },
] as const;

function estaDentro(caminho: string, href: string): boolean {
  return caminho === href || caminho.startsWith(`${href}/`);
}

/**
 * `page` no próprio item; `true` nas páginas de dentro dele (a edição e o histórico de
 * uma matéria continuam em "Matérias"), com o mesmo visual (README de 17-painel). Quando
 * um item mais específico também contém o caminho ("Nova matéria" está dentro de
 * `/admin/materias`), só ele fica marcado (README de 18-editor, "Nav").
 */
export function atualDaNav(
  caminho: string,
  href: string,
): "page" | "true" | undefined {
  if (caminho === href) return "page";
  if (href === "/admin" || !caminho.startsWith(`${href}/`)) return undefined;
  const outroMaisEspecifico = ITENS.some(
    (item) =>
      item.href !== href &&
      item.href.startsWith(`${href}/`) &&
      estaDentro(caminho, item.href),
  );
  return outroMaisEspecifico ? undefined : "true";
}

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
              aria-current={atualDaNav(caminho, href)}
              className="inline-flex min-h-(--tap-min) items-center font-text text-nav leading-none font-medium [font-stretch:92%] hover:text-accent focus-visible:outline-offset-0 aria-[current=page]:text-accent aria-[current=page]:underline aria-[current=page]:decoration-(length:--rule-width-strong) aria-[current=page]:underline-offset-[0.35em] aria-[current=true]:text-accent aria-[current=true]:underline aria-[current=true]:decoration-(length:--rule-width-strong) aria-[current=true]:underline-offset-[0.35em]"
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
