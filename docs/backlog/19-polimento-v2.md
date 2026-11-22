# 19: Polimento da v2 (sugestões acumuladas dos PRs #16 a #22)

**Status:** registrada, aguardando priorização do usuário
**Branch sugerida:** chore/19-polimento-v2
**Tipo:** ajustes pequenos de segurança, robustez e acessibilidade no painel. Um item cosmético de UI (critério 11).
**Escrita por:** orquestrador, em 2026-11-22. Junta as sugestões que os revisores registraram nos PRs da v2 e que ainda não foram aplicadas. Cada item cita o PR de origem e foi conferido no código da `main` (`0869a2b`).

## Critérios de aceite

### Segurança (prioridade alta)

1. **`insert` em `articles` só pela RPC** (PR #22). A política "admin cria matérias" da migração `perfis` (`supabase/migrations/*_perfis.sql`, `on public.articles for insert`) permite que um admin insira direto em `articles` pela REST, sem passar por `criar_materia`. Assim, ele escapa das regras que a RPC fixa (`fonte 'painel'`, `status 'rascunho'`, revisão 1 assinada). Uma migração nova, não destrutiva, remove essa política e o `grant insert` em `articles` para `authenticated`. A `criar_materia` (`security definer`) continua funcionando. Um teste em `tests/db/` prova que um admin com o próprio JWT recebe erro no `insert` direto e que a criação pelo painel continua passando.
2. **Corrida no "Publicar alterações"** (PR #21). Com vários admins, um pode publicar a revisão que o outro acabou de mudar. A action e a RPC `publicar_revisao` passam a receber o número da revisão esperada e recusam com uma mensagem em pt-BR se ele mudou. Um teste de banco cobre a recusa.

### Robustez

3. **`listarMaterias` sem o corte do `max-rows`** (PR #21). Hoje, `src/lib/admin/painel.ts` lê todas as revisões com `.in(...)`. Acima de cerca de 1000 linhas, o PostgREST corta o resultado sem avisar. Trocar por uma view ou RPC que devolva só o necessário por matéria.
4. **`max_rows = 1000` nas leituras públicas** (PR #16). `listEditorias`, `listTags` e `search` do `SupabaseArticleRepository` também ficam limitados a 1000 linhas. Hoje não há risco (9 matérias). Paginar, ou registrar um limite explícito com teste, antes de o acervo crescer.
5. **Erro de rede × recusa no `materia:enviar`** (PR #19). Em `scripts/lib/materias.ts`, qualquer erro sai como "O banco recusou a matéria… Nada foi gravado". Numa falha de transporte, o banco pode ter gravado. Separar a recusa do Postgres (com `code`/`hint`) do erro de rede. No erro de rede, a mensagem orienta a conferir no painel antes de reenviar, e o arquivo continua em `content/entrada/`.
6. **`trim` do segredo dos dois lados** (PR #17). `scripts/lib/vault.ts` apara o `REVALIDATE_SECRET`, mas `/api/revalidar` compara o valor cru. Se o valor na Vercel tiver um espaço no fim, a rota responde 401 sem explicar o motivo. Aparar também na rota e testar. Hoje a produção funciona: o `POST` com o segredo respondeu 200.
7. **Cache por termo da busca** (PR #16). Cada termo digitado cria uma entrada em `"use cache"` com `cacheLife("max")` (`src/lib/content/supabase/repositorio-em-cache.ts`). Avaliar um `cacheLife` mais curto só para `search` e registrar a decisão no ADR 0008.
8. **Diff com limite menor** (PR #21). Em `src/lib/admin/diff.ts`, baixar `MAXIMO_DE_CELULAS` de 16M para 4M (cerca de 64 MB no pior caso). O teste do limite acompanha a mudança.

### SEO e acessibilidade

9. **`noindex` na tela de erro** (PR #17). Com o banco fora do ar, `src/app/(site)/error.tsx` sai com status 200 e sem `noindex`. Colocar `<meta name="robots" content="noindex">` na própria tela. Consultar antes, em `node_modules/next/dist/docs/`, como o Next 16 trata metadados em `error.tsx`. O e2e sem banco confere a meta.
10. **`sr-only` do "Ver no site"** (PR #21). Em `src/components/admin/materias/ListaDeMaterias.tsx`, o nome acessível do link usa o título em edição, e o certo é o título publicado (é o que o link abre). Usar o título publicado e cobrir com teste de unidade.

### Painel (UX)

11. **Link "Nova matéria" ao lado dos filtros** (PR #22, cosmético). Hoje ele fica acima dos filtros em `/admin/materias`. Alinhar ao mockup `docs/design/18-editor/`.
12. **Restaurar uma revisão idêntica** (PR #21). Hoje, restaurar uma revisão igual à atual mostra "Revisão N restaurada como revisão M" (`BotoesDaMateria.tsx`), mas nenhuma revisão é criada. A mensagem passa a dizer que nada mudou.
13. **Fila das server actions no editor** (PR #22). No comentário do `EditorDeMateria`, citar a seção "Sequential dispatch" da doc do Next 16 e explicar que uma prévia lenta atrasa o "Criar rascunho". Se for simples, cancelar ou pular a prévia pendente ao criar.

### Fechamento

14. Nenhuma referência visual da v1 muda. Os cinco portões e o `pnpm test:db` passam, e o build sem as variáveis do Supabase continua verde.

## Decisões em aberto (perguntar ao usuário antes de começar)

- **Matéria apagada do disco** (PR #16). Hoje, o `db:importar` só faz upsert e avisa "no banco, mas não no disco". Manter só o aviso, ou criar um `--remover`? Como o `content/materias/` virou fixture de dev desde a 15, a sugestão é manter só o aviso e encerrar o item.
- **Itens 2 e 3**: são os maiores da lista. Entram nesta história ou ficam para quando houver um segundo admin ou mais matérias?

## Já resolvidas (não entram)

- `lower()` dependente do locale (PR #16): conferido na produção na 14, `normalizar_busca` igual ao JS.
- Teste das funções internas com `authenticated` (PR #16): coberto em `tests/db/rls-admin.test.ts` e `tests/db/webhook-autenticado.test.ts`.
- Webhook só para matéria publicada (PR #17): feito na 15.
- Tag de rascunho legível em `public.tags` (PR #19): oculta para o `anon` na 16, e a 18 não cria tag nova em `public.tags`.
- `notFound()` no callback e avatar só `https:` (PR #20): feitos no próprio PR.
- Índice do proxy congelado por erro síncrono (PR #17): em `src/lib/rotas.ts`, `repositorio()` hoje roda dentro do `try` de uma função `async`, e o `finally` libera o `carregando`. Um teste de unidade com um `repositorio` que lança de forma síncrona fecharia o item de vez (opcional, cabe no critério 14).

## Fora do escopo (continua registrado)

- `normalizar_busca` cobre as marcas dos blocos latino, grego e cirílico, e não as de hebraico, árabe e outros (PR #16). O risco é desprezível para pt-BR.
- O `.env.local` local carrega a `service_role` de demonstração do Supabase local no `next build` (PR #16). É só local e não é segredo de produção.
- Com `CONTENT_SOURCE=files`, no `next dev`, uma matéria nova pode dar 404 por até 60 s, por causa do TTL do índice (PR #17).
