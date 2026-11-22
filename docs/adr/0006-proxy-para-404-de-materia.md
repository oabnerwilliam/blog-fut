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

## Extensão (história 14)
`docs/backlog/14-vercel-cache.md`, critério 4 (U12). Fonte extra: `01-app/03-api-reference/01-directives/use-cache.md`, na seção sobre o Proxy. Ele não aplica as transformações da diretiva, e chamar `cacheLife` ou `cacheTag` ali lança, porque o Proxy não cria escopo de cache. Assim, o primeiro caminho do U12 (a função com `"use cache"` no Proxy) não existe.

Caminho escolhido: **índice em memória com TTL** (`src/lib/rotas.ts`).
- `criarIndiceDeRotas({ repositorio, ttlMs, agora })` guarda um retrato com os slugs das matérias e, para cada editoria e tag com matéria visível, o número de páginas (`Math.ceil(total / TAMANHO_PADRAO_DA_PAGINA)`, a mesma conta do catálogo). O retrato vem das mesmas consultas das páginas (`list` página a página, `listEditorias` e `listTags`), pelo `getRepository({ semCache: true })`, e respeita `MOSTRAR_EXEMPLOS`, como antes.
- `TTL_DO_INDICE_MS = 60_000`. O índice recarrega no máximo uma vez a cada 60 s, e as requisições que chegam durante a recarga esperam a mesma promessa. Uma matéria recém-publicada pode dar 404 por até 1 minuto. Uma despublicada responde 200 pelo mesmo tempo, mas a página dela já mostra o `notFound()`, porque o cache foi invalidado.
- Se a recarga falhar, o retrato antigo continua valendo, e a próxima tentativa só vem depois de outro TTL: o banco fora do ar não recebe uma consulta por requisição. Sem retrato nenhum, a rota passa adiante e a página decide. O Proxy nunca responde 500 por causa do banco.
- `rotaExiste(indice, url)` mantém a regra da história 05 (decodificação, `?pagina=` estrito e lista fechada de editorias). Os casos de `tests/unit/rotas.test.ts` são os mesmos de antes, agora pelo índice. Com `files`, o resultado não muda: o retrato é montado do mesmo repositório em memória.
- Cada instância do servidor tem o seu índice. Na Vercel, isso quer dizer um por função aquecida, e o prazo de 60 s vale para cada uma.
- `TTL_DO_INDICE_MS_TESTE` existe **só para o `pnpm test:e2e:db`** (1 s), que confere a matéria nova em até 5 s. Um valor inválido não derruba o Proxy: ele avisa e fica com 60 s. Nunca configure essa variável na Vercel.
- `tests/unit/indice-de-rotas.test.ts` usa um repositório espião e um relógio injetado. Ele confere que 100 requisições em 60 s geram uma carga, que a requisição seguinte ao TTL recarrega, que requisições simultâneas dividem a carga, que a matéria nova passa de 404 a 200 depois do TTL e que a falha mantém o índice antigo.

## Extensão (história 16)
`docs/backlog/16-login-admin.md`, critério 5 (U14). Fontes extras: `01-app/03-api-reference/03-file-conventions/proxy.md` ("Matcher" e "Using Cookies"), `04-functions/cookies.md` e a doc do `@supabase/ssr` em `node_modules/@supabase/ssr` (`docs/design.md`). Decisões de autorização no ADR 0009.

- O `matcher` ganhou `/admin/:path*`, que cobre `/admin` e tudo abaixo dele (o `*` é "zero ou mais").
- **Admin desligado** (`ADMIN_HABILITADO !== "true"`, exatamente; `adminHabilitado` em `src/lib/auth/config.ts`): todo `/admin/**`, inclusive o callback do login, vai para o mesmo `rewrite` do 404 real (`/_nao-encontrada`). Isso vale nos previews da Vercel e na suíte da v1, que fixa `ADMIN_HABILITADO=false` no `playwright.config.ts`. `tests/e2e/admin-desligado.spec.ts` confere o 404 no `next start`, e `tests/unit/proxy-admin.test.ts`, o `rewrite` para `/admin`, `/admin/entrar`, `/admin/acessos`, o callback e caminhos fundos.
- **Admin ligado:** o Proxy **não consulta o banco** para o `/admin`. O índice de rotas nem é carregado (o teste troca o `getRepository` por um que lança). Quem confere a sessão e o status é o layout do admin, no servidor, com `getUser()`.
- **Única ida à rede: a renovação da sessão vencida** (`renovarSessaoDoAdmin`, `src/lib/auth/sessao-no-proxy.ts`). Desvio consciente da nota "o proxy não consulta o banco": o Proxy fala com o **Auth** (não com as tabelas) só quando o access token do cookie venceu, ou está a menos de 90 s de vencer. Isso acontece uma vez por hora por pessoa logada. O motivo é que Server Components não gravam cookie, e o refresh token do Supabase só pode ser usado uma vez. Renovado no layout, o token novo não chegaria ao navegador, e a pessoa seria deslogada na requisição seguinte. A doc do `@supabase/ssr` diz que o servidor precisa devolver o token renovado em `Set-Cookie`, e o Proxy é a peça que roda antes da renderização e pode fazer isso.
  - Sem cookie de sessão (`sb-<ref>-auth-token`, ou os pedaços `.0`, `.1`…), o cliente nem é criado. O cookie do PKCE (`-code-verifier`) não conta.
  - Com sessão dentro do prazo, o `getSession()` lê o cookie e não faz requisição nenhuma. Nada é autorizado a partir dele: é só a renovação.
  - Com o Auth lento ou fora do ar, a renovação desiste em 5 s e a requisição segue. Sem as variáveis do Supabase, ela segue sem tentar. O Proxy nunca responde 500 por causa do admin.
  - Refresh token recusado pelo Auth: o cookie é apagado, e o layout manda a pessoa para `/admin/entrar`.
  - `tests/unit/auth/sessao-no-proxy.test.ts` usa um `fetch` falso: prova que não há rede sem cookie nem com a sessão no prazo, que a sessão vencida chama `/auth/v1/token?grant_type=refresh_token` uma vez e devolve o cookie novo (com `Cache-Control` privado), e que o Auth lento não segura a requisição.
