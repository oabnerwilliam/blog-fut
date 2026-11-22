"use client";

import { useFormStatus } from "react-dom";
import type { ResultadoDaDecisao } from "@/lib/admin/decisoes";
import { BOTAO_PRIMARIO, BOTAO_SECUNDARIO } from "./classes";
import { useAvisar } from "./RetornoDasAcoes";

type Props = {
  /** A server action já ligada ao usuário da linha (`aceitar.bind(null, userId)`). */
  acao: () => Promise<ResultadoDaDecisao>;
  /** Texto visível: Aceitar, Recusar, Revogar ou Reabrir. */
  rotulo: string;
  /** Nome da pessoa, em `sr-only`: "Aceitar Joana Prado" (WCAG 2.5.3). */
  nome: string;
  /** O que a região de retorno diz quando a decisão foi gravada. */
  sucesso: string;
  primario?: boolean;
};

function Botao({ rotulo, nome, primario }: Omit<Props, "acao" | "sucesso">) {
  const { pending } = useFormStatus();
  return (
    <button
      className={primario ? BOTAO_PRIMARIO : BOTAO_SECUNDARIO}
      disabled={pending}
      type="submit"
    >
      {rotulo}
      <span className="sr-only"> {nome}</span>
    </button>
  );
}

/**
 * Um botão de decisão de `/admin/acessos`. A action confere tudo no servidor (sessão,
 * `eh_admin`, próprio usuário) e devolve o resultado; aqui só se mostra a mensagem. Com a
 * decisão gravada, a action chama `refresh()` e a pessoa muda de grupo na lista.
 */
export function BotaoDeDecisao({ acao, sucesso, ...botao }: Props) {
  const avisar = useAvisar();
  return (
    <form
      action={async () => {
        try {
          const resultado = await acao();
          avisar(resultado.ok ? sucesso : resultado.mensagem);
        } catch {
          // Rede caiu no meio do caminho: a action não chegou a responder.
          avisar(
            "Não foi possível gravar a decisão. Tente de novo em instantes.",
          );
        }
      }}
      className="contents"
    >
      <Botao {...botao} />
    </form>
  );
}
