import Link from "next/link";
import type { ReactNode } from "react";
import {
  formatarDataDoAdmin,
  formatarDataEHoraDoAdmin,
} from "@/lib/admin/formatos";
import type { StatusDoPerfil } from "@/lib/auth/servidor";
import { Avatar } from "./Avatar";
import { CHAPEU, LINHA_FINA, LINK, TEXTO, TITULO } from "./classes";
import { Situacao } from "./Situacao";

/**
 * Coluna de leitura das telas de acesso (entrar, pedido enviado, não autorizado),
 * deslocada 25% a partir de 64rem (README do design, "Layout").
 */
export function PaginaDeAcesso({ children }: { children: ReactNode }) {
  return (
    <main id="conteudo" tabIndex={-1}>
      <div className="wrap pt-(--space-section)">
        <div className="max-w-(--layout-measure) lg:ml-[25%]">{children}</div>
      </div>
    </main>
  );
}

export type ContaDaFicha = {
  nome: string;
  email: string | null;
  avatarUrl: string | null;
  iniciais: string;
};

function Linha({ termo, children }: { termo: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-x-5 gap-y-[0.35rem] py-[0.9rem] not-first:border-t-(length:--rule-width) not-first:border-rule min-[30rem]:grid-cols-[7.5rem_minmax(0,1fr)] min-[30rem]:items-baseline">
      <dt className="label text-ink-muted">{termo}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

function Conta({ conta }: { conta: ContaDaFicha }) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <Avatar
        url={conta.avatarUrl}
        iniciais={conta.iniciais}
        tamanho="normal"
      />
      <span className="min-w-0">
        <b className="block font-semibold">{conta.nome}</b>{" "}
        {conta.email && conta.email !== conta.nome && (
          <span className="text-[0.9375rem] [overflow-wrap:anywhere] text-ink-muted">
            {conta.email}
          </span>
        )}
      </span>
    </span>
  );
}

const FICHA = "mt-8 border-y-(length:--rule-width) border-rule-strong";

/** "Pedido enviado": o perfil está pendente (spec v2 §7.6, passo 1). */
export function PedidoEnviado({
  conta,
  pedidoEm,
}: {
  conta: ContaDaFicha;
  pedidoEm: string;
}) {
  return (
    <PaginaDeAcesso>
      <p className={CHAPEU}>Admin · Acesso ao painel</p>
      <h1 className={TITULO}>Pedido enviado</h1>
      <p className={LINHA_FINA}>
        Seu pedido de acesso chegou à redação. Agora falta um admin aceitar.
      </p>
      <dl className={FICHA}>
        <Linha termo="Conta">
          <Conta conta={conta} />
        </Linha>
        <Linha termo="Pedido em">
          <span className="mono">{formatarDataEHoraDoAdmin(pedidoEm)}</span>
        </Linha>
        <Linha termo="Situação">
          <Situacao status="pendente" />
        </Linha>
      </dl>
      <p className={TEXTO}>
        Você não precisa pedir de novo. Quando o pedido for aceito, volte a{" "}
        <span className="mono">/admin</span> ou recarregue esta página e o
        painel abre.
      </p>
      <p className={TEXTO}>
        Entrou com a conta errada? Use <strong>Sair</strong>, no topo, e entre
        com outra.
      </p>
    </PaginaDeAcesso>
  );
}

/**
 * "Acesso não autorizado": recusado, revogado ou sem perfil (anomalia: o trigger não
 * rodou). Quem foi recusado não gera pedido novo a cada login (spec v2 §7.6, passo 3).
 */
export function AcessoNaoAutorizado({
  conta,
  status,
  decididoEm,
}: {
  conta: ContaDaFicha;
  /** Nulo quando não há perfil. */
  status: Extract<StatusDoPerfil, "recusado" | "revogado"> | null;
  decididoEm: string | null;
}) {
  const fina =
    status === "revogado"
      ? "O acesso desta conta ao painel da Zona Mista foi revogado por um admin."
      : status === "recusado"
        ? "Um admin recusou o pedido de acesso desta conta ao painel da Zona Mista."
        : "Esta conta não tem um pedido de acesso registrado no painel da Zona Mista.";
  return (
    <PaginaDeAcesso>
      <p className={CHAPEU}>Admin · Acesso ao painel</p>
      <h1 className={TITULO}>Acesso não autorizado</h1>
      <p className={LINHA_FINA}>{fina}</p>
      <dl className={FICHA}>
        <Linha termo="Conta">
          <Conta conta={conta} />
        </Linha>
        {status && (
          <Linha termo="Situação">
            <Situacao status={status} />
            {decididoEm && (
              <span className="mono">
                {" "}
                em {formatarDataDoAdmin(decididoEm)}
              </span>
            )}
          </Linha>
        )}
      </dl>
      <p className={TEXTO}>
        Se for um engano, fale com quem cuida do portal: um admin pode reabrir o
        pedido, e aí o painel volta a pedir aprovação.
      </p>
      <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
        <Link className={LINK} href="/">
          Ir para o portal
        </Link>
      </div>
    </PaginaDeAcesso>
  );
}
