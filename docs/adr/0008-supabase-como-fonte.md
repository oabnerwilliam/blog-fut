# ADR 0008: Supabase como fonte das matérias

**Status:** aceito · **Data:** 2026-11-21 · **História:** `docs/backlog/13-supabase-fonte.md`

Fontes consultadas:
- Spec `docs/superpowers/specs/2026-11-21-blog-fut-v2-supabase-design.md`, §7.1 a §7.3, e plano `docs/superpowers/plans/2026-11-21-blog-fut-v2.md` (História 13).
- `node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-cache.md`: chave do cache, argumentos serializáveis e a seção sobre o Proxy ("does not apply directive transforms… Calling `cacheLife` or `cacheTag` in that function throws").
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/cacheTag.md` e `cacheLife.md`, com o perfil `max` (revalidate de 30 dias e expire de 1 ano).

## Contexto
A v2 troca os arquivos `content/` pelo Postgres do Supabase como fonte da verdade (U1). O site precisa continuar idêntico: mesma ordem, mesma paginação, busca sem acento, rótulos de tag, `MOSTRAR_EXEMPLOS` e 404 real. A v1 tem uma suíte grande de testes sobre o `FileArticleRepository`, e nenhum deles fala com um banco.

## Decisão

### 1. Fonte e chaves
- `CONTENT_SOURCE` aceita `files` (padrão) ou `supabase`. Com `supabase`, `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` são obrigatórias, e a mensagem de erro lista todas as que faltam.
- O site lê com a **chave anon**, num cliente sem sessão (`persistSession: false`, sem refresh de token). Quem decide o que ela vê é o **RLS**: `anon` e `authenticated` leem só `articles` com `status = 'publicado'`, e `tags`. `article_revisions` não tem política de leitura, e `anon` perdeu todos os privilégios de escrita nas três tabelas (defesa em profundidade). Mesmo assim, o repositório filtra `status = 'publicado'` explicitamente.
- A `service_role` só existe nos comandos locais (`scripts/`), lida por `carregarAmbiente` do `.env.local` (ou do `.env.prod.local` com `--prod` e confirmação). Um teste da regra do repositório falha se `src/` citar a `service_role`.
- O cliente Supabase só pode ser importado em `src/lib/content/supabase/`, `src/lib/admin/`, `src/lib/auth/`, `scripts/` e `tests/`. Isso também é conferido em `tests/unit/regra-do-repositorio.test.ts`.

### 2. Busca por RPC com `strpos`
- `busca_normalizada` é mantida por trigger e é **o mesmo texto** que o `textoBuscavel` do JS: título, linha fina, para cada tag o slug com espaços e o rótulo, e o corpo, um campo por linha. Um trigger em `tags` recalcula as matérias que usam a tag alterada ou removida. Tag sem rótulo na tabela usa o slug com espaços, que é o `humanizarTag(slug)` depois de normalizado.
- A busca chama `public.buscar_artigos(termos text[])` (`stable`, `security invoker`, então o RLS vale), que devolve as matérias em que todo termo aparece por `strpos(busca_normalizada, termo) > 0`. Os termos chegam já normalizados por `termosDaBusca`. Busca vazia devolve `[]` sem ir ao banco.
- **Por que não `ilike`:** no `ilike`, `%` e `_` são curingas, e o PostgREST troca `*` por `%` nos filtros. Uma busca por "50%" acharia "500". O `strpos` é a substring literal do contrato da v1. A suíte de contrato cobre `50%` e `1_000`.
- **Por que não full-text (`tsvector`):** ele trabalha com lexemas e radicais, não com substring. "sao paul" deixaria de achar "São Paulo", e o resultado mudaria em relação aos arquivos. Com poucas centenas de matérias, varrer um texto por linha custa pouco. Um índice trigram (`pg_trgm`) pode vir depois, sem mudar o contrato.
- **Por que não `unaccent`** (desvio do critério 4, que pedia a extensão): no Supabase local, `unaccent('“Ação” — œuvre ½')` devolve `"Acao" - oeuvre  1/2`. Ele troca pontuação e ligaduras, o que o JS não faz. Um termo com “ ou — viria do JS intacto e não acharia o texto do banco. `public.normalizar_busca` faz o mesmo que `normalizarParaBusca`: `normalize(texto, NFD)`, remove as marcas combinantes, aplica `lower`, troca toda sequência do `\s` do JS (espaços ASCII, NBSP e os espaços Unicode) por um espaço e apara. Como `normalize` e `regexp_replace` são `immutable`, a função também é. `tests/db/paridade.test.ts` compara SQL e JS em textos difíceis e em todos os corpos reais, e confere que a `busca_normalizada` de cada matéria real é igual ao `textoBuscavel`.

### 3. `collate "C"` no slug
O desempate da ordem é `slug asc`, comparado com `<` no JS (code point). Com a collation padrão do banco (`en_US.UTF-8`), o hífen é ignorado no primeiro nível, e `zulub` viria antes de `zulu-c`. Com `collate "C"`, a ordem do `order by publicado_em desc, slug asc` é a do JS. A fixture de contrato tem exatamente esse par.

### 4. Cache Components no modo `supabase` (critério 9)
- **O build exige.** Com o repositório sem cache, `CONTENT_SOURCE=supabase pnpm build` falha em `/` com "Next.js encountered uncached or runtime data during prerendering" (experimento feito na história).
- Cada leitura do Supabase roda numa função `"use cache"` com `cacheLife("max")` e etiquetas (`src/lib/content/supabase/repositorio-em-cache.ts`). As etiquetas ficam em `src/lib/content/cache.ts`: `TAG_MATERIAS` (`materias`) em `list`, `search`, `listEditorias` e `listTags`; `tagDaMateria(slug)` (`materia:<slug>`) em `getBySlug`; e `TAG_TAGS` (`tags`) em toda leitura que mostra rótulo de tag. A invalidação (`/api/revalidar` e webhook) fica para a história 14.
- As funções em cache recebem só valores serializáveis (conexão, `mostrarExemplos` e opções), que formam a chave. O cliente e o repositório são criados dentro delas. O que se decide sem banco (`RangeError`, slug malformado, busca vazia) fica fora do cache.
- As telas não mudaram: continuam chamando `getRepository()`. Com `files`, nada muda em relação à v1.
- **Uma camada de cache só: o fetch do supabase-js sai com `cache: "no-store"`.** Dentro de `"use cache"`, o `fetch` sem opção caía no fetch cache persistente do Next (`.next/cache/fetch-cache`, `revalidate: 900`, sem etiquetas). O build seguinte reaproveitava essas respostas: na revisão, depois de `db reset` + importação, um segundo build ainda listou uma matéria que já não existia. E o `revalidateTag` da história 14 não alcançaria essas entradas. Por isso `criarClienteAnonimo` passa `global.fetch`, que repassa `cache: "no-store"` em toda requisição. A doc (`04-functions/fetch.md`) diz que `no-store` busca a cada vez; o efeito de tornar a rota dinâmica não vale dentro de um escopo de cache (no código do Next 16.4.6, `markCurrentScopeAsDynamic` ignora o escopo `cache`, porque "the outer cache scope creates a cache boundary"). Conferido: com a pasta apagada, `CONTENT_SOURCE=supabase pnpm build` passa com as mesmas rotas estáticas e não cria `.next/cache/fetch-cache`. Com uma matéria despublicada no banco, o build seguinte gerou 37 páginas em vez de 38. `tests/unit/content/supabase-cliente.test.ts` prova o `no-store` com um `fetch` falso.
- **Proxy:** ele não aplica a diretiva, e `cacheTag` lança fora de um escopo de cache. Por isso o `src/proxy.ts` chama `getRepository({ semCache: true })`, que devolve o `SupabaseArticleRepository` direto. No modo `supabase`, isso significa uma consulta ao banco por requisição a `/materias/*`, `/editorias/*` e `/tags/*`, até a história 14 trocar por um índice em memória com TTL (U12, adendo ao ADR 0006).

### 5. Suíte de contrato
`tests/contract/article-repository.contract.ts` exporta `descreverContratoDoRepositorio(nome, criar)`. Ela roda:
- com o `FileArticleRepository`, em `pnpm test`;
- com o `SupabaseArticleRepository`, em `pnpm test:db`, depois de importar a mesma fixture (`tests/fixtures/content/contrato/`) com o mesmo importador do `pnpm db:importar`.

A fixture cobre empate de data, o par `zulu-c`/`zulub`, tag sem rótulo, fictícias, acento, `%` e `_`. Além do contrato, `tests/db/paridade.test.ts` compara as duas implementações método a método com o `content/` real, com e sem exemplos.

### 6. Importação
`scripts/importar-conteudo.ts` lê com o mesmo `carregarArtigosDoDisco` do site. Para isso, a leitura do disco saiu do `file-repository.ts` (que é `server-only`) para `src/lib/content/disco.ts`. O importador compara antes de gravar, então é idempotente: a segunda execução não muda linhas, `updated_at` nem revisões. Um arquivo alterado depois da importação vira a revisão seguinte, e a revisão 1 nunca é reescrita.

## Alternativas consideradas
1. **`ilike` montado no cliente** (o que o plano previa). Rejeitada pelos curingas, como explicado na seção 2.
2. **Carregar tudo do banco e reaproveitar o catálogo em memória.** Daria paridade de graça, mas traria o banco inteiro a cada leitura e ignoraria o RLS na prática. Rejeitada. As funções puras de contagem (`contarEditorias` e `contarTags`) e de validação (`validarPaginacao`) são reaproveitadas.
3. **`<Suspense>` nas telas em vez de `"use cache"`.** Isso mudaria as telas e perderia o shell estático. Rejeitada.

## Consequências
- O `pnpm test` continua sem Docker. O `pnpm test:db` sobe o Supabase local, reseta o banco e roda os testes de `tests/db/` um arquivo por vez.
- Uma página além da última responde `PGRST103` no PostgREST. O repositório trata isso com uma contagem, para devolver itens vazios com o total certo, como o repositório de arquivos.
- O PostgREST limita respostas a 1000 linhas (`max_rows`). `listEditorias` e `listTags` leem uma coluna de todas as publicadas, então acima de 1000 matérias será preciso agregar no banco.
- O deploy de produção desta história deve falhar enquanto o banco de produção estiver vazio, porque as migrações só vão por CI na história 14. A Vercel mantém o deploy anterior no ar.
