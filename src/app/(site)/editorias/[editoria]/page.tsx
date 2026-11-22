import type { Metadata } from "next";
import {
  metadadosDaRotaDeListagem,
  PaginaDeListagem,
} from "@/components/listagem/PaginaDeListagem";
import { getRepository } from "@/lib/content";
import { paramsDasEditorias } from "@/lib/listagens";

/**
 * Editorias com matéria visível são geradas no build. Uma editoria fora da lista (ou sem
 * matéria) recebe 404 do Proxy; o `notFound()` da listagem é a segunda defesa.
 */
export async function generateStaticParams() {
  return paramsDasEditorias(getRepository());
}

export async function generateMetadata({
  params,
  searchParams,
}: PageProps<"/editorias/[editoria]">): Promise<Metadata> {
  const { editoria } = await params;
  return metadadosDaRotaDeListagem({ editoria }, searchParams);
}

export default async function PaginaDaEditoria({
  params,
  searchParams,
}: PageProps<"/editorias/[editoria]">) {
  const { editoria } = await params;
  return <PaginaDeListagem filtro={{ editoria }} searchParams={searchParams} />;
}
