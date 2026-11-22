import { NextResponse, type NextRequest } from "next/server";
import { criarClienteDoServidor } from "@/lib/auth/servidor";

/**
 * Volta do Google (história 16, critério 4). O Auth do Supabase redireciona para cá com
 * `?code=` (fluxo PKCE). A troca do code pela sessão grava os cookies da sessão: num
 * Route Handler, o `cookies()` de `next/headers` aceita `set` (doc `route.md`, "Cookies"),
 * e o Next junta esses cookies à resposta do redirect.
 *
 * Sem code, com `?error=` (a pessoa cancelou no Google) ou com a troca recusada (code
 * vencido ou já usado, verificador ausente): volta para `/admin/entrar?erro=login`, que
 * mostra a mensagem em pt-BR. O texto do erro nunca vai para a URL.
 *
 * Com `ADMIN_HABILITADO` desligado, o Proxy responde 404 antes de chegar aqui.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (code) {
    try {
      const cliente = await criarClienteDoServidor();
      const { error } = await cliente.auth.exchangeCodeForSession(code);
      if (!error) {
        return NextResponse.redirect(new URL("/admin", request.url));
      }
      console.error("[admin] o callback do login falhou:", error.message);
    } catch (erro) {
      console.error("[admin] o callback do login falhou:", erro);
    }
  }
  return NextResponse.redirect(
    new URL("/admin/entrar?erro=login", request.url),
  );
}
