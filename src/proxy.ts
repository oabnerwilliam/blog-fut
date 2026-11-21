import { NextResponse, type NextRequest } from "next/server";
import { getRepository } from "@/lib/content";
import { rotaExiste } from "@/lib/rotas";

/** Caminho sem rota no app (pastas com `_` são privadas): o Next responde 404 com `not-found.tsx`. */
const SEM_ROTA = "/_nao-encontrada";

/**
 * Com Cache Components, o shell estático sai com status 200 antes de o `notFound()` da
 * página rodar para um slug fora do build. Para responder 404 de verdade, a rota é
 * conferida aqui, antes da renderização (guia `loading.md`, "Status codes"; ADR 0006).
 * A regra fica em `rotaExiste`, que usa as mesmas consultas das páginas.
 *
 * `semCache`: o Proxy não cria escopo de "use cache" (doc `use-cache.md`), então lê o
 * repositório direto. Com o Supabase, isso consulta o banco por requisição até a
 * história 14 trocar por um índice em memória (U12).
 */
export async function proxy(request: NextRequest) {
  if (await rotaExiste(getRepository({ semCache: true }), request.nextUrl)) {
    return NextResponse.next();
  }
  return NextResponse.rewrite(new URL(SEM_ROTA, request.url));
}

export const config = {
  matcher: ["/materias/:slug", "/editorias/:editoria", "/tags/:tag"],
};
