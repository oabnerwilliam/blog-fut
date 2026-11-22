import Link from "next/link";
import type { ReactNode } from "react";
import { comContexto, diffDeLinhas, resumoDoDiff } from "@/lib/admin/diff";
import {
  formatarDataDoAdmin,
  formatarDataEHoraDoAdmin,
} from "@/lib/admin/formatos";
import {
  camposAlterados,
  fichaDaRevisao,
  marcadoresDaRevisao,
  revisaoNoSite,
  rotuloDaFonte,
} from "@/lib/admin/telas";
import { restaurarRevisao } from "@/lib/admin/materias";
import type {
  HistoricoDaMateria,
  RevisaoCompleta,
  RevisaoResumida,
} from "@/lib/admin/tipos";
import {
  BOTAO_SECUNDARIO,
  CAMPO,
  FICHA,
  LINHA_DA_FICHA,
  LINK,
  NOTA,
  SELECT,
} from "../classes";
import { BotaoDeRestaurar } from "./BotoesDaMateria";
import { Marca } from "./Marcas";

const LINK_DE_ACAO = `inline-flex min-h-(--tap-min) items-center ${LINK}`;

/** Um link que é o estado atual da tela: mais forte, e `aria-current`. */
const LINK_ATUAL =
  "aria-[current=true]:font-semibold aria-[current=true]:decoration-(length:--rule-width-strong)";

function dois(n: number): string {
  return String(n).padStart(2, "0");
}

// ---------------------------------------------------------------------------
// Lista de revisões
// ---------------------------------------------------------------------------

export function ListaDeRevisoes({
  historico,
  aberta,
  comparando,
}: {
  historico: HistoricoDaMateria;
  /** A revisão aberta (`?ver=N`), se houver. */
  aberta: number | null;
  /** A comparação aberta (`?de=A&para=B`), se houver. */
  comparando: { de: number; para: number } | null;
}) {
  const noSite = revisaoNoSite(historico);
  return (
    <ol className="border-b-(length:--rule-width) border-rule-strong" reversed>
      {historico.revisoes.map((r) => {
        const estaAberta = r.numero === aberta;
        const alvo =
          noSite !== null && noSite !== r.numero
            ? { de: noSite, para: r.numero, rotulo: "Comparar com a publicada" }
            : r.numero > 1
              ? {
                  de: r.numero - 1,
                  para: r.numero,
                  rotulo: "Comparar com a anterior",
                }
              : null;
        const comparacaoAtual =
          alvo !== null &&
          comparando?.de === alvo.de &&
          comparando.para === alvo.para;
        return (
          <li
            className={`grid grid-cols-[2.75rem_minmax(0,1fr)] gap-x-3 gap-y-1 border-t-(length:--rule-width) border-rule pt-[0.9rem] pb-2 first:border-t-0 ${estaAberta ? "-ml-[0.85rem] border-l-(length:--rule-width-strong) border-l-accent pl-[calc(0.85rem-var(--rule-width-strong))]" : ""}`}
            data-revisao={r.numero}
            key={r.numero}
          >
            <p>
              <span className="sr-only">Revisão {r.numero}</span>
              <span
                aria-hidden="true"
                className="font-mono text-[1.5rem] leading-none font-medium"
              >
                {dois(r.numero)}
              </span>
            </p>
            <div className="min-w-0">
              <p className="font-text text-[1rem] leading-[1.35]">
                <span className="font-semibold">{r.autor}</span>{" "}
                <span className="label text-ink-muted">
                  · {rotuloDaFonte(r.origem)}
                </span>
              </p>
              <p className="label text-ink-muted">
                <span className="mono">
                  {formatarDataEHoraDoAdmin(r.criadaEm)}
                </span>
              </p>
              {marcadoresDaRevisao(r, historico).length > 0 && (
                <p className="mt-[0.45rem] flex flex-wrap gap-[0.4rem]">
                  {marcadoresDaRevisao(r, historico).map((m) => (
                    <Marca key={m} tipo={m} />
                  ))}
                </p>
              )}
              <p className="label mt-[0.15rem] flex flex-wrap gap-x-[1.1rem]">
                <Link
                  aria-current={estaAberta ? "true" : undefined}
                  className={`${LINK_DE_ACAO} ${LINK_ATUAL}`}
                  href={`?ver=${r.numero}`}
                >
                  Abrir<span className="sr-only"> a revisão {r.numero}</span>
                </Link>
                {alvo && (
                  <Link
                    aria-current={comparacaoAtual ? "true" : undefined}
                    className={`${LINK_DE_ACAO} ${LINK_ATUAL}`}
                    href={`?de=${alvo.de}&para=${alvo.para}`}
                  >
                    {alvo.rotulo}
                    <span className="sr-only">
                      {" "}
                      (revisão {alvo.de} com a {alvo.para})
                    </span>
                  </Link>
                )}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** O formulário "Comparar duas revisões": GET, com os `<select>` De e Para. */
export function CompararRevisoes({
  revisoes,
  de,
  para,
}: {
  revisoes: readonly RevisaoResumida[];
  de: number;
  para: number;
}) {
  const crescentes = [...revisoes].sort((a, b) => a.numero - b.numero);
  const opcoes = crescentes.map((r) => (
    <option key={r.numero} value={r.numero}>
      Revisão {r.numero}
    </option>
  ));
  const rotulo =
    "font-mono text-label leading-[1.4] font-medium tracking-[0.08em] text-ink-muted uppercase";
  return (
    <form
      aria-labelledby="h-comparar"
      className="mt-6 grid grid-cols-[repeat(2,minmax(0,1fr))] items-end gap-3"
      method="get"
    >
      <p
        className="col-span-full mb-2 font-text text-[0.9375rem] leading-[1.3] font-semibold"
        id="h-comparar"
      >
        Comparar duas revisões
      </p>
      <div className={CAMPO}>
        <label className={rotulo} htmlFor="c-de">
          De
        </label>
        <select className={SELECT} defaultValue={de} id="c-de" name="de">
          {opcoes}
        </select>
      </div>
      <div className={CAMPO}>
        <label className={rotulo} htmlFor="c-para">
          Para
        </label>
        <select className={SELECT} defaultValue={para} id="c-para" name="para">
          {opcoes}
        </select>
      </div>
      <button
        className={`${BOTAO_SECUNDARIO} col-span-full justify-self-start`}
        type="submit"
      >
        Comparar
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Painéis
// ---------------------------------------------------------------------------

interface ContextoDoPainel {
  readonly historico: HistoricoDaMateria;
}

function qualificador(numero: number, historico: HistoricoDaMateria): string {
  if (numero === revisaoNoSite(historico)) return "a publicada";
  if (numero === historico.revisaoEmEdicao) return "a em edição";
  return `a revisão ${numero}`;
}

function Cabecalho({
  id,
  titulo,
  children,
}: {
  id: string;
  titulo: string;
  children: ReactNode;
}) {
  return (
    <div className="border-b-(length:--rule-width) border-rule-strong pb-[0.9rem]">
      <h2
        className="font-display text-section leading-none tracking-[-0.015em]"
        id={id}
      >
        {titulo}
      </h2>
      {children}
    </div>
  );
}

function SubTitulo({
  id,
  titulo,
  nota,
}: {
  id?: string;
  titulo: string;
  nota: string;
}) {
  return (
    <h3
      className="mt-8 flex flex-wrap items-baseline gap-x-[0.9rem] gap-y-[0.4rem] font-display text-row-title leading-[1.06] tracking-[-0.012em] italic"
      id={id}
    >
      {titulo} <span className="label text-ink-muted not-italic">{nota}</span>
    </h3>
  );
}

const LINHA =
  "grid grid-cols-[3.25rem_minmax(0,1fr)] gap-x-3 border-l-(length:--rule-width-strong) py-[0.35rem] pr-2";
const CALHA =
  "flex justify-between pl-2 font-mono text-[0.8125rem] leading-[1.95] font-medium text-ink-muted [font-variant-numeric:tabular-nums]";
const SIMBOLO = "font-semibold text-[1rem] leading-[1.6]";
const TEXTO_DA_LINHA =
  "min-w-0 whitespace-pre-wrap no-underline [overflow-wrap:anywhere]";

function Vazia({ texto }: { texto: string }) {
  return texto === "" ? (
    <span className="sr-only">linha em branco</span>
  ) : (
    <>{texto}</>
  );
}

function Removida({ texto, rotuloSr }: { texto: string; rotuloSr: string }) {
  return (
    <>
      <span className="sr-only">{rotuloSr}</span>
      <del
        className={`${TEXTO_DA_LINHA} text-ink-muted line-through decoration-(length:--rule-width)`}
      >
        <Vazia texto={texto} />
      </del>
    </>
  );
}

function Adicionada({ texto, rotuloSr }: { texto: string; rotuloSr: string }) {
  return (
    <>
      <span className="sr-only">{rotuloSr}</span>
      <ins className={`${TEXTO_DA_LINHA} text-ink`}>
        <Vazia texto={texto} />
      </ins>
    </>
  );
}

/** Comparação de duas revisões (README, "Comparação"). */
export function PainelDeComparacao({
  de,
  para,
  historico,
}: ContextoDoPainel & { de: RevisaoCompleta; para: RevisaoCompleta }) {
  const campos = camposAlterados(de.campos, para.campos);
  const linhas = diffDeLinhas(de.campos.corpo_md, para.campos.corpo_md);
  const { adicionadas, removidas } = resumoDoDiff(linhas);
  const iguais = linhas.length - adicionadas - removidas;
  const itens = comContexto(linhas, 2);
  const proxima = Math.max(...historico.revisoes.map((r) => r.numero)) + 1;
  const linkDaEdicao = `/admin/materias/${historico.id}`;

  return (
    <section
      aria-labelledby="h-comp"
      className="min-w-0"
      data-painel="comparacao"
    >
      <Cabecalho
        id="h-comp"
        titulo={`Revisão ${de.numero} → revisão ${para.numero}`}
      >
        <p className="label mt-[0.6rem] text-ink-muted">
          De {qualificador(de.numero, historico)} ({de.autor},{" "}
          <span className="mono">{formatarDataDoAdmin(de.criadaEm)}</span>) para{" "}
          {qualificador(para.numero, historico)} ({para.autor},{" "}
          <span className="mono">{formatarDataDoAdmin(para.criadaEm)}</span>)
        </p>
        <p
          aria-hidden="true"
          className="label mt-4 flex flex-wrap gap-x-6 gap-y-[0.4rem]"
        >
          <span className="inline-flex items-baseline gap-[0.5em]">
            <b className="font-mono text-[1rem] leading-none font-semibold">
              −
            </b>
            <s className="text-ink-muted decoration-(length:--rule-width)">
              removida
            </s>
          </span>
          <span className="inline-flex items-baseline gap-[0.5em]">
            <b className="font-mono text-[1rem] leading-none font-semibold text-accent">
              +
            </b>
            adicionada
          </span>
          <span className="inline-flex items-baseline gap-[0.5em]">
            <b className="font-mono text-[1rem] leading-none font-semibold">
              ⋯
            </b>
            linhas iguais escondidas
          </span>
        </p>
      </Cabecalho>

      <SubTitulo
        id="h-campos-diff"
        nota={
          campos.length === 0
            ? "nenhum alterado"
            : `${campos.length} ${campos.length === 1 ? "alterado" : "alterados"}`
        }
        titulo="Campos"
      />
      {campos.length > 0 && (
        <dl
          aria-labelledby="h-campos-diff"
          className="mt-3 border-t-(length:--rule-width) border-rule-strong"
        >
          {campos.map((c) => (
            <div
              className="border-b-(length:--rule-width) border-rule py-3"
              key={c.campo}
            >
              <dt className="label mb-[0.35rem] text-ink-muted">{c.rotulo}</dt>
              <dd className="grid font-text text-[1rem] leading-[1.6]">
                <span className={`${LINHA} border-l-rule-strong py-1`}>
                  <span aria-hidden="true" className={CALHA}>
                    <span className={`${SIMBOLO} text-ink`}>−</span>
                  </span>
                  <span className="min-w-0">
                    <Removida
                      rotuloSr={`Antes, na revisão ${de.numero}: `}
                      texto={c.antes}
                    />
                  </span>
                </span>
                <span className={`${LINHA} border-l-accent py-1`}>
                  <span aria-hidden="true" className={CALHA}>
                    <span className={`${SIMBOLO} text-accent`}>+</span>
                  </span>
                  <span className="min-w-0">
                    <Adicionada
                      rotuloSr={`Depois, na revisão ${para.numero}: `}
                      texto={c.depois}
                    />
                  </span>
                </span>
              </dd>
            </div>
          ))}
        </dl>
      )}

      <SubTitulo
        id="h-corpo-diff"
        nota={
          adicionadas + removidas === 0
            ? "sem mudanças"
            : `${removidas} ${removidas === 1 ? "removida" : "removidas"} · ${adicionadas} ${adicionadas === 1 ? "adicionada" : "adicionadas"} · ${iguais} ${iguais === 1 ? "igual" : "iguais"}`
        }
        titulo="Corpo"
      />
      {adicionadas + removidas === 0 ? (
        <p className={`${NOTA} mt-3`}>As duas revisões têm o mesmo corpo.</p>
      ) : (
        <>
          <ol
            aria-describedby="d-diff"
            aria-labelledby="h-corpo-diff"
            className="mt-3 border-y-(length:--rule-width) border-rule-strong font-text text-[1rem] leading-[1.6]"
          >
            {itens.map((item, i) => {
              const separador =
                i > 0 ? "border-t-(length:--rule-width) border-t-rule" : "";
              if (item.tipo === "pulo") {
                const rotulo = `${item.quantidade} linhas iguais (${item.de}–${item.ate})${item.ateOFim ? ", até o fim" : ""}`;
                return (
                  <li
                    className={`${LINHA} ${separador} border-l-transparent`}
                    data-linha="pulo"
                    key={i}
                  >
                    <span aria-hidden="true" className={CALHA}>
                      <span className={SIMBOLO}>⋯</span>
                    </span>
                    <span className="font-mono text-label leading-[1.95] font-medium tracking-[0.08em] text-ink-muted uppercase">
                      {rotulo}
                    </span>
                  </li>
                );
              }
              if (item.tipo === "removida") {
                return (
                  <li
                    className={`${LINHA} ${separador} border-l-rule-strong`}
                    data-linha="removida"
                    key={i}
                  >
                    <span aria-hidden="true" className={CALHA}>
                      <span className={`${SIMBOLO} text-ink`}>−</span>
                      <span>{item.linhaAntes}</span>
                    </span>
                    <span className="min-w-0">
                      <Removida
                        rotuloSr={`Removida, linha ${item.linhaAntes} da revisão ${de.numero}: `}
                        texto={item.texto}
                      />
                    </span>
                  </li>
                );
              }
              if (item.tipo === "adicionada") {
                return (
                  <li
                    className={`${LINHA} ${separador} border-l-accent`}
                    data-linha="adicionada"
                    key={i}
                  >
                    <span aria-hidden="true" className={CALHA}>
                      <span className={`${SIMBOLO} text-accent`}>+</span>
                      <span>{item.linhaDepois}</span>
                    </span>
                    <span className="min-w-0">
                      <Adicionada
                        rotuloSr={`Adicionada, linha ${item.linhaDepois} da revisão ${para.numero}: `}
                        texto={item.texto}
                      />
                    </span>
                  </li>
                );
              }
              return (
                <li
                  className={`${LINHA} ${separador} border-l-transparent`}
                  data-linha="igual"
                  key={i}
                >
                  <span aria-hidden="true" className={CALHA}>
                    <span className={SIMBOLO} />
                    <span>{item.linhaDepois}</span>
                  </span>
                  <span className="min-w-0">
                    <span className="sr-only">
                      Igual, linha {item.linhaDepois}:{" "}
                    </span>
                    <span className={`${TEXTO_DA_LINHA} text-ink-muted`}>
                      <Vazia texto={item.texto} />
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>
          <p className={`${NOTA} mt-3`} id="d-diff">
            Cada linha é um parágrafo do Markdown. A numeração das removidas é a
            da revisão {de.numero}; a das outras, a da revisão {para.numero}.
          </p>
        </>
      )}

      {de.numero !== historico.revisaoEmEdicao && (
        <BotaoDeRestaurar
          linkDaEdicao={linkDaEdicao}
          numero={de.numero}
          proximaRevisao={proxima}
          restaurar={restaurarRevisao.bind(null, historico.id, de.numero)}
          revisaoNoSite={revisaoNoSite(historico)}
          rotulo={`Restaurar a revisão ${de.numero}`}
        />
      )}
    </section>
  );
}

/** Uma revisão aberta (`?ver=N`): a ficha, o corpo cru e "Restaurar esta versão". */
export function PainelDaRevisao({
  revisao,
  historico,
}: ContextoDoPainel & { revisao: RevisaoCompleta }) {
  const noSite = revisaoNoSite(historico);
  const proxima = Math.max(...historico.revisoes.map((r) => r.numero)) + 1;
  const n = revisao.numero;
  return (
    <section aria-labelledby="h-rev" className="min-w-0" data-painel="revisao">
      <Cabecalho id="h-rev" titulo={`Revisão ${n}`}>
        <p className="label mt-[0.6rem] text-ink-muted">
          {revisao.autor} · {rotuloDaFonte(revisao.origem)} ·{" "}
          <span className="mono">
            {formatarDataEHoraDoAdmin(revisao.criadaEm)}
          </span>
        </p>
        <p className="label mt-[0.15rem] flex flex-wrap gap-x-[1.1rem]">
          {n > 1 && (
            <Link className={LINK_DE_ACAO} href={`?de=${n - 1}&para=${n}`}>
              Comparar com a anterior
              <span className="sr-only">
                {" "}
                (revisão {n - 1} com a {n})
              </span>
            </Link>
          )}
          {noSite !== null && noSite !== n && (
            <Link className={LINK_DE_ACAO} href={`?de=${n}&para=${noSite}`}>
              Comparar com a publicada
              <span className="sr-only">
                {" "}
                (revisão {n} com a {noSite})
              </span>
            </Link>
          )}
        </p>
      </Cabecalho>
      {n !== historico.revisaoEmEdicao && (
        <BotaoDeRestaurar
          cheio
          linkDaEdicao={`/admin/materias/${historico.id}`}
          numero={n}
          proximaRevisao={proxima}
          restaurar={restaurarRevisao.bind(null, historico.id, n)}
          revisaoNoSite={noSite}
          rotulo="Restaurar esta versão"
        />
      )}
      <dl className={`${FICHA} mt-5`}>
        {fichaDaRevisao(revisao.campos).map((linha) => (
          <div
            className={`${LINHA_DA_FICHA} min-[30rem]:grid-cols-[9.5rem_minmax(0,1fr)] min-[30rem]:items-baseline`}
            key={linha.rotulo}
          >
            <dt className="label text-ink-muted">{linha.rotulo}</dt>
            <dd
              className={`min-w-0 [overflow-wrap:anywhere] ${linha.mono ? "font-mono text-[0.875rem]" : "font-text text-[1rem] leading-[1.5]"}`}
            >
              {linha.valor}
            </dd>
          </div>
        ))}
      </dl>
      <SubTitulo nota="Markdown, como foi salvo" titulo="Corpo" />
      <div className="mt-3 max-w-(--layout-measure) border-t-(length:--rule-width) border-rule-strong pt-4 font-mono text-[0.9375rem] leading-[1.7] [overflow-wrap:anywhere] whitespace-pre-wrap">
        {revisao.campos.corpo_md}
      </div>
    </section>
  );
}
