# ADR 0006: Proxy confere o slug da matéria para responder 404 de verdade

**Status:** aceito · **Data:** 2026-11-20 · **História:** `docs/backlog/03-pagina-materia.md` (critério 2)

Fontes consultadas:
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/loading.md`, "Status codes": com Cache Components, o shell pré-renderizado sai com `200` antes de a página rodar; uma checagem em tempo de requisição dentro da página não muda mais o status. A recomendação é fazer a checagem "antes de o streaming começar".
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`: o Proxy roda no runtime Node.js por padrão e "não deveria depender de módulos compartilhados ou globais", porque pode ser implantado separado do código de renderização.
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/02-route-segment-config/dynamicParams.md`: `dynamicParams` não está disponível com `cacheComponents`; exportá-lo quebra o build (`02-guides/migrating-to-cache-components.md`).

## Contexto
- As 8 matérias são pré-renderizadas inteiras no build. Um slug fora da lista renderiza sob demanda: o `notFound()` da página mostra a tela certa, mas com status **200** (soft 404, só com `noindex`).
- O critério 2 pede **404** real para `/materias/nao-existe`, `/materias/PSG` e `/materias/..%2F..%2Fpackage`.

## Decisão
`src/proxy.ts`, com `matcher: "/materias/:slug"`, decodifica o slug, chama `getRepository().getBySlug()` e, quando não há matéria, faz `rewrite` para um caminho sem rota (`/_nao-encontrada`). O Next responde 404 com o `src/app/not-found.tsx`. O `notFound()` da página continua como segunda defesa.

A ressalva da doc sobre módulos compartilhados é aceita conscientemente:
- O Proxy usa o runtime Node.js, e o `getRepository()` lê o `content/` de forma síncrona e memorizada (ADR 0005). Em produção, a leitura acontece uma vez por processo.
- O `.next/server/middleware.js.nft.json` inclui `content/materias/*.md` e `content/tags.json` (via `outputFileTracingIncludes` e o tracing automático). Conferido com `next build` + `next start` na revisão da história 03.
- O Proxy respeita `MOSTRAR_EXEMPLOS` porque usa o mesmo repositório. Assim, as páginas e o Proxy concordam sobre quais slugs existem.
- Navegação no cliente e prefetch de segmentos passam pelo Proxy com status 200 (conferido na revisão).

## Alternativas consideradas
1. **Só `notFound()` na página.** Mais simples, mas responde 200. Isso fere o critério 2. Rejeitada.
2. **`dynamicParams = false`.** Não existe com Cache Components. Rejeitada.
3. **Lista de slugs gerada no build e embutida no Proxy** (sem ler o `content/` em tempo de requisição). Segue a doc à risca, mas exige um passo de geração antes do `next build`. Fica como caminho se o Proxy precisar rodar fora do Node, por exemplo numa CDN.

## Consequências
- Cada requisição a `/materias/<slug>` faz uma busca num `Map` em memória antes da renderização. O custo é desprezível.
- Se o Supabase substituir os arquivos, o Proxy passa a fazer I/O de rede a cada requisição. Será preciso rever esta decisão, com cache ou com a alternativa 3.
- Novas rotas dinâmicas (`/editorias/[slug]`, `/tags/[slug]` na história 5) terão o mesmo problema. Elas devem estender este Proxy (matcher e checagem) para responder 404 real.

## Extensão (história 05)
`docs/backlog/05-editorias-tags.md`, critério 5. Fontes extras: `01-app/01-getting-started/08-caching.md` ("Working with runtime APIs" e "Maximizing the static shell") e `01-app/03-api-reference/03-file-conventions/page.md` (`searchParams`).

- O `matcher` passou a cobrir `/editorias/:editoria` e `/tags/:tag`, além de `/materias/:slug`.
- A regra de 404 saiu do Proxy e foi para `rotaExiste` (`src/lib/rotas.ts`), uma função pura que recebe o repositório e é testada com um repositório em memória. As listagens usam a mesma `montarListagem` + `lerPagina` (`src/lib/listagens.ts`) das páginas, então o Proxy e a página concordam: editoria fora da lista fechada, editoria ou tag sem matéria visível e `?pagina=` inválido ou além da última página dão 404.
- A página lê `searchParams`, que é dado de requisição. Os itens ficam num `<Suspense>` cujo fallback é a página 1 (estática). Assim, o shell pré-renderizado já sai completo, e o status continua vindo do Proxy, antes do streaming.
