import { NextResponse, type NextRequest } from "next/server";
import {
  adminHabilitado,
  ehRotaAbertaDoAdmin,
  ehRotaDoAdmin,
} from "@/lib/auth/config";
import {
  renovarSessaoDoAdmin,
  temCookieDeSessao,
} from "@/lib/auth/sessao-no-proxy";
import { getRepository } from "@/lib/content";
import { criarIndiceDeRotas, rotaExiste, ttlDoIndice } from "@/lib/rotas";

/** Caminho sem rota no app (pastas com `_` são privadas): o Next responde 404 com `not-found.tsx`. */
const SEM_ROTA = "/_nao-encontrada";

/**
 * Índice em memória das rotas que existem (U12; ADR 0006, extensão da história 14). O
 * Proxy não cria escopo de "use cache" (doc `use-cache.md`), então guarda os slugs e as
 * contagens por até 60 s, em vez de consultar o banco a cada requisição. `semCache`: o
 * repositório é lido direto, sem as funções "use cache".
 */
const indiceDeRotas = criarIndiceDeRotas({
  repositorio: () => getRepository({ semCache: true }),
  ttlMs: ttlDoIndice(process.env),
});

/**
 * Com Cache Components, o shell estático sai com status 200 antes de o `notFound()` da
 * página rodar para um slug fora do build. Para responder 404 de verdade, a rota é
 * conferida aqui, antes da renderização (guia `loading.md`, "Status codes"; ADR 0006).
 * A regra fica em `rotaExiste`.
 */
export async function proxy(request: NextRequest) {
  // /admin (história 16; ADR 0006, "Extensão (história 16)"): 404 real com o admin
  // desligado (U14). Ligado, nunca consulta o banco: sem cookie de sessão, o painel vai
  // direto para entrar (checagem otimista, sem rede); com cookie, só renova a sessão
  // vencida, e quem confere a sessão de verdade é o servidor.
  const caminho = request.nextUrl.pathname;
  if (ehRotaDoAdmin(caminho)) {
    if (!adminHabilitado(process.env)) {
      return NextResponse.rewrite(new URL(SEM_ROTA, request.url));
    }
    if (!ehRotaAbertaDoAdmin(caminho) && !temCookieDeSessao(request)) {
      return NextResponse.redirect(new URL("/admin/entrar", request.url));
    }
    return renovarSessaoDoAdmin(request);
  }
  if (await rotaExiste(indiceDeRotas, request.nextUrl)) {
    return NextResponse.next();
  }
  return NextResponse.rewrite(new URL(SEM_ROTA, request.url));
}

export const config = {
  matcher: [
    "/materias/:slug",
    "/editorias/:editoria",
    "/tags/:tag",
    "/admin/:path*",
  ],
};
