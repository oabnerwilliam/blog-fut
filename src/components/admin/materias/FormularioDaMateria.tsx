"use client";

import { useState, useTransition, type FormEvent } from "react";
import { EDITORIAS } from "@/lib/editorias";
import { camposDoFormulario, frase } from "@/lib/admin/telas";
import type {
  CamposDaRevisao,
  CamposEditoriaisDeEntrada,
  NomeDoCampo,
  ResultadoDoPainel,
} from "@/lib/admin/tipos";
import {
  BOTAO_PRIMARIO_GRANDE,
  CAMPO,
  DICA,
  ENTRADA,
  OPCIONAL,
  ROTULO,
  SELECT,
  TITULO_DE_BLOCO,
} from "../classes";
import { useAvisar } from "../RetornoDasAcoes";
import {
  BlocoDeErros,
  CampoDeTags,
  descritoPor,
  Erro,
  type Falha,
} from "./PartesDoFormulario";

type Props = {
  /** A server action já ligada à matéria (`salvarRevisao.bind(null, id)`). */
  readonly salvar: (
    campos: CamposEditoriaisDeEntrada,
  ) => Promise<ResultadoDoPainel<{ numero: number }>>;
  readonly campos: CamposDaRevisao;
  readonly tagsExistentes: readonly string[];
  /** O número que a próxima revisão salva vai ter. */
  readonly proximaRevisao: number;
  readonly revisaoEmEdicao: number;
  /** A revisão que o leitor vê agora; nula quando a matéria não está no site. */
  readonly revisaoNoSite: number | null;
};

/**
 * O formulário dos campos editoriais (história 17, critério 4; README, "Edição").
 *
 * É de cliente por três motivos: as tags (lista com remover e o campo de adicionar), o
 * foco no bloco de erro depois de um salvamento que falhou, e a conversão do formulário
 * (opcional vazio vira `null`) antes da action. Quem valida é o servidor
 * (`salvarRevisao`), com o zod da v1.
 *
 * `onSubmit` com `preventDefault`, e não `<form action>`: depois de uma action, o React
 * limpa os campos não controlados do formulário, e a pessoa perderia o que digitou
 * quando o servidor recusa.
 */
export function FormularioDaMateria({
  salvar,
  campos,
  tagsExistentes,
  proximaRevisao,
  revisaoEmEdicao,
  revisaoNoSite,
}: Props) {
  const avisar = useAvisar();
  const [tags, setTags] = useState<readonly string[]>(campos.tags);
  const [falha, setFalha] = useState<Falha | null>(null);
  const [salvando, iniciar] = useTransition();

  const erro = (campo: NomeDoCampo) => falha?.campos[campo];

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = camposDoFormulario(new FormData(evento.currentTarget), tags);
    iniciar(async () => {
      try {
        const resultado = await salvar(dados);
        if (resultado.ok) {
          setFalha(null);
          avisar(
            resultado.numero === revisaoEmEdicao ? (
              <>
                Nada mudou desde a revisão <strong>{resultado.numero}</strong>.
                Nenhuma revisão nova foi criada.
              </>
            ) : (
              <>
                Revisão <strong>{resultado.numero}</strong> salva.{" "}
                {revisaoNoSite === null
                  ? "A matéria continua fora do site até você publicar."
                  : `O site continua mostrando a revisão ${revisaoNoSite} até você publicar.`}
              </>
            ),
          );
          return;
        }
        avisar(null);
        setFalha({
          mensagem: resultado.mensagem,
          campos: resultado.errosDosCampos ?? {},
        });
      } catch {
        setFalha({
          mensagem: "Não foi possível salvar. Tente de novo em instantes.",
          campos: {},
        });
      }
    });
  }

  return (
    <form
      aria-labelledby="h-campos"
      className="min-w-0 lg:col-start-1 lg:row-start-1"
      noValidate
      onSubmit={enviar}
    >
      <h2 className={`${TITULO_DE_BLOCO} mb-6`} id="h-campos">
        Campos editoriais
      </h2>

      {falha && <BlocoDeErros falha={falha} titulo="Não salvou" />}

      <div className="grid gap-6">
        <div className={CAMPO}>
          <label className={ROTULO} htmlFor="c-titulo">
            Título
          </label>
          <input
            aria-describedby={descritoPor(erro("titulo") && "e-titulo")}
            aria-invalid={erro("titulo") ? true : undefined}
            className={ENTRADA}
            defaultValue={campos.titulo}
            id="c-titulo"
            name="titulo"
            required
          />
          {erro("titulo") && (
            <Erro id="e-titulo">{frase(erro("titulo")!)}</Erro>
          )}
        </div>

        <div className={CAMPO}>
          <label className={ROTULO} htmlFor="c-seo">
            Título para buscadores <span className={OPCIONAL}>(opcional)</span>
          </label>
          <input
            aria-describedby={descritoPor(
              erro("titulo_seo") && "e-seo",
              "d-seo",
            )}
            aria-invalid={erro("titulo_seo") ? true : undefined}
            className={ENTRADA}
            defaultValue={campos.titulo_seo ?? ""}
            id="c-seo"
            name="titulo_seo"
          />
          {erro("titulo_seo") && (
            <Erro id="e-seo">{frase(erro("titulo_seo")!)}</Erro>
          )}
          <p className={DICA} id="d-seo">
            Aparece na aba do navegador e no Google. Vazio, usa o título.
          </p>
        </div>

        <div className={CAMPO}>
          <label className={ROTULO} htmlFor="c-fina">
            Linha fina
          </label>
          <textarea
            aria-describedby={descritoPor(erro("linha_fina") && "e-fina")}
            aria-invalid={erro("linha_fina") ? true : undefined}
            className={`${ENTRADA} resize-y`}
            defaultValue={campos.linha_fina}
            id="c-fina"
            name="linha_fina"
            required
            rows={4}
          />
          {erro("linha_fina") && (
            <Erro id="e-fina">{frase(erro("linha_fina")!)}</Erro>
          )}
        </div>

        <div className={CAMPO}>
          <label className={ROTULO} htmlFor="c-editoria">
            Editoria
          </label>
          <select
            aria-describedby={descritoPor(erro("editoria") && "e-editoria")}
            aria-invalid={erro("editoria") ? true : undefined}
            className={`${SELECT} max-w-80`}
            defaultValue={campos.editoria}
            id="c-editoria"
            name="editoria"
          >
            {EDITORIAS.map((e) => (
              <option key={e.slug} value={e.slug}>
                {e.rotulo}
              </option>
            ))}
          </select>
          {erro("editoria") && (
            <Erro id="e-editoria">{frase(erro("editoria")!)}</Erro>
          )}
        </div>

        <CampoDeTags
          aoMudar={setTags}
          dica={
            <>
              Escolha uma tag que já existe ou digite um slug novo (a-z, 0-9 e
              hífen). O nome de uma tag nova sai do slug: “paris-fc” vira “Paris
              Fc”.
            </>
          }
          erro={erro("tags")}
          tags={tags}
          tagsExistentes={tagsExistentes}
        />

        <div className={CAMPO}>
          <label className={ROTULO} htmlFor="c-meta">
            Descrição para buscadores{" "}
            <span className={OPCIONAL}>(opcional)</span>
          </label>
          <textarea
            aria-describedby={descritoPor(
              erro("meta_description") && "e-meta",
              "d-meta",
            )}
            aria-invalid={erro("meta_description") ? true : undefined}
            className={`${ENTRADA} resize-y`}
            defaultValue={campos.meta_description ?? ""}
            id="c-meta"
            name="meta_description"
            rows={3}
          />
          {erro("meta_description") && (
            <Erro id="e-meta">{frase(erro("meta_description")!)}</Erro>
          )}
          <p className={DICA} id="d-meta">
            Até uns 160 caracteres. Vazio, usa a linha fina.
          </p>
        </div>

        <div className={CAMPO}>
          <label className={ROTULO} htmlFor="c-chaves">
            Palavras-chave <span className={OPCIONAL}>(opcional)</span>
          </label>
          <textarea
            aria-describedby={descritoPor(
              erro("palavras_chave") && "e-chaves",
              "d-chaves",
            )}
            aria-invalid={erro("palavras_chave") ? true : undefined}
            className={`${ENTRADA} resize-y`}
            defaultValue={campos.palavras_chave.join("\n")}
            id="c-chaves"
            name="palavras_chave"
            rows={4}
          />
          {erro("palavras_chave") && (
            <Erro id="e-chaves">{frase(erro("palavras_chave")!)}</Erro>
          )}
          <p className={DICA} id="d-chaves">
            Uma por linha.
          </p>
        </div>

        <div className={CAMPO}>
          <label className={ROTULO} htmlFor="c-autor">
            Autor
          </label>
          <input
            aria-describedby={descritoPor(erro("autor") && "e-autor")}
            aria-invalid={erro("autor") ? true : undefined}
            className={`${ENTRADA} max-w-80`}
            defaultValue={campos.autor}
            id="c-autor"
            name="autor"
            required
          />
          {erro("autor") && <Erro id="e-autor">{frase(erro("autor")!)}</Erro>}
        </div>

        <div className="grid grid-cols-[1.25rem_minmax(0,1fr)] items-start gap-x-3 gap-y-1">
          <input
            aria-describedby={descritoPor(
              erro("ficticio") && "e-ficticio",
              "d-ficticio",
            )}
            aria-invalid={erro("ficticio") ? true : undefined}
            className="m-0 mt-[0.1rem] size-5 accent-ink"
            defaultChecked={campos.ficticio}
            id="c-ficticio"
            name="ficticio"
            type="checkbox"
          />
          <label className={ROTULO} htmlFor="c-ficticio">
            Conteúdo fictício
          </label>
          {erro("ficticio") && (
            <div className="col-start-2">
              <Erro id="e-ficticio">{frase(erro("ficticio")!)}</Erro>
            </div>
          )}
          <p className={`${DICA} col-start-2`} id="d-ficticio">
            Mostra o selo Exemplo e o aviso, tira a matéria do sitemap e da
            busca do Google e nunca a põe no destaque da capa.
          </p>
        </div>

        <div className={CAMPO}>
          <label className={ROTULO} htmlFor="c-corpo">
            Corpo
          </label>
          <textarea
            aria-describedby={descritoPor(
              erro("corpo_md") && "e-corpo",
              "d-corpo",
            )}
            aria-invalid={erro("corpo_md") ? true : undefined}
            className={`${ENTRADA} min-h-96 resize-y font-mono text-[0.9375rem] leading-[1.65]`}
            defaultValue={campos.corpo_md}
            id="c-corpo"
            name="corpo_md"
            required
            rows={22}
            spellCheck
          />
          {erro("corpo_md") && (
            <Erro id="e-corpo">{frase(erro("corpo_md")!)}</Erro>
          )}
          <p className={DICA} id="d-corpo">
            Markdown. Um parágrafo por linha, com uma linha em branco entre
            eles: o histórico compara o corpo linha a linha.
          </p>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3 border-t-(length:--rule-width) border-rule-strong pt-5">
        <button
          aria-describedby="d-salvar"
          className={BOTAO_PRIMARIO_GRANDE}
          disabled={salvando}
          type="submit"
        >
          {salvando ? "Salvando…" : "Salvar"}
        </button>
        <p className={DICA} id="d-salvar">
          Cria a revisão {proximaRevisao}. O site não muda até você publicar.
        </p>
      </div>
    </form>
  );
}
