import { EditoriasDaCapa } from "@/components/capa/EditoriasDaCapa";
import { ListaDeMaterias } from "@/components/listagem/ListaDeMaterias";
import { rotuloDosResultados, type Busca } from "@/lib/busca";
import type { EditoriaDaCapa } from "@/lib/capa";

type Props = {
  busca: Busca;
  /** Editorias com matéria, para a sugestão dos estados vazio e sem resultado. */
  editorias: readonly EditoriaDaCapa[];
};

/** Um termo de 100 caracteres sem espaço não pode vazar a tela em 320px. */
const QUEBRA_EM_QUALQUER_PONTO = "wrap-anywhere";

/**
 * O que vem abaixo do formulário da `/busca` (docs/design/06-busca/notas.md §4): a contagem
 * e a lista; ou a mensagem de "nenhuma matéria" e a sugestão; ou, sem termo, só a sugestão.
 * O termo entra entre aspas curvas e sempre como texto do React, nunca como HTML.
 */
export function ResultadoDaBusca({ busca, editorias }: Props) {
  if (busca.estado === "com-resultado") {
    const total = busca.itens.length;
    return (
      <div className="wrap">
        <p className="mt-5 max-w-(--layout-measure) font-text text-body leading-[1.5] text-ink-muted">
          <span className="mono text-ink">{total}</span>{" "}
          {rotuloDosResultados(total)} para “
          <span
            className={`font-semibold text-ink ${QUEBRA_EM_QUALQUER_PONTO}`}
          >
            {busca.termo}
          </span>
          ”
        </p>
        <div className="mt-6">
          <ListaDeMaterias materias={busca.itens} nivelDoTitulo="h2" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="wrap">
        {busca.estado === "sem-resultado" && (
          <p
            className={`mt-6 max-w-[24ch] font-display text-row-title leading-[1.06] tracking-[-0.012em] text-balance ${QUEBRA_EM_QUALQUER_PONTO}`}
          >
            Nenhuma matéria encontrada para “
            {/* A Instrument Serif só tem peso 400: o termo vai em itálico, sem negrito falso. */}
            <i>{busca.termo}</i>”.
          </p>
        )}
        <p className="mt-3 max-w-(--layout-measure) font-text text-body leading-[1.6] text-pretty text-ink-muted">
          Procure pelo nome de um clube, de um jogador ou de uma competição. Se
          preferir, comece por uma editoria.
        </p>
      </div>
      <EditoriasDaCapa editorias={editorias} />
    </>
  );
}
