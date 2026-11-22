import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CHAPEU,
  LINHA_FINA,
  LINK,
  TITULO,
  TITULO_DE_BLOCO,
} from "@/components/admin/classes";
import {
  CompararRevisoes,
  ListaDeRevisoes,
  PainelDaRevisao,
  PainelDeComparacao,
} from "@/components/admin/materias/Historico";
import { RetornoDasAcoes } from "@/components/admin/RetornoDasAcoes";
import { rotuloDaEditoria } from "@/lib/editorias";
import { lerHistorico, lerRevisoes } from "@/lib/admin/painel";
import { escolherVisao, revisaoNoSite } from "@/lib/admin/telas";
import {
  criarClienteDoServidor,
  exigirAdminLigado,
  obterSessaoDoAdmin,
} from "@/lib/auth/servidor";

export const metadata: Metadata = { title: "Histórico" };

/**
 * `/admin/materias/[id]/historico` (história 17, critério 4; README de
 * docs/design/17-painel, "Histórico"). `?ver=N` abre uma revisão; `?de=A&para=B`
 * compara duas; sem nada, compara a publicada com a em edição. Nenhuma revisão é
 * apagada: restaurar cria uma nova.
 *
 * A página confere a sessão de novo (ADR 0009). Um id inválido ou de matéria que não
 * existe dá `notFound()`; um número de revisão que não existe cai na visão padrão.
 */
export default async function Historico({
  params,
  searchParams,
}: PageProps<"/admin/materias/[id]/historico">) {
  await exigirAdminLigado();
  const sessao = await obterSessaoDoAdmin();
  if (sessao?.perfil?.status !== "aprovado") notFound();
  const { id } = await params;
  const cliente = await criarClienteDoServidor();
  const historico = await lerHistorico(cliente, id);
  if (historico === null) notFound();

  const visao = escolherVisao(historico, await searchParams);
  const numeros =
    visao.tipo === "revisao" ? [visao.numero] : [visao.de, visao.para];
  const revisoes = await lerRevisoes(cliente, historico.id, numeros);
  const porNumero = new Map(revisoes.map((r) => [r.numero, r]));
  const noSite = revisaoNoSite(historico);
  const total = historico.revisoes.length;
  const padraoDaComparacao =
    visao.tipo === "comparar"
      ? visao
      : {
          de: noSite ?? Math.max(1, historico.revisaoEmEdicao - 1),
          para: historico.revisaoEmEdicao,
        };

  return (
    <main id="conteudo" tabIndex={-1}>
      <div className="wrap pt-(--space-section)">
        <p className="label mb-5">
          <Link
            className={`inline-flex min-h-(--tap-min) items-center ${LINK}`}
            href={`/admin/materias/${historico.id}`}
          >
            ← Editar matéria
          </Link>
        </p>
        <p className="label flex flex-wrap items-center gap-x-[0.8rem] gap-y-[0.35rem]">
          <span className={CHAPEU}>Admin · Matérias</span>
          <span className="text-accent">
            {rotuloDaEditoria(historico.editoria)}
          </span>
        </p>
        <h1 className={TITULO}>Histórico</h1>
        <p className={LINHA_FINA}>{historico.titulo}</p>
        <p className="label mt-5 text-ink-muted [&_b]:font-semibold [&_b]:text-ink">
          <b>{total}</b> {total === 1 ? "revisão" : "revisões"} · publicada:{" "}
          <b>{noSite ?? "nenhuma"}</b> · em edição:{" "}
          <b>{historico.revisaoEmEdicao}</b> · nenhuma revisão é apagada
        </p>

        <RetornoDasAcoes>
          <div className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-x-12 gap-y-(--space-section) lg:grid-cols-[minmax(18rem,22rem)_minmax(0,1fr)] lg:items-start">
            <section aria-labelledby="h-revs" className="min-w-0">
              <h2 className={TITULO_DE_BLOCO} id="h-revs">
                Revisões
              </h2>
              <ListaDeRevisoes
                aberta={visao.tipo === "revisao" ? visao.numero : null}
                comparando={visao.tipo === "comparar" ? visao : null}
                historico={historico}
              />
              {total > 1 && (
                <CompararRevisoes
                  de={padraoDaComparacao.de}
                  para={padraoDaComparacao.para}
                  revisoes={historico.revisoes}
                />
              )}
            </section>
            {visao.tipo === "revisao" && porNumero.has(visao.numero) && (
              <PainelDaRevisao
                historico={historico}
                revisao={porNumero.get(visao.numero)!}
              />
            )}
            {visao.tipo === "comparar" &&
              porNumero.has(visao.de) &&
              porNumero.has(visao.para) && (
                <PainelDeComparacao
                  de={porNumero.get(visao.de)!}
                  historico={historico}
                  para={porNumero.get(visao.para)!}
                />
              )}
          </div>
        </RetornoDasAcoes>
      </div>
    </main>
  );
}
