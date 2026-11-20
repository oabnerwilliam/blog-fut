import { NextResponse, type NextRequest } from "next/server";
import { getRepository } from "@/lib/content";

/** Caminho sem rota no app (pastas com `_` são privadas): o Next responde 404 com `not-found.tsx`. */
const SEM_ROTA = "/_nao-encontrada";
const PREFIXO = "/materias/";

/**
 * Com Cache Components, o shell estático sai com status 200 antes de o `notFound()` da
 * página rodar para um slug fora do build. Para responder 404 de verdade, o slug é
 * conferido aqui, antes da renderização (guia `loading.md`, "Status codes").
 */
export async function proxy(request: NextRequest) {
  const bruto = request.nextUrl.pathname.slice(PREFIXO.length);
  let slug: string | null;
  try {
    slug = decodeURIComponent(bruto);
  } catch {
    slug = null;
  }
  const artigo = slug === null ? null : await getRepository().getBySlug(slug);
  if (artigo) return NextResponse.next();
  return NextResponse.rewrite(new URL(SEM_ROTA, request.url));
}

export const config = {
  matcher: "/materias/:slug",
};
