"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { EDITORIAS, hrefDaEditoria } from "@/lib/editorias";

type Props = {
  classeDaLista: string;
  classeDoLink: string;
  /** Marca com `aria-current="page"` o link da editoria aberta (só no cabeçalho). */
  marcarAtual: boolean;
};

/**
 * A lista de links das editorias. É componente cliente só por causa do `usePathname`, que
 * diz qual editoria está aberta; o resto da nav continua no servidor.
 *
 * Sem `<Suspense>`: com Cache Components, o `usePathname` só suspende quando um segmento
 * dinâmico não está no `generateStaticParams` (doc do `usePathname`, "Behavior > Cache
 * Components"). Aqui todo caminho é conhecido no prerender: as rotas sem params (a capa, a
 * `/busca` e a `_not-found`) têm o caminho fixo, e as dinâmicas (matéria, editoria e tag)
 * listam os seus params. Uma rota nova com param fora do `generateStaticParams` quebraria o
 * build e pediria o `<Suspense>`.
 */
export function LinksDeEditorias({
  classeDaLista,
  classeDoLink,
  marcarAtual,
}: Props) {
  const caminho = usePathname();
  return (
    <ul className={classeDaLista}>
      {EDITORIAS.map(({ slug, rotulo }) => {
        const href = hrefDaEditoria(slug);
        return (
          <li key={slug}>
            <Link
              aria-current={
                marcarAtual && caminho === href ? "page" : undefined
              }
              className={classeDoLink}
              href={href}
            >
              {rotulo}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
