"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { gerarSlug } from "@/lib/admin/slug";
import {
  camposDaCriacaoDoFormulario,
  estadoDaPrevia,
  frase,
  minutosDeLeitura,
  proximoSlug,
  type PreviaNaTela,
} from "@/lib/admin/telas";
import type {
  CamposDaCriacaoDeEntrada,
  NomeDoCampoDaCriacao,
  ResultadoDoPainel,
} from "@/lib/admin/tipos";
import { EDITORIAS, rotuloDaEditoria, type Editoria } from "@/lib/editorias";
import {
  BOTAO_PRIMARIO_GRANDE,
  BOTAO_SECUNDARIO,
  CAMPO,
  DICA,
  ENTRADA,
  OPCIONAL,
  ROTULO,
  SELECT,
  TITULO_DE_BLOCO,
} from "../classes";
import {
  BlocoDeErros,
  CampoDeTags,
  descritoPor,
  Erro,
  type Falha,
} from "./PartesDoFormulario";

type Props = {
  readonly criar: (
    campos: CamposDaCriacaoDeEntrada,
  ) => Promise<ResultadoDoPainel<{ id: string; slug: string }>>;
  readonly previsualizar: (
    md: string,
  ) => Promise<ResultadoDoPainel<{ html: string }>>;
  readonly tagsExistentes: readonly string[];
  /** O nome do Google de quem está logado (editável). */
  readonly autorPadrao: string;
};

/** A partir daqui, escrever e prévia lado a lado; abaixo, abas (README, "Corpo"). */
const LARGO = "(min-width: 64rem)";
const ESPERA_DA_PREVIA_MS = 400;

function assinarLargura(aviso: () => void): () => void {
  const consulta = window.matchMedia(LARGO);
  consulta.addEventListener("change", aviso);
  return () => consulta.removeEventListener("change", aviso);
}

/**
 * `true` no desktop, `false` no celular e `null` no servidor (e antes da hidratação).
 * Com `null`, os dois painéis aparecem empilhados e sem papéis de aba, como sem JS.
 */
function useLargo(): boolean | null {
  return useSyncExternalStore(
    assinarLargura,
    () => window.matchMedia(LARGO).matches,
    () => null,
  );
}

const ABAS = [
  { id: "t-escrever", painel: "p-escrever", rotulo: "Escrever" },
  { id: "t-previa", painel: "p-previa", rotulo: "Prévia" },
] as const;

const MENSAGEM_DO_ESTADO = {
  vazia: "Em dia com o texto",
  "em-dia": "Em dia com o texto",
  atualizando: "Atualizando a prévia…",
  falhou: "Não deu para atualizar a prévia. O texto não se perde.",
} as const;

/** "Mude o slug…": o complemento do erro de slug repetido (README, "Erro"). */
const DICA_DO_SLUG_REPETIDO =
  "Mude o slug, por exemplo acrescentando -2 no fim.";

/**
 * O editor de "Nova matéria" (história 18, critérios 4 e 5; README de 18-editor).
 *
 * Os campos são os da edição da 17, com as mesmas peças (`PartesDoFormulario`), mais o
 * slug e o corpo com prévia. É de cliente por causa do slug que acompanha o título, das
 * tags, das abas, da prévia e do foco no bloco de erro. Quem valida é o servidor
 * (`criarMateria`), e um envio recusado mantém tudo o que foi digitado (`onSubmit` com
 * `preventDefault`, como na 17).
 *
 * A prévia: o corpo vai para a action `previsualizar` 400 ms depois da última tecla. Cada
 * pedido leva um número; só a resposta do último muda a tela, então uma resposta antiga
 * que chega depois nunca cobre uma nova. Enquanto isso, o HTML anterior continua visível
 * e a região leva `aria-busy`.
 */
export function EditorDeMateria({
  criar,
  previsualizar,
  tagsExistentes,
  autorPadrao,
}: Props) {
  const router = useRouter();
  const largo = useLargo();
  const [aba, setAba] = useState(0);
  const botoesDasAbas = useRef<(HTMLButtonElement | null)[]>([]);

  const [titulo, setTitulo] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEditado, setSlugEditado] = useState(false);
  const [linhaFina, setLinhaFina] = useState("");
  const [editoria, setEditoria] = useState<Editoria>(EDITORIAS[0].slug);
  const [autor, setAutor] = useState(autorPadrao);
  const [tags, setTags] = useState<readonly string[]>([]);
  const [corpo, setCorpo] = useState("");

  const [previa, setPrevia] = useState<PreviaNaTela>({ corpo: "", html: "" });
  const [falhouPara, setFalhouPara] = useState<string | null>(null);
  const ultimoPedido = useRef(0);

  const [falha, setFalha] = useState<Falha | null>(null);
  const [slugRepetido, setSlugRepetido] = useState(false);
  const [criando, iniciar] = useTransition();

  useEffect(() => {
    if (corpo.trim() === "") return;
    // Um número por mudança do corpo: o pedido de um texto que já mudou é ignorado.
    const pedido = ++ultimoPedido.current;
    const espera = setTimeout(async () => {
      try {
        const resultado = await previsualizar(corpo);
        if (pedido !== ultimoPedido.current) return;
        if (resultado.ok) setPrevia({ corpo, html: resultado.html });
        else setFalhouPara(corpo);
      } catch {
        if (pedido === ultimoPedido.current) setFalhouPara(corpo);
      }
    }, ESPERA_DA_PREVIA_MS);
    return () => clearTimeout(espera);
  }, [corpo, previsualizar]);

  const estado = estadoDaPrevia(corpo, previa, falhouPara);
  const erro = (campo: NomeDoCampoDaCriacao) => falha?.campos[campo];

  function irParaAba(indice: number, focar: boolean) {
    const proxima = (indice + ABAS.length) % ABAS.length;
    setAba(proxima);
    if (focar) botoesDasAbas.current[proxima]?.focus();
  }

  function teclaNaAba(evento: KeyboardEvent<HTMLButtonElement>) {
    const destino = {
      ArrowRight: aba + 1,
      ArrowLeft: aba - 1,
      Home: 0,
      End: ABAS.length - 1,
    }[evento.key];
    if (destino === undefined) return;
    evento.preventDefault();
    irParaAba(destino, true);
  }

  /** Os papéis de aba só existem no celular (README: no desktop, são removidos). */
  function atributosDoPainel(indice: number) {
    if (largo !== false) return {};
    return {
      role: "tabpanel",
      "aria-labelledby": ABAS[indice].id,
      hidden: aba !== indice,
    } as const;
  }

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = camposDaCriacaoDoFormulario(
      new FormData(evento.currentTarget),
      tags,
    );
    iniciar(async () => {
      try {
        const resultado = await criar(dados);
        if (resultado.ok) {
          router.push(`/admin/materias/${resultado.id}`);
          return;
        }
        const campos = resultado.errosDosCampos ?? {};
        setSlugRepetido(resultado.erro === "slug_ja_existe");
        setFalha({ mensagem: resultado.mensagem, campos });
        // O link do bloco de erro para o corpo precisa do painel Escrever aberto.
        if (campos.corpo_md) setAba(0);
      } catch {
        setSlugRepetido(false);
        setFalha({
          mensagem: "Não foi possível criar. Tente de novo em instantes.",
          campos: {},
        });
      }
    });
  }

  return (
    <form
      aria-labelledby="h-form"
      className="mt-8"
      noValidate
      onSubmit={enviar}
    >
      <h2 className="sr-only" id="h-form">
        Campos da nova matéria
      </h2>

      {falha && <BlocoDeErros falha={falha} titulo="Não criou" />}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-x-12 gap-y-(--space-section) lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-start">
        <section aria-labelledby="h-materia" className="min-w-0">
          <h2 className={`${TITULO_DE_BLOCO} mb-6`} id="h-materia">
            Matéria
          </h2>
          <div className="grid gap-6">
            <div className={CAMPO}>
              <label className={ROTULO} htmlFor="c-titulo">
                Título
              </label>
              <input
                aria-describedby={descritoPor(erro("titulo") && "e-titulo")}
                aria-invalid={erro("titulo") ? true : undefined}
                className={ENTRADA}
                id="c-titulo"
                name="titulo"
                onChange={(e) => {
                  setTitulo(e.target.value);
                  setSlug(proximoSlug(e.target.value, slug, slugEditado));
                }}
                required
                value={titulo}
              />
              {erro("titulo") && (
                <Erro id="e-titulo">{frase(erro("titulo")!)}</Erro>
              )}
            </div>

            <div className={CAMPO}>
              <label className={ROTULO} htmlFor="c-slug">
                Slug
              </label>
              <div className="flex flex-wrap items-stretch gap-2">
                <div className="flex min-w-0 flex-[1_1_16rem] items-stretch border-(length:--rule-width) border-rule-strong has-[[aria-invalid=true]]:border-(length:--rule-width-strong)">
                  <span
                    aria-hidden="true"
                    className="inline-flex flex-none items-center pr-[0.1rem] pl-3 font-mono text-[0.8125rem] leading-none font-medium text-ink-muted"
                  >
                    /materias/
                  </span>
                  <input
                    aria-describedby={descritoPor(
                      erro("slug") && "e-slug",
                      "d-slug",
                      "a-slug",
                    )}
                    aria-invalid={erro("slug") ? true : undefined}
                    autoCapitalize="none"
                    autoComplete="off"
                    className="m-0 min-h-11 w-full min-w-0 flex-auto rounded-none border-0 bg-transparent py-[0.55rem] pr-3 pl-[0.1rem] font-mono text-[0.875rem] leading-[1.45] font-medium text-ink focus-visible:outline-offset-0"
                    id="c-slug"
                    name="slug"
                    onChange={(e) => {
                      setSlug(e.target.value);
                      setSlugEditado(true);
                    }}
                    required
                    spellCheck={false}
                    value={slug}
                  />
                </div>
                <button
                  aria-describedby="d-usar"
                  className={`${BOTAO_SECUNDARIO} min-h-11`}
                  onClick={() => {
                    setSlug(gerarSlug(titulo));
                    setSlugEditado(false);
                  }}
                  type="button"
                >
                  Usar o título
                </button>
              </div>
              {erro("slug") && (
                <Erro id="e-slug">
                  {frase(erro("slug")!)}
                  {slugRepetido && ` ${DICA_DO_SLUG_REPETIDO}`}
                </Erro>
              )}
              <p className={DICA} id="d-slug">
                Sugerido a partir do título enquanto você não mexer nele. Letras
                minúsculas sem acento, números e hífen.
              </p>
              <p className="sr-only" id="d-usar">
                Troca o slug pela sugestão feita a partir do título.
              </p>
              <p
                className="flex gap-[0.5em] border-l-(length:--rule-width-strong) border-dashed border-rule-strong py-2 pl-3 font-text text-[0.875rem] leading-[1.45]"
                id="a-slug"
              >
                <span aria-hidden="true" className="font-medium">
                  ◐
                </span>
                <span>
                  <strong className="font-semibold">
                    O slug não muda depois de criado.
                  </strong>{" "}
                  Ele vira o endereço da matéria no site.
                </span>
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
                id="c-fina"
                name="linha_fina"
                onChange={(e) => setLinhaFina(e.target.value)}
                required
                rows={3}
                value={linhaFina}
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
                id="c-editoria"
                name="editoria"
                onChange={(e) => setEditoria(e.target.value as Editoria)}
                value={editoria}
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
                  Escolha uma tag que já existe ou digite um slug novo (a-z, 0-9
                  e hífen). A tag nova fica com filete tracejado, e o nome dela
                  sai do slug: “paris-fc” vira “Paris Fc”.
                </>
              }
              erro={erro("tags")}
              marcarNovas
              tags={tags}
              tagsExistentes={tagsExistentes}
            />

            <div className={CAMPO}>
              <label className={ROTULO} htmlFor="c-autor">
                Autor
              </label>
              <input
                aria-describedby={descritoPor(
                  erro("autor") && "e-autor",
                  "d-autor",
                )}
                aria-invalid={erro("autor") ? true : undefined}
                className={`${ENTRADA} max-w-80`}
                id="c-autor"
                name="autor"
                onChange={(e) => setAutor(e.target.value)}
                required
                value={autor}
              />
              {erro("autor") && (
                <Erro id="e-autor">{frase(erro("autor")!)}</Erro>
              )}
              <p className={DICA} id="d-autor">
                Vem do seu nome no Google. É a assinatura da matéria no site.
              </p>
            </div>

            <div className="grid grid-cols-[1.25rem_minmax(0,1fr)] items-start gap-x-3 gap-y-1">
              <input
                aria-describedby={descritoPor(
                  erro("ficticio") && "e-ficticio",
                  "d-ficticio",
                )}
                aria-invalid={erro("ficticio") ? true : undefined}
                className="m-0 mt-[0.1rem] size-5 accent-ink"
                defaultChecked={false}
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
                Só para textos de demonstração. Mostra o selo Exemplo e o aviso,
                tira a matéria do sitemap e da busca do Google e nunca a põe no
                destaque da capa.
              </p>
            </div>
          </div>
        </section>

        <section aria-labelledby="h-busca" className="min-w-0">
          <h2 className={`${TITULO_DE_BLOCO} mb-6`} id="h-busca">
            Buscadores
          </h2>
          <div className="grid gap-6">
            <div className={CAMPO}>
              <label className={ROTULO} htmlFor="c-seo">
                Título para buscadores{" "}
                <span className={OPCIONAL}>(opcional)</span>
              </label>
              <input
                aria-describedby={descritoPor(
                  erro("titulo_seo") && "e-seo",
                  "d-seo",
                )}
                aria-invalid={erro("titulo_seo") ? true : undefined}
                className={ENTRADA}
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
                id="c-meta"
                name="meta_description"
                rows={4}
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
          </div>
        </section>
      </div>

      <section aria-labelledby="h-corpo" className="mt-(--space-section)">
        <h2 className={TITULO_DE_BLOCO} id="h-corpo">
          Corpo
        </h2>
        {largo === false && (
          <div
            aria-label="Corpo"
            className="flex border-b-(length:--rule-width) border-rule"
            role="tablist"
          >
            {ABAS.map(({ id, painel, rotulo }, indice) => (
              <button
                aria-controls={painel}
                aria-selected={aba === indice}
                className="-mb-px min-h-11 min-w-0 flex-[1_1_0] cursor-pointer rounded-none border-0 border-b-(length:--rule-width-strong) border-transparent bg-transparent px-2 py-[0.4rem] font-text text-nav leading-[1.2] font-medium [overflow-wrap:anywhere] text-ink-muted [font-stretch:92%] hover:text-accent focus-visible:outline-offset-[calc(-1*var(--focus-width))] aria-selected:border-accent aria-selected:font-semibold aria-selected:text-accent"
                id={id}
                key={id}
                onClick={() => irParaAba(indice, false)}
                onKeyDown={teclaNaAba}
                ref={(botao) => {
                  botoesDasAbas.current[indice] = botao;
                }}
                role="tab"
                tabIndex={aba === indice ? 0 : -1}
                type="button"
              >
                {rotulo}
              </button>
            ))}
          </div>
        )}
        <div className="grid grid-cols-[minmax(0,1fr)] gap-x-10 gap-y-5 pt-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
          <div
            className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-[0.4rem]"
            id="p-escrever"
            {...atributosDoPainel(0)}
          >
            <div className="flex min-h-6 flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <label className={ROTULO} htmlFor="c-corpo">
                Texto em Markdown
              </label>
            </div>
            <textarea
              aria-describedby={descritoPor(
                erro("corpo_md") && "e-corpo",
                "d-corpo",
              )}
              aria-invalid={erro("corpo_md") ? true : undefined}
              className={`${ENTRADA} min-h-[28rem] resize-y font-mono text-[0.9375rem] leading-[1.65] lg:min-h-[40rem]`}
              id="c-corpo"
              name="corpo_md"
              onChange={(e) => setCorpo(e.target.value)}
              required
              rows={24}
              spellCheck
              value={corpo}
            />
            {erro("corpo_md") && (
              <Erro id="e-corpo">{frase(erro("corpo_md")!)}</Erro>
            )}
            <p className={DICA} id="d-corpo">
              Um parágrafo por linha, com uma linha em branco entre eles.{" "}
              <span className="mono">## </span>subtítulo,{" "}
              <span className="mono">- </span>lista,{" "}
              <span className="mono">&gt; </span>citação e{" "}
              <span className="mono">[texto](endereço)</span> para link.
            </p>
          </div>

          <div
            className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-[0.4rem] lg:sticky lg:top-4"
            id="p-previa"
            {...atributosDoPainel(1)}
          >
            <div className="flex min-h-6 flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <p className={ROTULO} id="r-previa">
                Prévia <span className={OPCIONAL}>· como sai no site</span>
              </p>
              {/* Dentro do painel da prévia: no celular, quem está em Escrever não ouve
                  um anúncio a cada pausa (README, "Atualização da prévia"). */}
              <p
                aria-live="polite"
                className="label inline-flex items-center gap-[0.45em] text-ink-muted"
                data-estado-da-previa={estado}
                role="status"
              >
                {estado === "atualizando" ? (
                  <span className="border-(length:--rule-width) border-dashed border-rule-strong px-[0.45rem] py-[0.2rem] text-ink">
                    <span
                      aria-hidden="true"
                      className="mr-[0.4em] text-[1.1em]"
                    >
                      ◌
                    </span>
                    {MENSAGEM_DO_ESTADO.atualizando}
                  </span>
                ) : estado === "falhou" ? (
                  <span className="text-ink">{MENSAGEM_DO_ESTADO.falhou}</span>
                ) : (
                  MENSAGEM_DO_ESTADO[estado]
                )}
              </p>
            </div>
            <div
              aria-busy={estado === "atualizando" ? true : undefined}
              aria-labelledby="r-previa"
              className="border-(length:--rule-width) border-dashed border-rule-strong focus-visible:outline-offset-0 lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto"
              id="previa"
              role="region"
              tabIndex={0}
            >
              {/* O topo é montado aqui, só com o texto dos campos (o React escapa tudo).
                  O título é um <p>: o único h1 da página é "Nova matéria". */}
              <div className="bg-night px-[clamp(1rem,3vw,2rem)] pt-[clamp(1.25rem,3vw,2rem)] pb-5 text-night-ink">
                <p className="label flex flex-wrap gap-x-[0.8rem] gap-y-[0.35rem]">
                  <span className="text-amber">
                    {rotuloDaEditoria(editoria)}
                  </span>
                </p>
                <p className="mt-[0.8rem] max-w-[18ch] font-display text-feature leading-[0.95] font-normal tracking-[-0.03em] text-balance">
                  {titulo.trim() || "Sem título"}
                </p>
                {linhaFina.trim() !== "" && (
                  <p className="mt-4 max-w-[50ch] border-t-(length:--rule-width) border-night-rule pt-[0.9rem] font-text text-[length:clamp(1.0625rem,1rem+0.3vw,1.1875rem)] leading-[1.45] font-medium text-pretty">
                    {linhaFina}
                  </p>
                )}
                <dl className="label mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-[0.3rem]">
                  <dt className="text-night-ink-muted">Por</dt>
                  <dd>{autor.trim() || "—"}</dd>
                  <dt className="text-night-ink-muted">Data</dt>
                  <dd className="mono">ao publicar</dd>
                  <dt className="text-night-ink-muted">Leitura</dt>
                  <dd className="mono">
                    {minutosDeLeitura(corpo)} min de leitura
                  </dd>
                </dl>
              </div>
              <div className="px-[clamp(1rem,3vw,2rem)] pb-6">
                {estado === "vazia" ? (
                  <p className="mt-6 font-display text-row-title leading-[1.2] text-ink-muted italic">
                    A prévia aparece aqui quando você escrever.
                  </p>
                ) : (
                  <div
                    className="prosa mt-6 max-w-(--layout-measure)"
                    // ADR 0004: este HTML vem SÓ da action `previsualizar`, que usa o
                    // mesmo `renderMarkdown` sanitizado do site (sem <script>, on* nem
                    // javascript:). Nenhum outro texto entra aqui.
                    dangerouslySetInnerHTML={{ __html: previa.html }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3 border-t-(length:--rule-width) border-rule-strong pt-5">
        <button
          aria-describedby="d-criar"
          className={`${BOTAO_PRIMARIO_GRANDE} max-w-full py-[0.55rem] text-center leading-[1.2] whitespace-normal`}
          disabled={criando}
          type="submit"
        >
          {criando ? "Criando…" : "Criar rascunho"}
        </button>
        <p className={`${DICA} max-w-[60ch] flex-[1_1_20rem]`} id="d-criar">
          Cria a matéria como <b>○ rascunho</b>, fora do site, e abre a página
          de edição, onde você publica.
        </p>
      </div>
    </form>
  );
}
