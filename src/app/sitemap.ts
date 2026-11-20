import type { MetadataRoute } from "next";
import { getRepository } from "@/lib/content";
import { SITE_URL } from "@/lib/site";
import { entradasDoSitemap } from "@/lib/sitemap";

/** `/sitemap.xml` (convenção de metadata do Next): só matérias reais e listas com alguma real. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return entradasDoSitemap(getRepository(), SITE_URL);
}
