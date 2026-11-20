import { LinksDeEditorias } from "./LinksDeEditorias";

type Props = {
  /** Rótulo acessível da <nav>. */
  rotulo: string;
  variante: "cabecalho" | "rodape";
};

/** Classes de cada variante: tokens.md §5.2 (cabeçalho) e §5.3 (rodapé). */
const ESTILOS = {
  /* Cabeçalho: índice numerado (.nav-numerada, em globals.css), quebra de linha, sem rolagem. */
  cabecalho: {
    nav: "border-t-(length:--rule-width) border-b-(length:--rule-width) border-t-rule-strong border-b-rule",
    lista:
      "nav-numerada mx-auto max-w-(--layout-max) gap-x-[1.15rem] px-(--layout-gutter) py-[0.2rem] lg:justify-between",
    // Contorno de foco rente ao link, para não ser cortado nas linhas quebradas.
    link: "items-baseline gap-[0.3rem] pt-[0.7rem] pb-[0.55rem] font-text text-nav leading-none font-medium text-ink [font-stretch:92%] hover:text-accent focus-visible:outline-offset-0 aria-[current=page]:text-accent aria-[current=page]:underline aria-[current=page]:decoration-(length:--rule-width-strong) aria-[current=page]:underline-offset-[0.35em]",
  },
  /* Rodapé: sobre a faixa noturna. */
  rodape: {
    nav: "mt-4",
    lista: "gap-x-[1.1rem]",
    link: "items-center hover:text-amber",
  },
} as const;

/**
 * Os 7 links de editoria, na ordem da lista fechada. A numeração 01–07 do cabeçalho é só CSS.
 * No cabeçalho, a editoria aberta ganha `aria-current="page"` (estilo em ESTILOS.cabecalho).
 */
export function EditoriasNav({ rotulo, variante }: Props) {
  const estilo = ESTILOS[variante];
  return (
    <nav aria-label={rotulo} className={estilo.nav}>
      <LinksDeEditorias
        classeDaLista={`flex flex-wrap ${estilo.lista}`}
        classeDoLink={`inline-flex min-h-(--tap-min) ${estilo.link}`}
        marcarAtual={variante === "cabecalho"}
      />
    </nav>
  );
}
