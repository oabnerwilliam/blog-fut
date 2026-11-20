import type { Metadata } from "next";
import { Suspense } from "react";
import {
  BotaoDeBusca,
  EntradaDeBusca,
  LINHA_DO_CAMPO,
} from "@/components/busca/CampoDeBusca";
import { ResultadoDaBusca } from "@/components/busca/ResultadoDaBusca";
import { FIO_DO_TOPO, TITULO_DO_TOPO } from "@/components/listagem/classes";
import { lerTermo, montarBusca } from "@/lib/busca";
import { editoriasComMateria } from "@/lib/capa";
import { getRepository } from "@/lib/content";
import { metadadosDaBusca } from "@/lib/seo";

type SearchParams = PageProps<"/busca">["searchParams"];

const ID_DO_CAMPO = "q-pagina";

async function termoDaQuery(searchParams: SearchParams): Promise<string> {
  return lerTermo((await searchParams).q);
}

export async function generateMetadata({
  searchParams,
}: PageProps<"/busca">): Promise<Metadata> {
  return metadadosDaBusca(await termoDaQuery(searchParams));
}

/** Campo da página, já preenchido com o termo: depende da query. */
async function EntradaDaQuery({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <EntradaDeBusca
      grande
      id={ID_DO_CAMPO}
      termo={await termoDaQuery(searchParams)}
    />
  );
}

/** Contagem e lista, ou a sugestão: dependem da query. */
async function ResultadoDaQuery({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const repositorio = getRepository();
  const busca = await montarBusca(
    repositorio,
    await termoDaQuery(searchParams),
  );
  const editorias =
    busca.estado === "com-resultado"
      ? []
      : editoriasComMateria(await repositorio.listEditorias());
  return <ResultadoDaBusca busca={busca} editorias={editorias} />;
}

/**
 * Busca (`/busca?q=`). O topo, o h1 e o formulário só dependem da rota e entram no shell
 * estático. Ler `searchParams` é dado de requisição: com Cache Components, o que depende
 * dele fica em `<Suspense>` e chega por streaming na mesma resposta (guia "Caching",
 * "Working with runtime APIs"), como em `PaginaDeListagem`.
 *
 * - O valor do campo: o fallback é o mesmo campo, vazio. Nada pisca além do texto do termo.
 * - O resultado: o fallback é vazio. Um estado provisório ("nenhuma matéria", sugestão)
 *   seria um estado errado na tela até o resultado chegar.
 */
export default function PaginaDaBusca({ searchParams }: PageProps<"/busca">) {
  return (
    <main id="conteudo" tabIndex={-1}>
      <div className="wrap">
        <header className="pt-(--space-section)">
          <p className="label text-accent">Acervo</p>
          <div className={FIO_DO_TOPO}>
            <h1 className={TITULO_DO_TOPO}>Busca</h1>
          </div>
        </header>
        <form
          action="/busca"
          aria-label="Buscar matérias no acervo"
          className="grid max-w-[40rem] gap-[0.6rem]"
          method="get"
          role="search"
        >
          <label className="label text-ink" htmlFor={ID_DO_CAMPO}>
            O que você procura?
          </label>
          <div className={LINHA_DO_CAMPO}>
            <Suspense fallback={<EntradaDeBusca grande id={ID_DO_CAMPO} />}>
              <EntradaDaQuery searchParams={searchParams} />
            </Suspense>
            <BotaoDeBusca grande />
          </div>
        </form>
      </div>
      <Suspense fallback={null}>
        <ResultadoDaQuery searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
