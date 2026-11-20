import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getRepository } from "@/lib/content";
import {
  lerPagina,
  montarListagem,
  type FiltroDaListagem,
  type Listagem,
} from "@/lib/listagens";
import { metadadosDaListagem } from "@/lib/seo";
import { CabecalhoDaListagem } from "./CabecalhoDaListagem";
import { ListaDeMaterias } from "./ListaDeMaterias";
import { Paginacao } from "./Paginacao";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type Props = { filtro: FiltroDaListagem; searchParams: SearchParams };

/**
 * Listagem da página pedida na query. Fora da faixa, `notFound()`: é a segunda defesa,
 * porque o Proxy já respondeu 404 antes (ADR 0006).
 */
async function listagemDaQuery(
  filtro: FiltroDaListagem,
  searchParams: SearchParams,
): Promise<Listagem> {
  const pagina = lerPagina((await searchParams).pagina);
  const listagem =
    pagina === null
      ? null
      : await montarListagem(getRepository(), filtro, pagina);
  if (!listagem) notFound();
  return listagem;
}

/** Metadados das rotas `/editorias/[editoria]` e `/tags/[tag]` (título e canonical dependem da página). */
export async function metadadosDaRotaDeListagem(
  filtro: FiltroDaListagem,
  searchParams: SearchParams,
): Promise<Metadata> {
  return metadadosDaListagem(await listagemDaQuery(filtro, searchParams));
}

/** Itens e paginação de uma página já conhecida. */
function ItensDaPagina({ listagem }: { listagem: Listagem }) {
  return (
    <>
      <ListaDeMaterias materias={listagem.itens} nivelDoTitulo="h2" />
      <Paginacao listagem={listagem} />
    </>
  );
}

/** Itens e paginação da página pedida: dependem do `?pagina=`, que só se conhece na requisição. */
async function ItensDaQuery({ filtro, searchParams }: Props) {
  return (
    <ItensDaPagina listagem={await listagemDaQuery(filtro, searchParams)} />
  );
}

/**
 * Página de uma editoria ou tag. O cabeçalho (rótulo e total) só depende da rota, que vem
 * do `generateStaticParams`, e entra no shell estático. Ler `searchParams` torna os itens
 * dinâmicos; com Cache Components, eles ficam num `<Suspense>` e chegam por streaming na
 * mesma resposta (guia "Caching", seção "Working with runtime APIs").
 *
 * O fallback é a página 1, que também é estática. Sem isso, o shell sairia sem a lista, e o
 * React (desde a 19.2) ainda segura a troca do fallback por alguns instantes depois do load:
 * o leitor veria o cabeçalho sozinho. Na página 1, a troca é invisível (o conteúdo é igual).
 */
export async function PaginaDeListagem({ filtro, searchParams }: Props) {
  const primeira = await montarListagem(getRepository(), filtro, 1);
  if (!primeira) notFound();
  return (
    <main id="conteudo" tabIndex={-1} className="wrap">
      <CabecalhoDaListagem listagem={primeira} />
      <Suspense fallback={<ItensDaPagina listagem={primeira} />}>
        <ItensDaQuery filtro={filtro} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
