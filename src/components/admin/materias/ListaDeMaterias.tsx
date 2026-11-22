import Link from "next/link";
import { SeloExemplo } from "@/components/materia/SeloExemplo";
import { rotuloDaEditoria } from "@/lib/editorias";
import { formatarDiaDoAdmin } from "@/lib/admin/formatos";
import { descreverFiltros, rotuloDaFonte, temFiltro } from "@/lib/admin/telas";
import type { FiltrosDoPainel, MateriaDoPainel } from "@/lib/admin/tipos";
import { LINK } from "../classes";
import { Marca, SituacaoDaMateria } from "./Marcas";

function Data({ materia }: { materia: MateriaDoPainel }) {
  const dia = (
    <span className="mono">{formatarDiaDoAdmin(materia.publicadoEm)}</span>
  );
  if (materia.status === "publicado") return <>publicada em {dia}</>;
  if (materia.revisaoPublicada !== null)
    return <>despublicada · era de {dia}</>;
  return <>ainda não publicada · data {dia}</>;
}

function Linha({ materia }: { materia: MateriaDoPainel }) {
  const edicao = `/admin/materias/${materia.id}`;
  return (
    <li
      className="grid grid-cols-[minmax(0,1fr)] gap-x-6 gap-y-[0.6rem] border-t-(length:--rule-width) border-rule py-[1.1rem] first:border-rule-strong @min-[52rem]:grid-cols-[minmax(0,1fr)_16rem_8rem] @min-[52rem]:items-start"
      data-materia={materia.slug}
    >
      <div className="min-w-0">
        <p className="label flex flex-wrap items-center gap-x-[0.8rem] gap-y-[0.35rem]">
          <span className="text-accent">
            {rotuloDaEditoria(materia.editoria)}
          </span>
          {materia.ficticio && <SeloExemplo />}
        </p>
        <h2 className="mt-[0.35rem] font-display text-row-title leading-[1.06] tracking-[-0.012em] text-balance">
          <Link
            className="hover:text-accent hover:underline hover:decoration-(length:--rule-width) hover:underline-offset-[0.12em]"
            href={edicao}
          >
            {materia.titulo}
          </Link>
        </h2>
      </div>
      <div className="label flex flex-wrap items-center gap-x-4 gap-y-[0.3rem] text-ink-muted @min-[52rem]:grid @min-[52rem]:pt-[0.2rem]">
        <p>
          <SituacaoDaMateria status={materia.status} /> ·{" "}
          <span className="sr-only">fonte: </span>
          {rotuloDaFonte(materia.fonte)}
        </p>
        <p>
          <Data materia={materia} />
        </p>
        {materia.alteracoesNaoPublicadas && (
          <p>
            <Marca tipo="alteracoes" />
          </p>
        )}
      </div>
      <p className="label flex flex-wrap gap-x-5 @min-[52rem]:-mt-[0.55rem] @min-[52rem]:grid @min-[52rem]:justify-items-end">
        <Link
          className={`inline-flex min-h-(--tap-min) items-center ${LINK}`}
          href={`${edicao}/historico`}
        >
          Histórico<span className="sr-only"> de {materia.titulo}</span>
        </Link>
        {materia.status === "publicado" && (
          <Link
            className={`inline-flex min-h-(--tap-min) items-center ${LINK}`}
            href={`/materias/${materia.slug}`}
          >
            Ver no site<span className="sr-only"> {materia.titulo}</span>
          </Link>
        )}
      </p>
    </li>
  );
}

/**
 * As matérias da lista (README, "Lista"). A contagem fica num `role="status"`, lida
 * quando a lista muda depois de filtrar. Sem resultado, o estado vazio da 16.
 */
export function ListaDeMaterias({
  materias,
  total,
  filtros,
}: {
  materias: readonly MateriaDoPainel[];
  total: number;
  filtros: FiltrosDoPainel;
}) {
  const descricao = descreverFiltros(filtros);
  return (
    <>
      <p
        className="label mt-5 text-ink-muted [&_b]:font-semibold [&_b]:text-ink"
        role="status"
      >
        Mostrando <b>{materias.length}</b> de {total}{" "}
        {total === 1 ? "matéria" : "matérias"}
        {materias.length === 0 && descricao && ` · ${descricao}`}
      </p>
      {materias.length > 0 ? (
        <ul className="@container mt-3 border-b-(length:--rule-width) border-rule-strong">
          {materias.map((m) => (
            <Linha key={m.id} materia={m} />
          ))}
        </ul>
      ) : (
        <div className="mt-3 border-t-(length:--rule-width) border-rule-strong pt-5 pb-6">
          <p className="font-display text-row-title leading-[1.1] tracking-[-0.012em] italic">
            {total === 0
              ? "Nenhuma matéria no banco ainda."
              : "Nenhuma matéria com esses filtros."}
          </p>
          <p className="mt-2 max-w-(--layout-measure) text-ink-muted">
            {total === 0 ? (
              "As matérias chegam pelo squad-fut (pnpm materia:enviar) ou pela importação."
            ) : (
              <>
                Há {total} {total === 1 ? "matéria" : "matérias"} no total.{" "}
                {temFiltro(filtros) && (
                  <>
                    Tire um dos filtros ou{" "}
                    <Link
                      className={`whitespace-nowrap ${LINK}`}
                      href="/admin/materias"
                    >
                      limpe todos
                    </Link>
                    .
                  </>
                )}
              </>
            )}
          </p>
        </div>
      )}
    </>
  );
}
