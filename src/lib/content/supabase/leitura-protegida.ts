/*
 * Banco fora do ar ou pausado (U11; ADR 0008, §7).
 *
 * Um erro lançado dentro de uma função "use cache" no prerender quebra o build, mesmo
 * que alguém o capture fora dela: o Next registra a falha do próprio escopo de cache.
 * Por isso a leitura não lança lá dentro. Ela devolve a falha como valor e encurta a vida
 * da entrada para zero. A doc do `cacheLife` ("Prerendering behavior") diz que
 * `revalidate: 0` tira a entrada do prerender, que vira um buraco dinâmico resolvido na
 * requisição. No build sem banco, a página fica dinâmica (atrás do `<Suspense>` do layout
 * raiz). Numa requisição, a falha não é guardada (`expire: 0`), e `desembrulhar` a
 * transforma de novo num erro, que chega ao `error.tsx`. Quando o banco volta, a próxima
 * leitura grava a entrada normal, com `cacheLife("max")`.
 *
 * Várias chamadas de `cacheLife` no mesmo escopo ficam com o menor valor de cada campo,
 * então a vida zero vence o "max" chamado antes.
 */

export interface PerfilDeVida {
  readonly stale: number;
  readonly revalidate: number;
  readonly expire: number;
}

/** Vida da entrada de uma leitura que falhou: fora do prerender e sem ficar guardada. */
export const VIDA_DA_FALHA: PerfilDeVida = Object.freeze({
  stale: 0,
  revalidate: 0,
  expire: 0,
});

/** Resultado serializável (vai para o cache): o valor, ou a mensagem do erro. */
export type Leitura<T> =
  | { readonly ok: true; readonly valor: T }
  | { readonly ok: false; readonly mensagem: string };

/**
 * Roda a leitura dentro do "use cache". `marcarVida` é o `cacheLife` do Next, injetado
 * para o teste rodar fora dele.
 */
export async function lerProtegido<T>(
  ler: () => Promise<T>,
  marcarVida: (perfil: PerfilDeVida) => void,
): Promise<Leitura<T>> {
  try {
    return { ok: true, valor: await ler() };
  } catch (erro) {
    marcarVida(VIDA_DA_FALHA);
    return {
      ok: false,
      mensagem: erro instanceof Error ? erro.message : String(erro),
    };
  }
}

/** Fora do cache: devolve o valor ou relança a falha como erro. */
export function desembrulhar<T>(leitura: Leitura<T>): T {
  if (leitura.ok) return leitura.valor;
  throw new Error(leitura.mensagem);
}
