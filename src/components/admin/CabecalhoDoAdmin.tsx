import Link from "next/link";
import { BotaoDeTema } from "@/components/layout/BotaoDeTema";
import { sair } from "@/lib/auth/acoes";
import { Avatar } from "./Avatar";
import { BOTAO_SECUNDARIO } from "./classes";
import { NavDoAdmin } from "./NavDoAdmin";

export type QuemEstaLogado = {
  nome: string;
  avatarUrl: string | null;
  iniciais: string;
};

type Props = {
  /** Sem ninguém logado (`/admin/entrar`), o topo mostra só o nome do portal. */
  quem?: QuemEstaLogado;
  /** A nav (Painel, Acessos) só aparece para quem está aprovado. */
  comNav?: boolean;
};

/**
 * Topo do admin, no lugar do cabeçalho público (README do design, "Topo do admin").
 *
 * O nome acessível do link vem de um texto `sr-only` ("Zona Mista Admin, painel"), e não
 * de `aria-label`: o texto visível "ZonaMista" não tem espaço, e com `aria-label` o axe
 * acusa `label-content-name-mismatch`.
 */
export function CabecalhoDoAdmin({ quem, comNav = false }: Props) {
  return (
    <header className="pt-[0.9rem]">
      <div className="wrap">
        <div className="label flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b-(length:--rule-width) border-rule pb-[0.65rem] text-ink-muted">
          <span className="min-w-0 flex-[1_1_9rem]">
            Área restrita da redação
          </span>
          <BotaoDeTema />
        </div>
      </div>
      <div className="border-b-(length:--rule-width) border-rule-strong">
        <div className="wrap flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-[0.8rem]">
          <Link
            className="group inline-flex min-w-0 flex-wrap items-center gap-x-[0.7rem] gap-y-[0.3rem] text-ink"
            href="/admin"
          >
            <span className="sr-only">Zona Mista Admin, painel</span>
            <span
              aria-hidden="true"
              className="pb-[0.06em] font-display text-section leading-[0.9] font-normal tracking-[-0.03em] whitespace-nowrap group-hover:text-accent"
            >
              Zona<i className="ml-[0.08em] tracking-[-0.04em]">Mista</i>
            </span>
            <span
              aria-hidden="true"
              className="border-l-(length:--rule-width) border-rule-strong py-[0.3rem] pl-[0.7rem] font-mono text-label leading-none font-semibold tracking-[0.1em] uppercase"
            >
              Admin
            </span>
          </Link>
          {quem && (
            <div className="flex min-w-0 flex-[1_1_15rem] items-center gap-[0.65rem] md:flex-[0_1_auto]">
              <Avatar
                url={quem.avatarUrl}
                iniciais={quem.iniciais}
                tamanho="pequeno"
              />
              <span className="min-w-0 font-text text-[0.9375rem] leading-[1.25] font-medium">
                <span className="sr-only">Conectado como </span>
                {quem.nome}
              </span>
              <form action={sair} className="ml-auto md:ml-2">
                <button className={BOTAO_SECUNDARIO} type="submit">
                  Sair
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
      {comNav && <NavDoAdmin />}
    </header>
  );
}
