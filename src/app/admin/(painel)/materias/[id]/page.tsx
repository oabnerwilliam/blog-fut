import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CHAPEU,
  FICHA,
  LINHA_DA_FICHA,
  LINK,
  NOTA,
  TITULO_DA_MATERIA,
  TITULO_DE_BLOCO,
} from "@/components/admin/classes";
import { BotoesDePublicacao } from "@/components/admin/materias/BotoesDaMateria";
import { FormularioDaMateria } from "@/components/admin/materias/FormularioDaMateria";
import { SituacaoDaMateria } from "@/components/admin/materias/Marcas";
import { RetornoDasAcoes } from "@/components/admin/RetornoDasAcoes";
import { rotuloDaEditoria } from "@/lib/editorias";
import {
  formatarDataEHoraDoAdmin,
  formatarDiaDoAdmin,
} from "@/lib/admin/formatos";
import {
  despublicar,
  publicarAlteracoes,
  salvarRevisao,
} from "@/lib/admin/materias";
import { lerMateriaParaEdicao } from "@/lib/admin/painel";
import {
  revisaoNoSite,
  rotuloDaFonte,
  temAlgoParaPublicar,
} from "@/lib/admin/telas";
import type { MateriaParaEdicao } from "@/lib/admin/tipos";
import {
  criarClienteDoServidor,
  exigirAdminLigado,
  obterSessaoDoAdmin,
} from "@/lib/auth/servidor";

export const metadata: Metadata = { title: "Editar matéria" };

function Ficha({ materia }: { materia: MateriaParaEdicao }) {
  const linhas = [
    { termo: "Slug", valor: materia.slug, mono: true },
    {
      termo: "Publicada em",
      valor: formatarDiaDoAdmin(materia.publicadoEm),
      mono: true,
    },
    { termo: "Fonte", valor: rotuloDaFonte(materia.fonte), mono: false },
    { termo: "Origem", valor: materia.origem ?? "—", mono: !!materia.origem },
  ];
  return (
    <dl className={`${FICHA} mt-5`}>
      {linhas.map(({ termo, valor, mono }) => (
        <div
          className={`${LINHA_DA_FICHA} grid-cols-[6.5rem_minmax(0,1fr)] items-baseline`}
          key={termo}
        >
          <dt className="label text-ink-muted">{termo}</dt>
          <dd
            className={`min-w-0 [overflow-wrap:anywhere] ${mono ? "font-mono text-[0.8125rem] leading-[1.5] font-medium" : "font-text text-[0.9375rem] leading-[1.45]"}`}
          >
            {valor}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * `/admin/materias/[id]` (história 17, critério 4; README de docs/design/17-painel,
 * "Edição"). Os campos são os da revisão **em edição**; o site mostra a publicada (U9).
 *
 * A página confere a sessão de novo (ADR 0009) e lê com a sessão do usuário. Um id
 * inválido ou de matéria que não existe dá `notFound()`.
 */
export default async function EditarMateria({
  params,
}: PageProps<"/admin/materias/[id]">) {
  await exigirAdminLigado();
  const sessao = await obterSessaoDoAdmin();
  if (sessao?.perfil?.status !== "aprovado") notFound();
  const { id } = await params;
  const materia = await lerMateriaParaEdicao(
    await criarClienteDoServidor(),
    id,
  );
  if (materia === null) notFound();

  const noSite = revisaoNoSite(materia);
  const algoParaPublicar = temAlgoParaPublicar(materia);
  const comAlteracoes =
    materia.revisaoPublicada !== null &&
    materia.revisaoEmEdicao !== materia.revisaoPublicada;
  const historico = `/admin/materias/${materia.id}/historico`;

  return (
    <main id="conteudo" tabIndex={-1}>
      <div className="wrap pt-(--space-section)">
        <p className="label mb-5">
          <Link
            className={`inline-flex min-h-(--tap-min) items-center ${LINK}`}
            href="/admin/materias"
          >
            ← Matérias
          </Link>
        </p>
        <p className="label flex flex-wrap items-center gap-x-[0.8rem] gap-y-[0.35rem]">
          <span className={CHAPEU}>Editar matéria</span>
          <span className="text-accent">
            {rotuloDaEditoria(materia.campos.editoria)}
          </span>
        </p>
        <h1 className={TITULO_DA_MATERIA}>{materia.campos.titulo}</h1>
        <p className="label mt-4 flex flex-wrap gap-x-4 gap-y-[0.3rem] text-ink-muted">
          <span>
            <SituacaoDaMateria status={materia.status} />
            {noSite !== null && (
              <>
                {" "}
                · revisão <span className="mono">{noSite}</span> no site
              </>
            )}
          </span>
          <span>
            revisão <span className="mono">{materia.revisaoEmEdicao}</span> em
            edição
          </span>
        </p>

        <RetornoDasAcoes>
          <div className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-x-12 gap-y-(--space-section) lg:grid-cols-[minmax(0,var(--layout-measure))_minmax(17rem,21rem)] lg:items-start lg:justify-between">
            <aside
              aria-labelledby="h-pub"
              className="lg:sticky lg:top-6 lg:col-start-2 lg:row-start-1"
            >
              <h2 className={TITULO_DE_BLOCO} id="h-pub">
                Publicação
              </h2>
              {comAlteracoes ? (
                <div className="mt-4 grid gap-[0.4rem] border-y-(length:--rule-width-strong) border-dashed border-rule-strong py-[0.85rem]">
                  <p className="font-mono text-label leading-[1.4] font-semibold tracking-[0.08em] uppercase">
                    <span
                      aria-hidden="true"
                      className="mr-[0.45em] text-[1.1em]"
                    >
                      ◐
                    </span>
                    Alterações não publicadas
                  </p>
                  <p className="font-text text-[0.9375rem] leading-[1.5]">
                    A revisão <b>{materia.revisaoEmEdicao}</b>, salva por{" "}
                    {materia.emEdicao.autor} em{" "}
                    <span className="mono">
                      {formatarDataEHoraDoAdmin(materia.emEdicao.criadaEm)}
                    </span>
                    , ainda não está no site.{" "}
                    {noSite !== null ? (
                      <>
                        O leitor vê a revisão <b>{noSite}</b>.
                      </>
                    ) : (
                      "A matéria está fora do site."
                    )}
                  </p>
                </div>
              ) : materia.status === "publicado" ? (
                <p className="mt-4 border-y-(length:--rule-width) border-rule-strong py-[0.85rem] font-text text-[0.9375rem] leading-[1.5]">
                  <b>
                    <span
                      aria-hidden="true"
                      className="mr-[0.45em] font-medium"
                    >
                      ●
                    </span>
                    Em dia.
                  </b>{" "}
                  A revisão em edição é a que está no site.
                </p>
              ) : (
                <p className="mt-4 border-y-(length:--rule-width) border-rule-strong py-[0.85rem] font-text text-[0.9375rem] leading-[1.5]">
                  <b>
                    <span
                      aria-hidden="true"
                      className="mr-[0.45em] font-medium"
                    >
                      ○
                    </span>
                    Fora do site.
                  </b>{" "}
                  {materia.revisaoPublicada === null
                    ? "A matéria ainda não foi publicada."
                    : "A matéria foi despublicada."}
                </p>
              )}
              <Ficha materia={materia} />
              <p className={`${NOTA} mt-3`}>
                O slug e a data de publicação não mudam pelo painel.
              </p>
              <BotoesDePublicacao
                despublicar={despublicar.bind(null, materia.id)}
                estaNoSite={materia.status === "publicado"}
                jaFoiPublicada={materia.revisaoPublicada !== null}
                publicar={publicarAlteracoes.bind(null, materia.id)}
                revisaoEmEdicao={materia.revisaoEmEdicao}
                temAlgoParaPublicar={algoParaPublicar}
              />
              <Link
                className={`mt-5 inline-flex min-h-(--tap-min) items-center ${LINK}`}
                href={historico}
              >
                Histórico ·&nbsp;
                <span className="mono">{materia.totalDeRevisoes}</span>
                &nbsp;
                {materia.totalDeRevisoes === 1 ? "revisão" : "revisões"} →
              </Link>
            </aside>

            <FormularioDaMateria
              campos={materia.campos}
              proximaRevisao={materia.totalDeRevisoes + 1}
              revisaoEmEdicao={materia.revisaoEmEdicao}
              revisaoNoSite={noSite}
              salvar={salvarRevisao.bind(null, materia.id)}
              tagsExistentes={materia.tagsExistentes}
            />
          </div>
        </RetornoDasAcoes>
      </div>
    </main>
  );
}
