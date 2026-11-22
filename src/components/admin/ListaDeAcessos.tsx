import { aceitar, reabrir, recusar, revogar } from "@/lib/admin/acessos";
import type { ResultadoDaDecisao } from "@/lib/admin/decisoes";
import {
  formatarDataDoAdmin,
  formatarDataEHoraDoAdmin,
} from "@/lib/admin/formatos";
import type { PedidoDeAcesso, PedidosDeAcesso } from "@/lib/admin/perfis";
import { Avatar } from "./Avatar";
import { BotaoDeDecisao } from "./BotaoDeDecisao";
import { RetornoDasAcoes } from "./RetornoDasAcoes";
import { Situacao } from "./Situacao";

type Acao = (userId: string) => Promise<ResultadoDaDecisao>;

interface BotaoDaLinha {
  readonly acao: Acao;
  readonly rotulo: string;
  readonly sucesso: (nome: string) => string;
  readonly primario?: boolean;
}

const ACEITAR: BotaoDaLinha = {
  acao: aceitar,
  rotulo: "Aceitar",
  primario: true,
  sucesso: (nome) =>
    `Pedido de ${nome} aceito. A pessoa já pode abrir o painel.`,
};
const RECUSAR: BotaoDaLinha = {
  acao: recusar,
  rotulo: "Recusar",
  sucesso: (nome) => `Pedido de ${nome} recusado.`,
};
const REVOGAR: BotaoDaLinha = {
  acao: revogar,
  rotulo: "Revogar",
  sucesso: (nome) => `Acesso de ${nome} revogado.`,
};
const REABRIR: BotaoDaLinha = {
  acao: reabrir,
  rotulo: "Reabrir",
  sucesso: (nome) =>
    `Pedido de ${nome} reaberto. O pedido voltou para os pendentes.`,
};

/** Ações por grupo (README do design): o próprio usuário nunca tem ação. */
function botoesDe(pedido: PedidoDeAcesso): readonly BotaoDaLinha[] {
  if (pedido.ehVoce) return [];
  switch (pedido.status) {
    case "pendente":
      return [ACEITAR, RECUSAR];
    case "aprovado":
      return [REVOGAR];
    default:
      return [REABRIR];
  }
}

function Meta({ pedido }: { pedido: PedidoDeAcesso }) {
  if (pedido.status === "pendente") {
    return (
      <>
        <Situacao status="pendente" /> · pediu em{" "}
        <span className="mono">
          {formatarDataEHoraDoAdmin(pedido.pedidoEm)}
        </span>
      </>
    );
  }
  return (
    <>
      <Situacao status={pedido.status} />
      {pedido.decididoEm && (
        <>
          {" "}
          em{" "}
          <span className="mono">{formatarDataDoAdmin(pedido.decididoEm)}</span>
        </>
      )}
      {pedido.decisao &&
        (pedido.decisao.por === "comando"
          ? " · por comando"
          : ` · por ${pedido.decisao.nome}`)}
    </>
  );
}

function Pessoa({ pedido }: { pedido: PedidoDeAcesso }) {
  const botoes = botoesDe(pedido);
  return (
    <li
      className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-[0.9rem] gap-y-[0.3rem] border-t-(length:--rule-width) border-rule py-4 first:border-rule-strong @max-[13rem]:grid-cols-[minmax(0,1fr)] @min-[52rem]:grid-cols-[2.5rem_minmax(0,1.25fr)_minmax(0,1fr)_13rem] @min-[52rem]:items-center @min-[52rem]:gap-5"
      data-pessoa={pedido.userId}
    >
      <Avatar
        className="row-span-2 @max-[13rem]:row-auto @min-[52rem]:row-auto"
        iniciais={pedido.iniciais}
        tamanho="normal"
        url={pedido.avatarUrl}
      />
      <p className="min-w-0">
        <span className="font-text text-[1.0625rem] leading-[1.3] font-semibold">
          {pedido.nome}
        </span>
        {pedido.ehVoce && (
          <span className="ml-[0.4rem] border-(length:--rule-width) border-rule-strong px-[0.4rem] py-[0.2rem] align-[0.15em] font-mono text-[0.625rem] leading-none font-semibold tracking-[0.08em] whitespace-nowrap uppercase">
            Você
          </span>
        )}
        {pedido.email && pedido.email !== pedido.nome && (
          <>
            <br />
            <span className="text-[0.9375rem] [overflow-wrap:anywhere] text-ink-muted">
              {pedido.email}
            </span>
          </>
        )}
      </p>
      <p className="label col-start-2 text-ink-muted @max-[13rem]:col-start-1 @min-[52rem]:col-start-3">
        <Meta pedido={pedido} />
      </p>
      <div className="col-start-2 mt-[0.45rem] flex flex-wrap gap-2 @max-[13rem]:col-start-1 @min-[52rem]:col-start-4 @min-[52rem]:mt-0 @min-[52rem]:justify-end">
        {pedido.ehVoce ? (
          <p className="label self-center text-ink-muted @min-[52rem]:text-right">
            Sua conta · sem ações
          </p>
        ) : (
          botoes.map((botao) => (
            <BotaoDeDecisao
              acao={botao.acao.bind(null, pedido.userId)}
              key={botao.rotulo}
              nome={pedido.nome}
              primario={botao.primario}
              rotulo={botao.rotulo}
              sucesso={botao.sucesso(pedido.nome)}
            />
          ))
        )}
      </div>
    </li>
  );
}

function Grupo({
  id,
  titulo,
  pedidos,
  vazio,
}: {
  id: string;
  titulo: string;
  pedidos: readonly PedidoDeAcesso[];
  vazio: [string, string];
}) {
  return (
    <section aria-labelledby={id} className="pt-(--space-section)">
      <div className="mb-1 flex flex-wrap items-baseline gap-x-[0.9rem] gap-y-2 after:order-1 after:h-(--rule-width) after:min-w-8 after:flex-1 after:self-center after:bg-rule-strong after:content-['']">
        <h2
          className="font-display text-section leading-none font-normal tracking-[-0.015em] italic"
          id={id}
        >
          {titulo}
        </h2>
        <span aria-hidden="true" className="label order-2 text-ink-muted">
          {String(pedidos.length).padStart(2, "0")}
        </span>
      </div>
      {pedidos.length === 0 ? (
        <div className="border-t-(length:--rule-width) border-rule-strong pt-5 pb-6">
          <p className="font-display text-row-title leading-[1.1] tracking-[-0.012em] italic">
            {vazio[0]}
          </p>
          <p className="mt-2 max-w-(--layout-measure) text-ink-muted">
            {vazio[1]}
          </p>
        </div>
      ) : (
        <ul className="@container border-b-(length:--rule-width) border-rule-strong">
          {pedidos.map((pedido) => (
            <Pessoa key={pedido.userId} pedido={pedido} />
          ))}
        </ul>
      )}
    </section>
  );
}

function contagem(n: number, singular: string, plural: string) {
  return (
    <>
      <b className="font-semibold text-ink">{n}</b>{" "}
      {n === 1 ? singular : plural}
    </>
  );
}

/** A lista de `/admin/acessos`: resumo, retorno das ações e os três grupos. */
export function ListaDeAcessos({ pedidos }: { pedidos: PedidosDeAcesso }) {
  const { pendentes, aprovados, negados } = pedidos;
  return (
    <>
      <p className="label mt-5 text-ink-muted">
        {contagem(pendentes.length, "pendente", "pendentes")} ·{" "}
        {contagem(aprovados.length, "aprovado", "aprovados")} ·{" "}
        {contagem(
          negados.length,
          "recusado ou revogado",
          "recusados ou revogados",
        )}
      </p>
      <RetornoDasAcoes>
        <Grupo
          id="g-pendentes"
          pedidos={pendentes}
          titulo="Pendentes"
          vazio={[
            "Nenhum pedido pendente.",
            "Quando alguém entrar pela primeira vez em /admin/entrar, o pedido aparece aqui.",
          ]}
        />
        <Grupo
          id="g-aprovados"
          pedidos={aprovados}
          titulo="Aprovados"
          vazio={["Ninguém aprovado.", "Os admins aparecem aqui."]}
        />
        <Grupo
          id="g-negados"
          pedidos={negados}
          titulo="Recusados ou revogados"
          vazio={[
            "Nenhum pedido recusado ou revogado.",
            "Quem for recusado ou perder o acesso aparece aqui, com a opção de reabrir.",
          ]}
        />
      </RetornoDasAcoes>
    </>
  );
}
