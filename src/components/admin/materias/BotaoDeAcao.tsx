"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import type { ResultadoDoPainel } from "@/lib/admin/tipos";
import { BOTAO_DE_FRASE, BOTAO_DE_FRASE_CHEIO, DICA } from "../classes";
import { useAvisar } from "../RetornoDasAcoes";

type Props<T extends object> = {
  /** A server action já ligada à matéria (`publicarAlteracoes.bind(null, id)`). */
  readonly acao: () => Promise<ResultadoDoPainel<T>>;
  readonly rotulo: string;
  /** A dica embaixo do botão, ligada por `aria-describedby`. */
  readonly dica: ReactNode;
  readonly idDaDica: string;
  /** O que a região de retorno diz quando deu certo (o número da revisão nova, se houver). */
  readonly sucesso: (dados: T) => ReactNode;
  readonly cheio?: boolean;
};

function Botao({
  rotulo,
  idDaDica,
  cheio,
}: {
  rotulo: string;
  idDaDica: string;
  cheio?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      aria-describedby={idDaDica}
      className={cheio ? BOTAO_DE_FRASE_CHEIO : BOTAO_DE_FRASE}
      disabled={pending}
      type="submit"
    >
      {rotulo}
    </button>
  );
}

/**
 * Um botão de ação do painel de matérias (Publicar, Despublicar, Restaurar), cada um no
 * próprio `<form>` (README, "Edição"). A action confere tudo no servidor e devolve o
 * resultado; aqui só se mostra a mensagem na região `role="status"`.
 */
export function BotaoDeAcao<T extends object>({
  acao,
  rotulo,
  dica,
  idDaDica,
  sucesso,
  cheio,
}: Props<T>) {
  const avisar = useAvisar();
  return (
    <form
      action={async () => {
        try {
          const resultado = await acao();
          avisar(resultado.ok ? sucesso(resultado) : resultado.mensagem);
        } catch {
          avisar("Não foi possível gravar. Tente de novo em instantes.");
        }
      }}
      className="grid grid-cols-[minmax(0,1fr)] justify-items-start gap-[0.45rem]"
    >
      <Botao cheio={cheio} idDaDica={idDaDica} rotulo={rotulo} />
      <p className={DICA} id={idDaDica}>
        {dica}
      </p>
    </form>
  );
}
