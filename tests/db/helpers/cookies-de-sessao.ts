/**
 * Cookies de sessão no formato do `@supabase/ssr` para os testes de `tests/db/`
 * (história 16). A geração fica em `tests/helpers/sessao-supabase.ts` (a própria
 * biblioteca grava os cookies), que o e2e de banco também usa para injetar a sessão no
 * navegador.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  gerarCookiesDaSessao,
  type CookieSimples,
} from "../../helpers/sessao-supabase";
import { supabaseLocal } from "./supabase-local";

export type { CookieSimples } from "../../helpers/sessao-supabase";

/** Os cookies que o navegador teria depois de entrar com essa sessão. */
export function cookiesDaSessao(
  logado: SupabaseClient,
): Promise<CookieSimples[]> {
  return gerarCookiesDaSessao(supabaseLocal(), logado);
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
