# 14: Vercel, cache com etiqueta e resiliência

**Status:** pronta para desenvolvimento
**Branch:** feat/14-vercel-cache
**Tipo:** cache, rotas de API, banco, CI e produção. Só uma tela nova (`error.tsx`), na identidade da v1 e sem mockup.
**Escrita por:** orquestrador, em 2026-11-21, na sessão autônoma da v2.
**Base:** plano `docs/superpowers/plans/2026-11-21-blog-fut-v2.md` (História 14), spec §7.4 e §7.8 (U5, U11 a U15) e ADR 0008. A 13 já entregou `src/lib/content/cache.ts` com as etiquetas e as leituras em `"use cache"` + `cacheLife("max")`. O `fetch` do Supabase usa `no-store`.

## Critérios de aceite

1. **`/api/revalidar` (`POST`)**:
   - exige o header `x-revalidate-secret` igual a `REVALIDATE_SECRET`, comparado com `timingSafeEqual` depois de igualar o tamanho (um hash dos dois lados resolve);
   - o corpo é `{ tabela: "articles" | "tags", slug?: string, slug_antigo?: string }`, validado com zod;
   - para `articles`, invalida `materias`, `materia:<slug>` e `materia:<slug_antigo>`, se houver; para `tags`, invalida `tags` e `materias`, porque os rótulos aparecem nas listagens;
   - responde 401 sem segredo, com segredo errado, com segredo de tamanho diferente e quando `REVALIDATE_SECRET` não está definido no servidor; 400 com payload inválido; 200 com `{ revalidado: string[] }`;
   - consulte `node_modules/next/dist/docs/` para saber qual API invalida a partir de um route handler no Next 16 (`revalidateTag` com perfil ou outra) e registre a escolha no ADR 0008;
   - teste de unidade do handler.
2. **Webhook por migração** (`supabase/migrations/<timestamp>_webhook_revalidar.sql`):
   - cria `pg_net` (`create extension if not exists pg_net`);
   - cria `public.avisar_revalidacao()`, `security definer` com `search_path` fixo, que lê `url_revalidar` e `segredo_revalidar` de `vault.decrypted_secrets` e chama `net.http_post` com o header do segredo e o payload do critério 1. O `slug_antigo` só vai quando o slug mudou;
   - cria triggers `after insert or update or delete` em `articles` e `tags`;
   - sem URL no Vault, a função retorna sem fazer nada e a gravação não quebra;
   - `revoke execute` de `public`, `anon` e `authenticated`.
3. **`scripts/configurar-vault.ts` (`pnpm db:vault [--prod] [--sim] [--url <base>]`):**
   - grava ou atualiza `url_revalidar` (`<base>/api/revalidar`, com base padrão no `SITE_URL` do arquivo de ambiente) e `segredo_revalidar` (`REVALIDATE_SECRET`) no Vault, via uma função SQL `security definer` executável só pela `service_role`, ou pelo jeito documentado do Supabase;
   - usa `carregarAmbiente`;
   - nunca imprime o segredo.
   No local, a base é `http://host.docker.internal:<porta>`, porque o Postgres roda no Docker. Documente isso em `docs/operacao/supabase-local.md`.
4. **Proxy (U12) com índice em memória.** O Proxy não aplica `"use cache"` (doc `use-cache.md`; ADR 0008). Por isso, `src/lib/rotas.ts` ganha um `indiceDeRotas` com TTL de 60 s (`TTL_DO_INDICE_MS = 60_000`), com o conjunto de slugs de matérias, editorias e tags com matéria, e os totais para validar `?pagina=`. O `rotaExiste` passa a consultar esse índice. O índice é recarregado no máximo uma vez a cada 60 s, e as requisições que chegam ao mesmo tempo dividem uma única recarga. Se a recarga falhar, o índice antigo continua valendo; sem índice nenhum, a rota passa adiante (a página decide, e nunca sai 500 do proxy). No modo `files`, o resultado é igual ao de hoje. Registre o caminho em `docs/adr/0006-proxy-para-404-de-materia.md`, numa seção "Extensão (história 14)".
   - Teste de unidade com um repositório espião: 100 requisições em 60 s geram uma única carga; depois do TTL, a próxima recarrega; uma matéria nova passa de 404 para 200 depois do TTL (relógio injetado).
5. **Resiliência (U11), com o banco fora do ar:**
   - `generateStaticParams` de matérias, editorias e tags: quando o repositório lança, faz `console.error` e devolve o valor de reserva (`SLUG_DE_RESERVA`);
   - `pnpm build` **passa** com `CONTENT_SOURCE=supabase` apontando para um endereço sem banco (por exemplo `http://127.0.0.1:9`). Investigue na doc do Next 16 como uma página com cache que falha no prerender deixa de quebrar o build, e registre no ADR 0008;
   - leitura que falha na requisição cai no novo `src/app/error.tsx` (cliente, pt-BR, identidade da v1, um `h1`, botão "Tentar de novo" com `reset`), e não numa tela branca nem num stack trace no HTML;
   - e2e: a sem banco (`http://127.0.0.1:9`), a capa mostra o `error.tsx` com o texto em pt-BR e sem stack. Esse e2e roda num projeto Playwright separado com o próprio `webServer`, para não mexer na suíte da v1.
6. **Keep-alive:** `vercel.json` com cron diário `"0 9 * * *"` para `GET /api/manter-ativo`. O handler exige `Authorization: Bearer <CRON_SECRET>` (401 sem ele ou com valor errado; também 401 quando `CRON_SECRET` não está definido), faz `select slug from articles limit 1` com a chave anon e responde 200 `{ ok: true }` ou 503 `{ ok: false }`. Teste de unidade.
7. **Teste de integração do risco 3** (`pnpm test:e2e:db`, novo projeto Playwright com `playwright.db.config.ts`; entra no `test:db`):
   1. sobe `next start` com `CONTENT_SOURCE=supabase` contra o local e `REVALIDATE_SECRET` de teste;
   2. grava o Vault local com a URL `http://host.docker.internal:<porta>`;
   3. insere uma matéria publicada pelo banco (`service_role`);
   4. em até 5 s, ela aparece na capa e na página dela (a página pode dar 404 até o índice do proxy recarregar; deixe o TTL do índice configurável por variável **só para esse teste**, por exemplo `TTL_DO_INDICE_MS_TESTE=1000`, documentada);
   5. a despublicação a tira da capa;
   6. no fim, o banco volta ao `content/` real (o teardown da 13).
8. **CI** `.github/workflows/portoes.yml`, em `pull_request`:
   - pnpm (versão do `packageManager`) e Node 22 com cache;
   - lint, typecheck, test e build;
   - e2e com o Chromium do Playwright em cache;
   - `test:db` com o Supabase CLI do projeto (`supabase start`, o ubuntu-latest já tem Docker).
   As referências visuais da v1 (`visual.spec.ts`) só existem para win32. **Decisão do orquestrador:** no CI, o `visual.spec.ts` é pulado (por exemplo, `testIgnore` quando `process.env.CI`). As referências continuam conferidas nos portões locais. Registre a decisão num comentário no config e no ADR 0008.
9. **Migrações** `.github/workflows/migracoes.yml`, em `push` na `main` com `paths: supabase/migrations/**` e também `workflow_dispatch`: roda `supabase link --project-ref "$SUPABASE_PROJECT_REF"` e `supabase db push`, com os três secrets. Falha quebra o job, sem retry. Um comentário avisa que migração destrutiva exige revisão manual.
10. **Segredos:** nenhum valor no YAML nem no repositório; só `${{ secrets.* }}`.
11. **Doc** `docs/operacao/colocar-no-ar.md`: a ordem dos passos de produção (migrações pelo CI → `db:vault --prod --sim` → `db:importar --prod --sim` → conferir o site), o que foi verificado e as pendências. O orquestrador preenche o resultado real depois do merge.
12. **Portões:** os cinco da v1, mais `pnpm test:db` (com `test:e2e:db`). `pnpm test` e `pnpm test:e2e` continuam rodando sem Docker.

## Depois do merge (orquestrador)
1. Conferir com `gh run` que o `migracoes.yml` rodou verde.
2. `pnpm db:vault --prod --sim` e depois `pnpm db:importar --prod --sim`.
3. Conferir o `SITE_URL/`: 200 com as 9 matérias vindas do banco. Se o deploy da Vercel do merge tiver falhado ou saído vazio, a importação dispara o webhook e invalida o cache. Se mesmo assim não aparecer, fica registrado como pendência (sem `vercel deploy` de escrita).
4. Rodar `select normalizar_busca('ÇÉDILHA ß Æ Ø Đ Ł')` na produção e comparar com o local (sugestão do PR #16).
5. Preencher `docs/operacao/colocar-no-ar.md` num PR `docs/`.

## Fora do escopo
- Admin, login e perfis: história 16.
- Domínio próprio.
