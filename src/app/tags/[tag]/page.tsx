import type { Metadata } from "next";
import {
  metadadosDaRotaDeListagem,
  PaginaDeListagem,
} from "@/components/listagem/PaginaDeListagem";
import { getRepository } from "@/lib/content";
import { paramsDasTags } from "@/lib/listagens";

/**
 * Tags com matéria visível são geradas no build. Uma tag sem matéria recebe 404 do
 * Proxy; o `notFound()` da listagem é a segunda defesa.
 */
export async function generateStaticParams() {
  return paramsDasTags(getRepository());
}

export async function generateMetadata({
  params,
  searchParams,
}: PageProps<"/tags/[tag]">): Promise<Metadata> {
  const { tag } = await params;
  return metadadosDaRotaDeListagem({ tag }, searchParams);
}

export default async function PaginaDaTag({
  params,
  searchParams,
}: PageProps<"/tags/[tag]">) {
  const { tag } = await params;
  return <PaginaDeListagem filtro={{ tag }} searchParams={searchParams} />;
}
