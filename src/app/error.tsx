"use client";

/**
 * Erro de leitura numa requisição (U11): o banco fora do ar ou pausado, sem a página em
 * cache. Fica dentro do layout raiz, com cabeçalho e rodapé, na identidade da 404.
 *
 * Error boundary precisa ser componente cliente (doc `error.md`). Em produção, o erro
 * que vem de um Server Component chega sem a mensagem original (só o `digest`), então
 * nada do servidor vaza no HTML. O texto aqui é fixo.
 *
 * O botão usa `retry`, e não `reset`: a doc do Next 16 diz que o `retry` busca de novo
 * e re-renderiza o trecho, e o `reset` só limpa o estado sem buscar de novo. Com o banco
 * de volta, só o `retry` traz o conteúdo.
 */
export default function ErroDeLeitura({ retry }: { retry: () => void }) {
  return (
    <main id="conteudo" tabIndex={-1} className="wrap pt-(--space-section)">
      <p className="label text-ink-muted">Erro</p>
      <h1 className="mt-[1.1rem] max-w-[18ch] font-display text-h1 leading-[0.93] font-normal tracking-[-0.03em]">
        Não foi possível carregar esta página
      </h1>
      <p className="mt-(--space-6) max-w-(--layout-measure) font-text text-dek leading-normal font-normal">
        O conteúdo está temporariamente indisponível. Tente de novo em alguns
        instantes.
      </p>
      <p className="mt-(--space-5)">
        <button
          className="label min-h-(--tap-min) cursor-pointer rounded-none border-(length:--rule-width) border-rule-strong bg-transparent px-[0.9rem] leading-none font-semibold text-ink hover:text-accent"
          onClick={() => retry()}
          type="button"
        >
          Tentar de novo
        </button>
      </p>
    </main>
  );
}
