# Colocar no ar (história 14)

História: `docs/backlog/14-vercel-cache.md`. Contas: `docs/operacao/contas-v2.md`. Decisões: ADR 0008 (§7 e §8) e ADR 0006 ("Extensão (história 14)").

O orquestrador segue estes passos **depois do merge** da história 14 e preenche a seção "Resultado". Nenhum passo roda `vercel deploy`: o deploy vem da integração Git da Vercel.

## Ordem dos passos
1. **Migrações pelo CI.** O merge na `main` com arquivos novos em `supabase/migrations/` dispara o `.github/workflows/migracoes.yml`. Ele faz `supabase link` e `supabase db push --remote`. Confira se rodou verde:
   ```
   GH_TOKEN=$(gh auth token --user oabnerwilliam) gh run list --workflow migracoes.yml --limit 1
   ```
   Se falhou, nada dos passos seguintes funciona. Veja o log com `gh run view <id> --log-failed`.
2. **Vault de produção.** `pnpm db:vault --prod --sim`. A base é o `SITE_URL` do `.env.prod.local`, e o segredo é o `REVALIDATE_SECRET` do mesmo arquivo, que precisa ser igual ao da Vercel. O comando mostra "Destino: PRODUÇÃO (<host>)" e a URL gravada, mas nunca o segredo.
3. **Conteúdo.** `pnpm db:importar --prod --sim`. São 9 matérias e as tags. Cada gravação dispara o webhook, que invalida o cache do site.
4. **Conferir o site.** Abra `SITE_URL/`. O esperado é 200 com as 9 matérias vindas do banco.
   - Se o deploy da Vercel do merge falhou ou saiu vazio (ele roda antes das migrações e da importação), a importação do passo 3 já invalidou o cache. Recarregue.
   - Se ainda assim não aparecer, registre aqui como pendência. Não rode `vercel deploy`.
5. **Busca na produção.** Rode `select normalizar_busca('ÇÉDILHA ß Æ Ø Đ Ł')` no SQL Editor e compare com o local (sugestão do PR #16).
6. **Keep-alive.** No painel da Vercel, em Settings → Cron Jobs, confira que `/api/manter-ativo` aparece com `0 9 * * *`. A rota responde 401 sem o `CRON_SECRET`.

## Variáveis da Vercel (conferir, sem imprimir valores)
Production: `SITE_URL`, `CONTENT_SOURCE=supabase`, `MOSTRAR_EXEMPLOS`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `REVALIDATE_SECRET`, `CRON_SECRET` e `ADMIN_HABILITADO`. Preview: `CONTENT_SOURCE=files` (U14).

**Nunca** configure `TTL_DO_INDICE_MS_TESTE` nem `BUILD_DE_TESTE` na Vercel. As duas são só dos testes.

## O que foi verificado antes do merge (local)
- O webhook chega ao site: `tests/db/webhook.test.ts` (payload, header do segredo, sem Vault não faz nada) e `pnpm test:e2e:db`, que publica, edita e despublica no banco e confere a capa e a página em até 5 s, com um controle sem Vault.
- O build passa com o banco fora do ar (`CONTENT_SOURCE=supabase NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:9 pnpm build`), e a capa mostra a tela de erro sem stack (`pnpm test:e2e:sem-banco`).
- `/api/revalidar` e `/api/manter-ativo` respondem 401 sem segredo (testes de unidade).

## Resultado
Preenchido pelo orquestrador em 2026-11-21, depois do merge do PR #17. Produção: `https://blog-fut-tau.vercel.app`.

| Passo | Resultado |
|---|---|
| 1. Migrações pelo CI | ✅ O `migracoes.yml` rodou verde e aplicou `20261121180000_articles.sql` e `20261121190000_webhook_revalidar.sql`. |
| 2. `db:vault --prod --sim` | ✅ Gravou `url_revalidar = https://blog-fut-tau.vercel.app/api/revalidar` e o segredo, sem exibir o valor. O segredo do `.env.prod.local` é igual ao da Vercel: um `POST /api/revalidar` com ele respondeu 200, e sem ele, 401. |
| 3. `db:importar --prod --sim` | ✅ 9 matérias inseridas, mais as tags. |
| 4. `SITE_URL/` com 9 matérias | ✅ A capa mostra links para as 9 matérias. O deploy do merge foi gerado com o banco vazio, e a importação o atualizou pelo webhook, sem novo deploy. Responderam 200: `/`, a matéria do PSG, `/editorias/analise`, `/tags/psg`, `/busca?q=sao ciriaco` e `/sitemap.xml`. `/materias/nao-existe` responde 404. |
| 5. `normalizar_busca` na produção | ✅ `'ÇÉDILHA ß Æ Ø Đ Ł São Ciríaco'` virou `cedilha ß æ ø đ ł sao ciriaco`, igual ao `normalizarParaBusca` do JS. |
| 6. Cron na Vercel | ✅ `vercel crons ls` mostra `/api/manter-ativo` com `0 9 * * *`. A rota responde 401 sem o `CRON_SECRET`. |

## Depois do merge da história 16: login e primeiro admin
História: `docs/backlog/16-login-admin.md`. Decisões: ADR 0009 e ADR 0006 ("Extensão (história 16)"). O orquestrador segue estes passos e registra o resultado no relatório, **sem o e-mail de ninguém**.
1. **Migração pelo CI.** O `migracoes.yml` aplica `<timestamp>_perfis.sql`, que é não destrutiva: cria `perfis`, `eh_admin()` e as políticas do admin, e troca a política de leitura das tags. Confira o run verde, como no passo 1 acima. Depois, `SITE_URL/` continua com as 9 matérias e as mesmas tags.
2. **Admin ligado só na Production.** `ADMIN_HABILITADO=true` na Production e `false` no Preview. Confira que `SITE_URL/admin/entrar` responde 200 e que, num preview, qualquer `/admin/**` responde 404.
3. **Provedor Google.** No Supabase, em Authentication → Providers → Google, o provedor está ligado, e as Redirect URLs incluem `SITE_URL/admin/auth/callback` (`docs/operacao/contas-v2.md`, passo 3).
4. **Primeiro login do usuário.** O usuário entra uma vez em `SITE_URL/admin/entrar` com o Google e vê "pedido enviado". Isso cria o perfil `pendente`.
5. **Primeiro admin.** `pnpm admin:promover <e-mail do usuário> --prod --sim`. O e-mail vem da memória da sessão, nunca do git. A saída mostra só o e-mail mascarado. Se responder "Nenhum perfil com o e-mail…", o passo 4 ainda não aconteceu: registre como pendência e não tente criar o perfil à mão.
6. **Conferir.** O usuário recarrega `/admin` e vê o painel. Em `/admin/acessos`, a linha dele aparece sem ação.

## Pendências conhecidas
- O índice de rotas do Proxy é por instância. Na Vercel, cada função aquecida tem o seu, e o prazo de 60 s para uma matéria nova sair do 404 vale para cada uma.
- A primeira chamada do cron só acontece no dia seguinte ao deploy, às 9h UTC.
