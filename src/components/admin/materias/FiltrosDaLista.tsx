import Link from "next/link";
import { EDITORIAS } from "@/lib/editorias";
import { temFiltro } from "@/lib/admin/telas";
import type { FiltrosDoPainel } from "@/lib/admin/tipos";
import { BOTAO_SECUNDARIO, CAMPO, LINK, ROTULO, SELECT } from "../classes";

const STATUS = [
  { valor: "publicado", rotulo: "Publicado" },
  { valor: "rascunho", rotulo: "Rascunho" },
] as const;

const FONTES = [
  { valor: "squad", rotulo: "Do squad" },
  { valor: "painel", rotulo: "Painel" },
  { valor: "importacao", rotulo: "Importação" },
] as const;

function Filtro({
  id,
  nome,
  rotulo,
  todos,
  opcoes,
  valor,
}: {
  id: string;
  nome: string;
  rotulo: string;
  todos: string;
  opcoes: readonly { valor: string; rotulo: string }[];
  valor: string | undefined;
}) {
  return (
    <div className={CAMPO}>
      <label className={ROTULO} htmlFor={id}>
        {rotulo}
      </label>
      <select className={SELECT} defaultValue={valor ?? ""} id={id} name={nome}>
        <option value="">{todos}</option>
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.rotulo}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * Os filtros da lista (README, "Lista"): um `<form method="get">`, para os filtros irem
 * na URL e funcionarem sem JavaScript. "Limpar filtros" só aparece com algum filtro.
 */
export function FiltrosDaLista({ filtros }: { filtros: FiltrosDoPainel }) {
  return (
    <form
      action="/admin/materias"
      aria-label="Filtrar matérias"
      className="mt-8 grid grid-cols-[minmax(0,1fr)] items-end gap-x-5 gap-y-4 border-y-(length:--rule-width) border-rule-strong pt-4 pb-5 min-[36rem]:grid-cols-[repeat(2,minmax(0,1fr))] lg:grid-cols-[repeat(3,minmax(0,14rem))_auto]"
      method="get"
    >
      <Filtro
        id="f-status"
        nome="status"
        opcoes={STATUS}
        rotulo="Status"
        todos="Todos"
        valor={filtros.status}
      />
      <Filtro
        id="f-editoria"
        nome="editoria"
        opcoes={EDITORIAS.map((e) => ({ valor: e.slug, rotulo: e.rotulo }))}
        rotulo="Editoria"
        todos="Todas"
        valor={filtros.editoria}
      />
      <Filtro
        id="f-fonte"
        nome="fonte"
        opcoes={FONTES}
        rotulo="Fonte"
        todos="Todas"
        valor={filtros.fonte}
      />
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <button className={`${BOTAO_SECUNDARIO} lg:min-h-11`} type="submit">
          Filtrar
        </button>
        {temFiltro(filtros) && (
          <Link
            className={`label inline-flex min-h-(--tap-min) items-center ${LINK}`}
            href="/admin/materias"
          >
            Limpar filtros
          </Link>
        )}
      </div>
    </form>
  );
}
