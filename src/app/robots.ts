import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/** `/robots.txt`: permite tudo e aponta para o sitemap. As fictícias saem pelo `noindex`. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: new URL("/sitemap.xml", SITE_URL).href,
  };
}
