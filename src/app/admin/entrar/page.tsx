import type { Metadata } from "next";
import { Suspense } from "react";
import { CabecalhoDoAdmin } from "@/components/admin/CabecalhoDoAdmin";
import {
  BOTAO_PRIMARIO_GRANDE,
  CHAPEU,
  LINHA_FINA,
  TITULO,
} from "@/components/admin/classes";
import { PaginaDeAcesso } from "@/components/admin/TelasDeAcesso";
import { entrarComGoogle } from "@/lib/auth/acoes";

export const metadata: Metadata = { title: "Entrar" };

const PASSOS = [
  [
    "Entre com o Google.",
    "Usamos o nome, o e-mail e a foto da conta para identificar quem publica.",
  ],
  [
    "O primeiro acesso vira um pedido.",
    "Ele fica pendente até alguém da redação decidir.",
  ],
  [
    "Um admin aceita e o painel abre.",
    "Não é preciso pedir de novo: basta voltar a esta página.",
  ],
] as const;

/**
 * Aviso de erro do callback (`?erro=login`). Só esse valor mostra a mensagem, e o texto é
 * fixo: nada da URL vai para a página. `role="alert"`: é lido assim que a página abre.
 *
 * Fica num `<Suspense>` porque `searchParams` é dado da requisição; o resto da página
 * entra no shell estático.
 */
async function AvisoDeErro({
  searchParams,
}: {
  searchParams: PageProps<"/admin/entrar">["searchParams"];
}) {
  const { erro } = await searchParams;
  if (erro !== "login") return null;
  return (
    <div
      className="mt-6 grid gap-x-5 gap-y-[0.3rem] border-y-(length:--rule-width-strong) border-rule-strong py-[0.85rem] sm:grid-cols-[7rem_1fr] sm:items-baseline"
      role="alert"
    >
      <p className="label">◆ Não entrou</p>
      <p className="font-text text-[1rem] leading-[1.45]">
        <strong>Não foi possível concluir o login com o Google.</strong> O link
        de acesso expirou ou foi cancelado. Tente de novo.
      </p>
    </div>
  );
}

export default function Entrar({ searchParams }: PageProps<"/admin/entrar">) {
  return (
    <>
      <CabecalhoDoAdmin />
      <PaginaDeAcesso>
        <p className={CHAPEU}>Admin · Acesso restrito</p>
        <h1 className={TITULO}>Entrar na redação</h1>
        <p className={LINHA_FINA}>
          O admin da Zona Mista é onde a redação revisa e publica as matérias do
          squad-fut. O acesso é pela sua conta Google.
        </p>
        <Suspense>
          <AvisoDeErro searchParams={searchParams} />
        </Suspense>
        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
          <form action={entrarComGoogle}>
            <button className={BOTAO_PRIMARIO_GRANDE} type="submit">
              Entrar com Google
            </button>
          </form>
        </div>
        <ol
          aria-label="Como funciona o acesso"
          className="mt-(--space-section) border-t-(length:--rule-width) border-rule-strong"
        >
          {PASSOS.map(([titulo, explicacao], i) => (
            <li
              className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-4 border-b-(length:--rule-width) border-rule py-[0.9rem]"
              key={titulo}
            >
              <span
                aria-hidden="true"
                className="label leading-[1.9] text-ink-muted"
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <p>
                <b className="font-semibold">{titulo}</b>{" "}
                <span className="text-ink-muted">{explicacao}</span>
              </p>
            </li>
          ))}
        </ol>
      </PaginaDeAcesso>
    </>
  );
}
