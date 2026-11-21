# 13: Supabase como fonte

**Status:** pronta para desenvolvimento
**Branch:** feat/13-supabase-fonte
**Tipo:** camada de dados, banco e scripts. Sem UI nova e sem mudança visual.
**Escrita por:** orquestrador, em 2026-11-21, na sessão autônoma da v2.
**Base:** plano `docs/superpowers/plans/2026-11-21-blog-fut-v2.md` (História 13) e spec `docs/superpowers/specs/2026-11-21-blog-fut-v2-supabase-design.md` (§7.1, §7.3, U8). Leia os dois antes de começar. Este arquivo só fixa o que o plano deixou em aberto.

## Critérios de aceite

1. **Dependências fixadas** (versão exata): `@supabase/supabase-js@2.119.2`, `supabase@3.2.0` (CLI, devDependency) e `tsx@4.23.15` (devDependency, para os scripts). O pnpm 10 bloqueia o postinstall que baixa o binário da CLI, então o `package.json` ganha `"pnpm": { "onlyBuiltDependencies": ["supabase"] }` (ou o equivalente documentado do pnpm 10).
2. **Scripts no `package.json`:**
   - `db:start`, `db:stop` e `db:reset`;
   - `db:importar` (`tsx scripts/importar-conteudo.ts`);
   - `test:db`, que sobe o banco (idempotente), roda `supabase db reset` e depois `vitest run --project db`.
3. **`supabase/config.toml`** gerado por `supabase init`. No local, só o provedor de e-mail fica ligado (para os testes das histórias seguintes) e nenhum outro.
4. **Migração `supabase/migrations/<timestamp>_articles.sql`.** O rascunho `0001_articles.sql` é apagado e o `tests/unit/migracao-sql.test.ts` passa a conferir a migração nova (ou é substituído por testes em `tests/db/`). A migração cria:
   - extensão `unaccent` e a função `public.normalizar_busca(text)`, `immutable`, que espelha `normalizarParaBusca` do JS: sem acento, minúsculas e espaços colapsados;
   - `articles` com os campos da spec §7.1. `slug` usa `collate "C"`, para a ordem por slug ser a mesma do JS (`<` por code point). `tags` é `text[]` de slugs, na ordem do frontmatter;
   - a constraint de `origem` da spec: `ficticio or fonte <> 'squad' or coalesce(btrim(origem),'') <> ''`;
   - `article_revisions`, só inserção, com `unique (article_id, numero)`;
   - `tags (slug, rotulo)`;
   - o trigger que mantém `busca_normalizada` com título, linha fina, para cada tag o slug com `-` trocado por espaço e o rótulo da tabela `tags` (quando existir), e o corpo, um campo por linha (`\n`), igual a `textoBuscavel`. Um trigger em `tags` recalcula as matérias que usam a tag alterada;
   - RLS ligado nas três tabelas. `anon` e `authenticated` leem `articles` com `status = 'publicado'` e leem `tags`. Ninguém mais tem política; as de admin ficam para a 16.
5. **Busca por RPC** *(decisão do orquestrador, desvio do plano)*. Em vez de `ilike` montado pelo cliente, a busca chama `public.buscar_artigos(termos text[])`, `stable`, `security invoker` (o RLS vale), que devolve as matérias em que **todo** termo aparece em `busca_normalizada` por `strpos(...) > 0`. **Motivo:** o `ilike` trata `%` e `_` como curinga, e o PostgREST também troca `*` por `%`. Uma busca por "50%" deixaria de ser substring. O `strpos` é a substring literal do contrato da v1. Os termos chegam já normalizados pelo `termosDaBusca` do JS. Busca vazia ou só com espaços devolve `[]` sem ir ao banco.
6. **`config.ts`:** `CONTENT_SOURCE` aceita `"files" | "supabase"`. Com `supabase`, exige `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`. A mensagem de erro lista **todas** as que faltam. Valor desconhecido continua sendo erro.
7. **`SupabaseArticleRepository`** em `src/lib/content/supabase/repository.ts` (`server-only`), construtor `({ client, mostrarExemplos })`, mesmo contrato do `FileArticleRepository`:
   - ordem `publicado_em desc, slug asc` (os mesmos resultados de `compararArtigos`);
   - `RangeError` em `page < 1` e `pageSize < 1` antes de ir ao banco, com a mesma mensagem;
   - `getBySlug` com slug fora do `SLUG_REGEX` devolve `null` sem ir ao banco;
   - rótulo da tag: o da tabela `tags` ou `humanizarTag(slug)`;
   - `tempo_de_leitura` calculado por `readingTime(corpo_md)` no app, como hoje;
   - `listEditorias` e `listTags` com os mesmos totais e a mesma ordem de `contarEditorias`/`contarTags` (reaproveite as funções puras de `catalog.ts` sempre que der);
   - `MOSTRAR_EXEMPLOS=false` filtra `ficticio = false` na consulta.
8. **`getRepository()`** escolhe pela fonte. A instância continua memorizada em produção (chave: fonte + `mostrarExemplos`). O cliente Supabase é criado com a chave anon e `auth: { persistSession: false }`.
9. **Cache Components com o banco.** Com `CONTENT_SOURCE=supabase`, as leituras vão à rede, e o prerender do Next 16 recusa dado sem cache fora de `<Suspense>`. Se o `pnpm build` com `supabase` exigir, envolva as leituras do repositório Supabase em funções `"use cache"` **dentro de `src/lib/content/`** (as telas não mudam), com as etiquetas que a história 14 vai usar (`materias`, `materia:<slug>` e `tags`, exportadas como constantes em `src/lib/content/cache.ts`) e um `cacheLife` longo. A invalidação (rota, webhook) continua na 14. Consulte `node_modules/next/dist/docs/` (`use cache`, `cacheTag`, `cacheLife`) antes de escrever e registre a decisão no ADR. No modo `files`, o comportamento da v1 não muda.
10. **Importação** `scripts/importar-conteudo.ts` (`pnpm db:importar [--prod] [--sim] [--dir <pasta>]`):
    - lê `<dir>/materias/*.md` e `<dir>/tags.json` (padrão `content/`) com o **mesmo** `carregarArtigosDoDisco`;
    - upsert por slug com `fonte = 'squad'` para matéria real com `origem` e `fonte = 'importacao'` para as fictícias, `status = 'publicado'`, `revisao_publicada = revisao_em_edicao = 1` e a revisão 1 com o snapshot completo;
    - idempotente: a segunda execução não muda linhas nem `updated_at` e não cria revisão nova (compare o conteúdo antes de gravar);
    - usa a `service_role` de `carregarAmbiente`.
11. **`scripts/lib/ambiente.ts`:** `carregarAmbiente({ prod, sim })` como no plano. Lê `.env.local` por padrão e `.env.prod.local` com `prod`. Com `prod`, imprime "Destino: PRODUÇÃO (<host>)". Num TTY, pede `s/N`; fora de TTY, sem `--sim`, aborta com código 1. Nunca imprime chave. O teste de unidade cobre os quatro casos (local; prod + TTY + s; prod + TTY + N; prod sem TTY sem `--sim`) e mais prod sem TTY com `--sim`.
12. **Ambiente local:** o `.env.local` (fora do git) aponta para o Supabase local. Os testes de banco **não dependem dele**: leem URL e chaves de `supabase status --output json` num helper de `tests/db/`. A doc `docs/operacao/supabase-local.md` explica como gerar o `.env.local` a partir do `supabase status`.
13. **Suíte de contrato** `tests/contract/article-repository.contract.ts` com `descreverContratoDoRepositorio(nome, criar)` e os casos do plano (ordem com empate por slug, filtros, paginação e `RangeError`, `getBySlug` inexistente e malformado → `null`, `MOSTRAR_EXEMPLOS=false`, rótulo humanizado, busca "sao paulo"/"SÃO PAULO"/"São Paulo", termos em E e um termo com `%`). Ela usa uma fixture própria (crie `tests/fixtures/content/contrato/` se a `basico` não cobrir acento, tag sem rótulo e fictícia). Roda com o `FileArticleRepository` em `pnpm test` e com o `SupabaseArticleRepository` em `pnpm test:db`, depois de importar a mesma fixture.
14. **RLS de leitura** (`tests/db/rls-leitura.test.ts`): `anon` não vê `rascunho` (nem por `getBySlug`, nem por busca, nem direto na tabela); `anon` não insere, não altera e não apaga em `articles`, `article_revisions` e `tags`; `anon` não lê `article_revisions`.
15. **Regra do repositório:** o `tests/unit/regra-do-repositorio.test.ts` passa a recusar o import de `@supabase/supabase-js` fora de `src/lib/content/supabase/`, `src/lib/admin/`, `src/lib/auth/`, `scripts/` e `tests/`, e permite `fs` em `scripts/`.
16. **Paridade no site:** com `CONTENT_SOURCE=supabase` apontando para o local (e o conteúdo real importado), `pnpm build && pnpm start` serve a capa, a matéria do PSG, `/editorias/analise`, `/tags/psg` e `/busca?q=sao ciriaco` iguais ao modo `files`. O revisor confere com screenshots comparados.
17. **ADR** `docs/adr/0008-supabase-como-fonte.md`: fonte e chaves, busca por RPC com `strpos` (e por que não full-text nem `ilike`), `collate "C"`, cache no modo supabase (critério 9) e a suíte de contrato.
18. **Portões:** os cinco da v1, mais `pnpm test:db`. `pnpm test` e `pnpm test:e2e` continuam rodando sem Docker e com `files`.

## Fora do escopo
- `/api/revalidar`, webhook, proxy com cache, `error.tsx`, CI e Vercel: história 14.
- Importar na produção: história 14 (`pnpm db:importar --prod --sim`).
- Políticas de admin e perfis: história 16.

## Riscos conhecidos
- **Deploy de produção depois do merge.** A Vercel já tem `CONTENT_SOURCE=supabase` em Production e o banco de produção ainda está vazio (as migrações só vão por CI na 14). O build de produção desta história deve falhar, e a Vercel mantém o deploy anterior no ar. Isso é esperado e se resolve na 14.
