import { ANO_DO_COLOFAO, NOME_DO_PORTAL } from "@/lib/site";
import { EditoriasNav } from "./EditoriasNav";

/** Rodapé na faixa noturna (tokens.md §5.3). Dentro dela, todo foco usa o âmbar. */
export function SiteFooter() {
  return (
    <footer className="mt-[clamp(3rem,7vw,6rem)] bg-night pt-[clamp(2.5rem,6vw,4.5rem)] pb-8 text-night-ink [&_:focus-visible]:outline-focus-night">
      <div className="wrap">
        {/* min-w-0 nos filhos: sem isto, o min-width: auto deixa um item alargar a coluna e vazar a tela (QA-01). */}
        <div className="grid gap-8 *:min-w-0 grade:grid-cols-[7fr_5fr] grade:items-end">
          {/* A coluna da marca é um contêiner: a marca mede a coluna, não a viewport. */}
          <div className="@container">
            {/*
             * "ZonaMista" ocupa cerca de 3,4em. O teto de 27cqi (27% da coluna) só entra em ação
             * quando a fonte do leitor é ampliada numa tela estreita; na fonte padrão o token
             * --text-footer-mark fica sempre abaixo dele (QA-01).
             */}
            <p
              className="font-display text-[length:min(var(--text-footer-mark),27cqi)] leading-[0.85] font-normal tracking-[-0.04em]"
              aria-hidden="true"
            >
              Zona<i className="ml-[0.1em] tracking-[-0.05em]">Mista</i>
            </p>
          </div>
          <div>
            <p className="max-w-[46ch] leading-[1.55]">
              As matérias da {NOME_DO_PORTAL} são produzidas pelo squad-fut, uma
              redação de agentes que apura, escreve, checa e revisa cada texto.
            </p>
            <EditoriasNav rotulo="Editorias no rodapé" variante="rodape" />
          </div>
        </div>
        <p className="label mt-10 flex flex-wrap justify-between gap-x-8 gap-y-2 border-t-(length:--rule-width) border-night-rule pt-4">
          <span>
            © <span className="mono">{ANO_DO_COLOFAO}</span> {NOME_DO_PORTAL}
          </span>
          <span className="text-night-ink-muted">
            Depois do apito{" "}
            <span className="text-amber" aria-hidden="true">
              ◆
            </span>
          </span>
        </p>
      </div>
    </footer>
  );
}
