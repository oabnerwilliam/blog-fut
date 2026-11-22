import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { CabecalhoDoAdmin } from "@/components/admin/CabecalhoDoAdmin";
import {
  AcessoNaoAutorizado,
  PedidoEnviado,
} from "@/components/admin/TelasDeAcesso";
import { iniciaisDe, nomeParaExibir } from "@/lib/admin/formatos";
import { exigirAdminLigado, obterSessaoDoAdmin } from "@/lib/auth/servidor";

/**
 * Porteiro do painel (história 16, critério 4): confere a sessão e o status no servidor,
 * antes de mostrar qualquer coisa do painel. O RLS do banco é a segunda camada (ADR 0009).
 *
 * - sem sessão válida → `/admin/entrar`;
 * - `pendente` → "Pedido enviado";
 * - `recusado`, `revogado` ou sem perfil → "Acesso não autorizado";
 * - `aprovado` → o topo com a nav e a página.
 *
 * A sessão é lida dentro de um `<Suspense>`: com Cache Components, ler cookies fora de um
 * limite quebra o build, e um `await` no topo do layout seguraria o segmento inteiro
 * (guia `authentication-with-cache-components.md`, passo 2). O shell estático tem o topo
 * sem ninguém logado.
 *
 * Fica no grupo `(painel)`, e não em `src/app/admin/layout.tsx`, porque `/admin/entrar`
 * também está embaixo de `/admin` e não pode exigir sessão.
 */
export default function LayoutDoPainel({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<Espera />}>
      <Porteiro>{children}</Porteiro>
    </Suspense>
  );
}

/** Enquanto a sessão é conferida: o topo sem ninguém e o alvo do link de pular. */
function Espera() {
  return (
    <>
      <CabecalhoDoAdmin />
      <main id="conteudo" tabIndex={-1} className="wrap pt-(--space-section)">
        <p className="label text-ink-muted">Conferindo o acesso…</p>
      </main>
    </>
  );
}

async function Porteiro({ children }: { children: ReactNode }) {
  await exigirAdminLigado();
  const sessao = await obterSessaoDoAdmin();
  if (sessao === null) redirect("/admin/entrar");

  const { usuario, perfil } = sessao;
  const email = perfil?.email ?? usuario.email;
  const conta = {
    nome: nomeParaExibir(perfil?.nome, email),
    email,
    avatarUrl: perfil?.avatarUrl ?? null,
    iniciais: iniciaisDe(perfil?.nome, email),
  };

  if (perfil?.status === "aprovado") {
    return (
      <>
        <CabecalhoDoAdmin quem={conta} comNav />
        {children}
      </>
    );
  }
  return (
    <>
      <CabecalhoDoAdmin quem={conta} />
      {perfil?.status === "pendente" ? (
        <PedidoEnviado conta={conta} pedidoEm={perfil.criadoEm} />
      ) : (
        <AcessoNaoAutorizado
          conta={conta}
          status={perfil?.status ?? null}
          decididoEm={perfil?.decididoEm ?? null}
        />
      )}
    </>
  );
}
