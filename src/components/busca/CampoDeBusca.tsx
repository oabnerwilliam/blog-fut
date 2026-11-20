import { TAMANHO_MAXIMO_DO_TERMO } from "@/lib/busca";

/**
 * Peças do campo de busca (docs/design/06-busca/notas.md §3), iguais no cabeçalho e na
 * página `/busca`. HTML puro: o formulário funciona sem JavaScript.
 *
 * Filete forte (`--color-rule-strong`, que é limite de controle; o `--color-rule` é só
 * decorativo), raio 0 e sem fundo. O botão recua um filete para as bordas virarem uma só,
 * e o elemento focado sobe (`z-1`) para o contorno passar por cima do vizinho.
 */

type Tamanho = { grande?: boolean };

const FOCO_POR_CIMA = "focus-visible:relative focus-visible:z-1";

const ENTRADA = `min-w-0 flex-auto appearance-none rounded-none border-(length:--rule-width) border-rule-strong bg-transparent px-3 font-text leading-[1.2] text-ink placeholder:text-ink-muted placeholder:opacity-100 ${FOCO_POR_CIMA}`;
/** Fonte de no mínimo 1rem: abaixo disso, o iOS dá zoom ao focar o campo. */
const ENTRADA_NORMAL = "min-h-(--tap-min) text-[1rem]";
const ENTRADA_GRANDE = "min-h-12 text-dek";

const BOTAO = `label ml-[calc(-1*var(--rule-width))] flex-none cursor-pointer rounded-none border-(length:--rule-width) border-rule-strong bg-transparent leading-none font-semibold text-ink hover:text-accent ${FOCO_POR_CIMA}`;
const BOTAO_NORMAL = "min-h-(--tap-min) px-[0.9rem]";
const BOTAO_GRANDE = "min-h-12 px-[1.1rem]";

/** Linha do campo: entrada e botão lado a lado, sem passar da largura do pai. */
export const LINHA_DO_CAMPO = "flex w-full min-w-0";

type EntradaProps = Tamanho & {
  id: string;
  /** Valor inicial. O campo do cabeçalho sai sempre vazio (decisão da história 06). */
  termo?: string;
  placeholder?: string;
};

export function EntradaDeBusca({
  id,
  termo,
  placeholder,
  grande = false,
}: EntradaProps) {
  return (
    <input
      autoComplete="off"
      className={`${ENTRADA} ${grande ? ENTRADA_GRANDE : ENTRADA_NORMAL}`}
      defaultValue={termo}
      enterKeyHint="search"
      id={id}
      // Só ajuda o leitor: o corte de verdade é o `lerTermo`.
      maxLength={TAMANHO_MAXIMO_DO_TERMO}
      name="q"
      placeholder={placeholder}
      type="search"
    />
  );
}

export function BotaoDeBusca({ grande = false }: Tamanho) {
  return (
    <button
      className={`${BOTAO} ${grande ? BOTAO_GRANDE : BOTAO_NORMAL}`}
      type="submit"
    >
      Buscar
    </button>
  );
}

/** Campo do cabeçalho, em todas as páginas. Não lê a query, para não tornar as páginas dinâmicas. */
export function BuscaDoCabecalho() {
  return (
    <form
      action="/busca"
      aria-label="Buscar no portal"
      className={LINHA_DO_CAMPO}
      method="get"
      role="search"
    >
      <label className="sr-only" htmlFor="q-cabecalho">
        Buscar matérias
      </label>
      <EntradaDeBusca id="q-cabecalho" placeholder="Clube, jogador, tema" />
      <BotaoDeBusca />
    </form>
  );
}
