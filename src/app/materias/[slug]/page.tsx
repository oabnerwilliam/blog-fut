import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AvisoFicticio } from "@/components/materia/AvisoFicticio";
import { CabecalhoDaMateria } from "@/components/materia/CabecalhoDaMateria";
import { CorpoDaMateria } from "@/components/materia/CorpoDaMateria";
import { TagsDaMateria } from "@/components/materia/TagsDaMateria";
import { getRepository } from "@/lib/content";
import { paramsDasMaterias } from "@/lib/materias";
import {
  jsonLdDaMateria,
  metadadosDaMateria,
  serializarJsonLd,
} from "@/lib/seo";
import { SITE_URL } from "@/lib/site";
import styles from "./page.module.css";

/**
 * Todas as matérias visíveis são geradas no build. Com Cache Components, `dynamicParams`
 * não existe: um slug fora da lista renderiza sob demanda e cai no `notFound()` abaixo,
 * porque `getBySlug` devolve `null` para slug inexistente ou inválido.
 */
export async function generateStaticParams() {
  return paramsDasMaterias(getRepository());
}

export async function generateMetadata({
  params,
}: PageProps<"/materias/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const artigo = await getRepository().getBySlug(slug);
  if (!artigo) notFound();
  return metadadosDaMateria(artigo);
}

export default async function PaginaDaMateria({
  params,
}: PageProps<"/materias/[slug]">) {
  const { slug } = await params;
  const artigo = await getRepository().getBySlug(slug);
  if (!artigo) notFound();

  return (
    <main id="conteudo" tabIndex={-1}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializarJsonLd(jsonLdDaMateria(artigo, SITE_URL)),
        }}
      />
      <article>
        <CabecalhoDaMateria artigo={artigo} />
        <div className="wrap">
          <div className={styles.coluna}>
            {artigo.ficticio && <AvisoFicticio />}
            <CorpoDaMateria corpoMd={artigo.corpo_md} />
            <TagsDaMateria tags={artigo.tags} />
          </div>
        </div>
      </article>
    </main>
  );
}
