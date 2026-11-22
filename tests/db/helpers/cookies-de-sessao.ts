/**
 * Cookies de sessão no formato do `@supabase/ssr`, gerados pela própria biblioteca
 * (história 16). Servem para testar o servidor sem passar pelo Google.
 *
 * Como funciona: um `createServerClient` com um pote de cookies em memória recebe a
 * sessão de um usuário logado por senha (`setSession`). A biblioteca grava os cookies
 * do jeito dela (nome `sb-<host>-auth-token`, valor `base64-<json>`, pedaços `.0`, `.1`
 * se passar de ~3 KB). O teste nunca monta esse formato à mão, então uma mudança de
 * formato numa versão nova do pacote não quebra os testes por engano.
 *
 * A fase 2 (e2e de banco) reaproveita `cookiesDaSessao` para injetar a sessão no
 * navegador com `context.addCookies`.
 */
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseLocal } from "./supabase-local";

export interface CookieSimples {
  readonly name: string;
  readonly value: string;
}

/** Os cookies que o navegador teria depois de entrar com essa sessão. */
export async function cookiesDaSessao(
  logado: SupabaseClient,
): Promise<CookieSimples[]> {
  const { data, error } = await logado.auth.getSession();
  if (error || !data.session) {
    throw new Error(`sem sessão para gerar cookies: ${error?.message ?? ""}`);
  }
  const pote = new Map<string, string>();
  const { url, anonKey } = supabaseLocal();
  const cliente = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => [...pote].map(([name, value]) => ({ name, value })),
      setAll(aGravar) {
        for (const { name, value } of aGravar) {
          if (value === "") pote.delete(name);
          else pote.set(name, value);
        }
      },
    },
  });
  const { error: erro } = await cliente.auth.setSession({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });
  if (erro) throw new Error(`setSession: ${erro.message}`);
  if (pote.size === 0) throw new Error("o @supabase/ssr não gravou cookie");
  return [...pote].map(([name, value]) => ({ name, value }));
}

/**
 * O que `cookies()` de `next/headers` devolve, com o mínimo que o servidor usa. Os
 * `set` ficam registrados em `gravados`; com `somenteLeitura`, `set` lança como num
 * Server Component.
 */
export function poteDeCookies(
  iniciais: readonly CookieSimples[] = [],
  { somenteLeitura = false }: { somenteLeitura?: boolean } = {},
) {
  const atuais = new Map(iniciais.map((c) => [c.name, c.value]));
  const gravados: CookieSimples[] = [];
  return {
    gravados,
    getAll: () => [...atuais].map(([name, value]) => ({ name, value })),
    get: (nome: string) =>
      atuais.has(nome) ? { name: nome, value: atuais.get(nome)! } : undefined,
    set(nome: string, valor: string) {
      if (somenteLeitura) {
        throw new Error(
          "Cookies can only be modified in a Server Action or Route Handler.",
        );
      }
      gravados.push({ name: nome, value: valor });
      atuais.set(nome, valor);
    },
  };
}
