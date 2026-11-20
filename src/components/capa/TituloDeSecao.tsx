import type { ReactNode } from "react";

type Props = {
  id: string;
  children: ReactNode;
  /** Texto à direita do fio (contagem, "matérias publicadas", "Ver todas →"). */
  complemento: ReactNode;
};

/**
 * Cabeçalho de seção da capa (mockup: .sec): título em itálico, fio que ocupa o meio e um
 * rótulo à direita. O `id` liga o h2 ao `aria-labelledby` da seção.
 */
export function TituloDeSecao({ id, children, complemento }: Props) {
  return (
    <div className="mb-6 flex flex-wrap items-baseline gap-x-[0.9rem] gap-y-2 after:order-1 after:h-(--rule-width) after:min-w-8 after:flex-1 after:self-center after:bg-rule-strong after:content-['']">
      <h2
        className="font-display text-section leading-none font-normal tracking-[-0.015em] italic"
        id={id}
      >
        {children}
      </h2>
      <span className="label order-2 text-ink-muted">{complemento}</span>
    </div>
  );
}
