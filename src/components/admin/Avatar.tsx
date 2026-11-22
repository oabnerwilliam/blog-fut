"use client";

import { useState } from "react";

type Props = {
  /** A `avatar_url` do Google, ou nulo. */
  url: string | null;
  /** Iniciais para quando não há foto (ou ela não carrega). */
  iniciais: string;
  tamanho: "normal" | "pequeno";
  className?: string;
};

const TAMANHOS = {
  normal: { px: 40, caixa: "size-10", fonte: "text-[0.8125rem]" },
  pequeno: { px: 32, caixa: "size-8", fonte: "text-label" },
} as const;

/**
 * Avatar quadrado do admin (README do design, "Avatar"). O nome está sempre escrito ao
 * lado, então o avatar é decorativo: a foto leva `alt=""` e as iniciais, `aria-hidden`.
 *
 * É de cliente só para trocar a foto pelas iniciais quando ela não carrega (link do
 * Google vencido, por exemplo). `referrerPolicy="no-referrer"`: as fotos do Google podem
 * recusar requisições com o Referer de outro site.
 */
export function Avatar({ url, iniciais, tamanho, className = "" }: Props) {
  const [falhou, setFalhou] = useState(false);
  const { px, caixa, fonte } = TAMANHOS[tamanho];

  if (url && !falhou) {
    return (
      // A foto vem de um domínio do Google que muda; o next/image pediria cada host na config.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        className={`${caixa} flex-none object-cover ${className}`}
        src={url}
        alt=""
        width={px}
        height={px}
        referrerPolicy="no-referrer"
        onError={() => setFalhou(true)}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`inline-grid ${caixa} flex-none place-items-center bg-night font-mono ${fonte} leading-none font-semibold tracking-[0.04em] text-night-ink ${className}`}
    >
      {iniciais}
    </span>
  );
}
