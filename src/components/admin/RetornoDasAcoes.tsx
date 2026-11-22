"use client";

import { createContext, use, useState, type ReactNode } from "react";

const Contexto = createContext<((mensagem: string) => void) | null>(null);

/**
 * Retorno das ações de `/admin/acessos` (README do design: "uma região role=status que
 * fica sempre no DOM e é preenchida depois da action"). A região existe desde o primeiro
 * HTML, vazia: um leitor de tela só anuncia mudanças numa região que já estava lá.
 */
export function RetornoDasAcoes({ children }: { children: ReactNode }) {
  const [mensagem, setMensagem] = useState("");
  return (
    <Contexto value={setMensagem}>
      <div
        className="max-w-(--layout-measure) font-text text-[1rem] leading-[1.45]"
        role="status"
      >
        {mensagem && (
          <p className="mt-5 border-l-(length:--rule-width-strong) border-accent py-[0.55rem] pl-4">
            {mensagem}
          </p>
        )}
      </div>
      {children}
    </Contexto>
  );
}

export function useAvisar(): (mensagem: string) => void {
  const avisar = use(Contexto);
  if (!avisar) throw new Error("useAvisar fora de <RetornoDasAcoes>");
  return avisar;
}
