"use client";

import { useSyncExternalStore } from "react";
import {
  aplicarTema,
  guardarTema,
  nomeDoBotaoDeTema,
  proximoTema,
  temaDoAtributo,
  type Tema,
} from "@/lib/tema";

/**
 * Botão de tema (história 07; docs/design/07-modo-escuro/notas.md §3). Alterna em ciclo
 * sistema → claro → escuro e guarda a escolha.
 *
 * O texto visível e o losango NÃO vêm do estado do React: saem do `data-theme` do `<html>`
 * por CSS (os três rótulos ficam empilhados e só o atual aparece). O servidor não sabe o tema
 * guardado, e assim nada troca na hidratação. Só o `aria-label` vem do React.
 */

/** O tema atual é o atributo do `<html>`; avisa o React quando ele muda. */
function assinar(aviso: () => void): () => void {
  const observador = new MutationObserver(aviso);
  observador.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observador.disconnect();
}

const temaNoHtml = (): Tema =>
  temaDoAtributo(document.documentElement.getAttribute("data-theme"));

/** No servidor e na hidratação, "sistema" (o mesmo HTML); logo depois, o valor real do `<html>`. */
const temaNoServidor = (): Tema => "sistema";

/** O próprio acesso a `window.localStorage` lança com o storage bloqueado. */
function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Rótulo empilhado: invisível, a não ser quando o `<html>` está no tema dele. */
const ROTULO = "col-start-1 row-start-1 invisible";

export function BotaoDeTema() {
  const tema = useSyncExternalStore(assinar, temaNoHtml, temaNoServidor);

  function alternar() {
    const proximo = proximoTema(temaNoHtml());
    aplicarTema(document.documentElement, proximo);
    guardarTema(storage(), proximo);
  }

  return (
    <button
      aria-label={nomeDoBotaoDeTema(tema)}
      className="group label relative -my-2 -mr-2 ml-auto inline-flex min-h-(--tap-min) min-w-(--tap-min) shrink-0 cursor-pointer items-center gap-[0.5em] rounded-none border-0 bg-transparent px-2 whitespace-nowrap text-ink-muted hover:text-accent focus-visible:outline-offset-0 [html:not([data-js])_&]:hidden"
      data-botao-de-tema=""
      onClick={alternar}
      type="button"
    >
      {/*
       * Losango: ◇ claro, ◆ escuro, metade cheia no sistema. Decorativo. A metade vazia é
       * --color-bg (o losango fica sempre sobre o papel): `transparent` sairia do build como
       * #0000, uma cor literal num utilitário arbitrário (css-do-build.spec.ts).
       */}
      <span
        aria-hidden="true"
        className="mx-[0.12em] size-[0.62em] flex-none rotate-45 border-(length:--rule-width) border-current text-ink group-hover:text-accent [html:not([data-theme])_&]:bg-[linear-gradient(to_top_right,currentColor_50%,var(--color-bg)_50%)] [html[data-theme=dark]_&]:bg-current"
      />
      <span>
        Tema:&nbsp;
        <span className="inline-grid justify-items-start font-semibold text-ink decoration-(length:--rule-width) underline-offset-[0.2em] group-hover:text-accent group-hover:underline">
          <span
            className={`${ROTULO} [html:not([data-theme])_&]:visible`}
            data-rotulo="sistema"
          >
            sistema
          </span>
          <span
            className={`${ROTULO} [html[data-theme=light]_&]:visible`}
            data-rotulo="light"
          >
            claro
          </span>
          <span
            className={`${ROTULO} [html[data-theme=dark]_&]:visible`}
            data-rotulo="dark"
          >
            escuro
          </span>
        </span>
      </span>
    </button>
  );
}
