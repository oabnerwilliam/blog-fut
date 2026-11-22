/**
 * Renovação da sessão do admin no Proxy (história 16; ADR 0006, "Extensão (história 16)").
 *
 * Por que aqui: Server Components não gravam cookie (doc `cookies.md`), e o refresh token
 * do Supabase só pode ser usado uma vez. Se o layout do admin renovasse o token sem
 * conseguir devolver o cookie novo, a próxima requisição chegaria com um refresh token
 * já gasto, e a pessoa seria deslogada. O Proxy roda antes da renderização e pode gravar
 * o `Set-Cookie` na resposta.
 *
 * Sem rede na maioria das requisições: `getSession()` lê a sessão do cookie e só chama o
 * Auth quando o access token venceu (ou está a menos de 90 s de vencer). Sem cookie de
 * sessão, o cliente nem é criado. Quem confere a sessão de verdade é o servidor, com
 * `getUser()` (`servidor.ts`); aqui, nada é decidido a partir do cookie.
 *
 * Sem `server-only`: o arquivo só tem a chave anon e roda no bundle do Proxy.
 */
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { lerConexaoDoAuth, type AmbienteDoAuth } from "./config";

/** `sb-<ref>-auth-token` e os pedaços `.0`, `.1`… Não pega o `-code-verifier` do PKCE. */
const COOKIE_DE_SESSAO = /^sb-.+-auth-token(?:\.\d+)?$/;

/** O Auth fora do ar não segura a requisição do admin por mais que isso. */
export const LIMITE_DA_RENOVACAO_MS = 5_000;

export interface OpcoesDaRenovacao {
  readonly limiteMs?: number;
}

export async function renovarSessaoDoAdmin(
  request: NextRequest,
  env: AmbienteDoAuth = process.env,
  { limiteMs = LIMITE_DA_RENOVACAO_MS }: OpcoesDaRenovacao = {},
): Promise<NextResponse> {
  let resposta = NextResponse.next({ request });

  const temSessao = request.cookies
    .getAll()
    .some((cookie) => COOKIE_DE_SESSAO.test(cookie.name));
  if (!temSessao) return resposta;

  let conexao;
  try {
    conexao = lerConexaoDoAuth(env);
  } catch {
    // Sem configuração, quem avisa é a página (error.tsx). O Proxy nunca responde 500.
    return resposta;
  }

  // Depois do prazo, a resposta já saiu: uma renovação atrasada não mexe mais nela.
  let encerrado = false;
  const supabase = createServerClient(conexao.url, conexao.anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(aGravar, cabecalhos) {
        if (encerrado) return;
        // O padrão do @supabase/ssr: o pedido segue com o cookie novo (a página lê a
        // sessão renovada) e a resposta leva o Set-Cookie para o navegador.
        for (const { name, value } of aGravar) request.cookies.set(name, value);
        resposta = NextResponse.next({ request });
        for (const { name, value, options } of aGravar) {
          resposta.cookies.set(name, value, options);
        }
        for (const [nome, valor] of Object.entries(cabecalhos)) {
          resposta.headers.set(nome, valor);
        }
      },
    },
  });

  let temporizador: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      supabase.auth.getSession(),
      new Promise((resolver) => {
        temporizador = setTimeout(resolver, limiteMs);
      }),
    ]);
  } catch (erro) {
    console.error("[admin] a renovação da sessão falhou:", erro);
  } finally {
    clearTimeout(temporizador);
    encerrado = true;
  }
  return resposta;
}
