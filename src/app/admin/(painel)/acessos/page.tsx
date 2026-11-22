import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CHAPEU, LINHA_FINA, TITULO } from "@/components/admin/classes";
import { ListaDeAcessos } from "@/components/admin/ListaDeAcessos";
import { listarPedidosDeAcesso } from "@/lib/admin/perfis";
import {
  criarClienteDoServidor,
  obterSessaoDoAdmin,
} from "@/lib/auth/servidor";

export const metadata: Metadata = { title: "Acessos" };

/**
 * `/admin/acessos` (história 16, critério 4): os pedidos em três grupos, com as ações
 * de cada linha. O porteiro do grupo `(painel)` já conferiu que quem está aqui está
 * aprovado; a página confere de novo (a sessão é memorizada por requisição) e lê com a
 * sessão do usuário, então o RLS é a última camada.
 */
export default async function Acessos() {
  const sessao = await obterSessaoDoAdmin();
  if (sessao?.perfil?.status !== "aprovado") notFound();
  const pedidos = await listarPedidosDeAcesso(
    await criarClienteDoServidor(),
    sessao.usuario.id,
  );
  return (
    <main id="conteudo" tabIndex={-1}>
      <div className="wrap pt-(--space-section)">
        <p className={CHAPEU}>Admin</p>
        <h1 className={TITULO}>Acessos</h1>
        <p className={LINHA_FINA}>
          Quem pode entrar no painel. Cada pessoa entra uma vez com o Google e
          aparece aqui como pedido.
        </p>
        <ListaDeAcessos pedidos={pedidos} />
      </div>
    </main>
  );
}
