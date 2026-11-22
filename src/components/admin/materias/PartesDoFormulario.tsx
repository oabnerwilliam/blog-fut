"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  conferirTagNova,
  frase,
  IDS_DOS_CAMPOS,
  ROTULOS_DOS_CAMPOS,
} from "@/lib/admin/telas";
import type { ErrosDaCriacao, NomeDoCampoDaCriacao } from "@/lib/admin/tipos";
import {
  BLOCO_DE_ERRO,
  BOTAO_SECUNDARIO,
  CAMPO,
  DICA,
  ENTRADA,
  LINK,
  MENSAGEM_DE_ERRO,
  ROTULO,
} from "../classes";

/**
 * Peças dos formulários de matéria: a edição (história 17) e a criação (história 18)
 * usam as mesmas. O README de 18-editor pede "os mesmos componentes e a mesma aparência
 * da 17".
 */

/** O que deu errado no último envio: a frase geral e a de cada campo. */
export interface Falha {
  readonly mensagem: string;
  readonly campos: ErrosDaCriacao;
}

/** `aria-describedby` com o erro (quando há) antes da dica. */
export function descritoPor(
  ...ids: (string | false | undefined)[]
): string | undefined {
  const lista = ids.filter(Boolean).join(" ");
  return lista || undefined;
}

export function Erro({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p className={MENSAGEM_DE_ERRO} id={id}>
      {children}
    </p>
  );
}

/**
 * O bloco `role="alert"` depois de um envio recusado, com um link para cada campo. O foco
 * vai para ele a cada falha nova (README da 17, "Erros").
 */
export function BlocoDeErros({
  falha,
  titulo,
}: {
  falha: Falha;
  /** "Não salvou" ou "Não criou". */
  titulo: string;
}) {
  const bloco = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bloco.current?.focus();
  }, [falha]);
  const comErro = Object.keys(falha.campos) as NomeDoCampoDaCriacao[];
  return (
    <div
      className={`${BLOCO_DE_ERRO} mb-6`}
      ref={bloco}
      role="alert"
      tabIndex={-1}
    >
      <p className="label">✕ {titulo}</p>
      <div className="grid gap-1 font-text text-[1rem] leading-[1.45]">
        {comErro.length > 0 ? (
          <>
            <p>
              {comErro.length === 1
                ? "Um campo precisa de ajuste:"
                : `${comErro.length} campos precisam de ajuste:`}
            </p>
            {comErro.map((campo) => (
              <a
                className={`inline-flex min-h-7 items-center [overflow-wrap:anywhere] ${LINK}`}
                href={`#${IDS_DOS_CAMPOS[campo]}`}
                key={campo}
              >
                {ROTULOS_DOS_CAMPOS[campo]}: {falha.campos[campo]}
              </a>
            ))}
          </>
        ) : (
          <p>{falha.mensagem}</p>
        )}
      </div>
    </div>
  );
}

/**
 * As tags: a lista com "Remover" e o campo de adicionar, com as existentes no `datalist`.
 * Com `marcarNovas` (criação), a tag que ainda não existe no banco tem filete tracejado e
 * leva " (tag nova)" para o leitor de tela (README de 18-editor, "Tags").
 */
export function CampoDeTags({
  tags,
  aoMudar,
  tagsExistentes,
  erro,
  marcarNovas = false,
  dica,
}: {
  tags: readonly string[];
  aoMudar: (tags: readonly string[]) => void;
  tagsExistentes: readonly string[];
  /** O erro do servidor para o campo, já na frase da tela. */
  erro?: string;
  marcarNovas?: boolean;
  dica: ReactNode;
}) {
  const [tagNova, setTagNova] = useState("");
  const [erroDaTag, setErroDaTag] = useState<string | null>(null);

  function adicionar() {
    const conferida = conferirTagNova(tagNova, tags);
    if (conferida === null) {
      setTagNova("");
      setErroDaTag(null);
      return;
    }
    if (!conferida.ok) {
      setErroDaTag(conferida.mensagem);
      return;
    }
    aoMudar([...tags, conferida.slug]);
    setTagNova("");
    setErroDaTag(null);
  }

  const mensagem = erroDaTag ?? (erro && frase(erro));
  return (
    <fieldset className={`${CAMPO} m-0 min-w-0 border-0 p-0`}>
      <legend className={`${ROTULO} mb-[0.4rem] p-0`}>Tags</legend>
      {tags.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {tags.map((tag) => {
            const nova = marcarNovas && !tagsExistentes.includes(tag);
            return (
              <li
                className={`inline-flex max-w-full items-center gap-1 border-(length:--rule-width) border-rule-strong pl-[0.6rem] font-mono text-[0.8125rem] leading-none font-medium [overflow-wrap:anywhere] ${nova ? "border-dashed" : ""}`}
                data-tag-nova={nova ? "" : undefined}
                key={tag}
              >
                {tag}
                {nova && <span className="sr-only"> (tag nova)</span>}
                <button
                  aria-label={`Remover ${tag}`}
                  className="m-0 inline-grid min-h-9 w-9 cursor-pointer place-items-center border-0 border-l-(length:--rule-width) border-rule bg-transparent p-0 font-mono text-[0.875rem] leading-none font-medium text-ink hover:text-accent focus-visible:outline-offset-0"
                  onClick={() => aoMudar(tags.filter((t) => t !== tag))}
                  type="button"
                >
                  ✕
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <div className="mt-2 flex flex-wrap gap-2">
        <label className="sr-only" htmlFor="c-tag">
          Adicionar tag
        </label>
        <input
          aria-describedby={descritoPor(mensagem && "e-tag", "d-tags")}
          aria-invalid={mensagem ? true : undefined}
          autoComplete="off"
          className={`${ENTRADA} w-auto min-w-0 flex-[1_1_8rem]`}
          id="c-tag"
          list="tags-existentes"
          onChange={(e) => setTagNova(e.target.value)}
          onKeyDown={(e) => {
            // Enter acrescenta a tag, em vez de enviar o formulário inteiro.
            if (e.key === "Enter") {
              e.preventDefault();
              adicionar();
            }
          }}
          placeholder="Adicionar tag"
          value={tagNova}
        />
        <button
          className={`${BOTAO_SECUNDARIO} min-h-11`}
          onClick={adicionar}
          type="button"
        >
          Adicionar
        </button>
      </div>
      <datalist id="tags-existentes">
        {tagsExistentes
          .filter((t) => !tags.includes(t))
          .map((t) => (
            <option key={t} value={t} />
          ))}
      </datalist>
      {mensagem && <Erro id="e-tag">{mensagem}</Erro>}
      <p className={DICA} id="d-tags">
        {dica}
      </p>
    </fieldset>
  );
}
