# ADR 0009: Autorização do admin por perfis e RLS

**Status:** aceito · **Data:** 2026-11-21 · **História:** `docs/backlog/16-login-admin.md`

Fontes consultadas:
- Spec `docs/superpowers/specs/2026-11-21-blog-fut-v2-supabase-design.md`, §7.1, §7.2 e §7.6, e plano `docs/superpowers/plans/2026-11-21-blog-fut-v2.md` (História 16 e risco 1 do Foco de revisão).
- `node_modules/@supabase/ssr` (README, `docs/design.md` e `src/createServerClient.ts`): `getAll`/`setAll`, um cliente por requisição, e o aviso de que o servidor precisa devolver o token renovado em `Set-Cookie`, porque o refresh token só pode ser usado uma vez.
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/cookies.md` (Server Components não gravam cookie), `02-guides/server-actions.md` ("Authenticate and authorize" dentro de toda action), `04-functions/refresh.md` e `03-file-conventions/proxy.md`.

## Contexto
O `/admin` entra com login Google (U2). Qualquer pessoa com uma conta Google consegue entrar e ganhar um JWT `authenticated` do Supabase. Esse JWT, mais a chave anon (que é pública), basta para chamar a API REST direto, sem passar pelas telas. Então "estar logado" não pode valer nada: só um perfil **aprovado** por outro admin lê rascunhos e grava.

## Decisão

### 1. Perfis
`public.perfis` tem uma linha por usuário do Auth (`user_id` → `auth.users`, `on delete cascade`), com `email`, `nome` e `avatar_url` do Google, `status` (`pendente`, `aprovado`, `recusado`, `revogado`; padrão `pendente`), `papel` (`admin`), `decidido_por`, `decidido_em` e `created_at`.
- O trigger `perfis_ao_criar_usuario` (`after insert on auth.users`, função `security definer` com `search_path = ''`) cria o perfil `pendente` no primeiro login. Ele lê `full_name` ou `name` e `avatar_url` ou `picture` de `raw_user_meta_data`: o Google manda os dois pares, conforme a versão da integração.
- Quem foi recusado não gera pedido novo a cada login: o trigger só roda no insert do usuário, e o perfil continua `recusado`.
- A migração também cria o perfil `pendente` de quem já existia em `auth.users`, com `on conflict do nothing`. Ela não apaga nem altera nada das tabelas da história 13.

### 2. `public.eh_admin()`
`security definer`, `stable` e `search_path = ''`. É verdadeira quando o perfil de `auth.uid()` está `aprovado` (e com papel `admin`). Ela lê `perfis` como dona da tabela, sem passar pelo RLS de `perfis`, que a usa (sem isso, a política chamaria a si mesma). Só `authenticated` executa: todas as políticas que a chamam são `to authenticated`, e o anon nunca a avalia. As políticas usam `(select public.eh_admin())`, para o Postgres avaliar uma vez por consulta, não uma por linha.

### 3. Duas camadas
- **Servidor.** `src/lib/auth/servidor.ts` lê o usuário com `getUser()`, que confere o token no Auth. O `getSession()` só lê o cookie, que o navegador pode forjar, e nunca serve para autorizar (`tests/db/auth-servidor.test.ts` adultera a assinatura do token e espera `null`). As server actions de `src/lib/admin/acessos.ts` leem a sessão no servidor, recusam quem não está aprovado antes de ir ao banco, e `decidirAcesso` (`src/lib/admin/decisoes.ts`) ainda chama `eh_admin()` no banco, recusa o próprio usuário e só grava a partir do status esperado (`.in("status", de)`), para dois admins decidindo ao mesmo tempo não se atropelarem. O layout do grupo `src/app/admin/(painel)/` confere a sessão e o status antes de mostrar qualquer tela do painel, dentro de um `<Suspense>`; `/admin/entrar` e `/admin/auth/callback` ficam fora do grupo, porque é por eles que a sessão começa. Antes disso, o Proxy manda para `/admin/entrar` quem chega ao painel sem nenhum cookie de sessão (checagem otimista, sem rede; só o nome do cookie). O `/admin/acessos` confere o status de novo e lê com a sessão do usuário, então o RLS é a última camada.
- **Banco (RLS), a garantia final.** O cliente do servidor usa a sessão do usuário, nunca a chave de serviço. Políticas:
  - `articles`: o admin lê todas (inclusive rascunhos), insere e altera. Ninguém apaga pela API.
  - `article_revisions`: o admin lê e insere. **Nenhuma** política nem grant de `update` ou `delete`, nem para o admin. A revisão inserida pela API precisa ser do painel e assinada por quem está logado (`origem_da_revisao = 'painel'` e `autor_id = auth.uid()`): as do squad e da importação só entram pela service_role, e ninguém forja a revisão 1 de uma matéria do squad.
  - `perfis`: todo `authenticated` lê o próprio perfil; o admin lê todos e altera o de **outro** usuário (`user_id <> auth.uid()` no `using` e no `with check`), assinando a decisão (`decidido_por = auth.uid()` no `with check`).
  - **Grants mínimos** para `authenticated`: `select, insert, update` em `articles`; `select, insert` em `article_revisions`; `select` em `tags` e `perfis`; e `update` **só** nas colunas `status`, `decidido_por` e `decidido_em` de `perfis`. Mesmo uma política errada não abre `delete`, nem deixa o admin trocar o e-mail ou o papel de alguém. O `anon` continua só com o `select` da história 13.
  - As funções internas (`normalizar_busca`, `calcular_busca_normalizada`, `enviar_materia_do_squad`, `publicar_revisao`, as do webhook e a do trigger de perfis) continuam sem `execute` para `authenticated`.

`tests/db/rls-admin.test.ts` cobre o risco 1 com usuários reais (anon, pendente, aprovado, recusado e revogado), cada um com o próprio JWT. `tests/db/acessos.test.ts` mostra as duas camadas: chamando `decidirAcesso` com um `decisorId` que não é o dono do JWT, a checagem do servidor passa e o RLS recusa sozinho.

### 4. Por que o admin não muda o próprio status
Para o painel nunca ficar sem dono (spec §7.2). Se o último admin pudesse se revogar ou se recusar, ninguém mais aceitaria pedidos, e só a service_role resolveria. A regra vale nas duas camadas: `decidirAcesso` recusa antes de ir ao banco (`proprio_usuario`), e a política de `perfis` exclui `auth.uid()`. A tela (fase 2) mostra a própria linha sem ação.

### 5. Transições
| Ação | De | Para |
|---|---|---|
| Aceitar | `pendente` | `aprovado` |
| Recusar | `pendente` | `recusado` |
| Revogar | `aprovado` | `revogado` |
| Reabrir | `recusado` ou `revogado` | `pendente` |

**Decisão desta história:** "Reabrir" devolve o pedido para os pendentes, e um admin decide de novo com Aceitar ou Recusar. O plano falava em "recusado → aprovado (o fluxo reabrir)". Voltar para `pendente` deixa a decisão explícita, com quem decidiu registrado em `decidido_por`, e mantém uma ação por transição. Toda decisão grava `decidido_por` e `decidido_em`. As transições ficam no servidor (`TRANSICOES`), e não no banco: o banco garante quem pode decidir, e o servidor, o que faz sentido decidir.

### 6. O primeiro admin
Sem um admin, ninguém aceita o primeiro pedido. `pnpm admin:promover <email> [--prod] [--sim]` (`scripts/admin-promover.ts`) torna `aprovado` o perfil desse e-mail com a service_role, que ignora o RLS, pela mesma trava de ambiente dos outros comandos (`carregarAmbiente`: local por padrão; `--prod` mostra o destino e pede confirmação). A comparação não diferencia maiúsculas e escapa os curingas do `ilike` (`%`, `_` e o `*` do PostgREST), com uma comparação exata em JS no fim. Sem perfil, sai com código 1 e explica que a pessoa precisa entrar uma vez em `/admin/entrar`. Já aprovado, avisa e sai com código 0. Na promoção, `decidido_por` fica nulo: ninguém decidiu pelo painel. A saída mostra o e-mail mascarado (`p***@dominio`), porque o relatório de uma sessão pode ir para o git.

### 7. Tags de rascunho
*(Sugestão do PR #19, decisão do orquestrador.)* A leitura pública de `tags` passa a mostrar só as tags usadas por alguma matéria publicada (`exists` em `articles` com `status = 'publicado'` e `tags @> array[slug]`, pelo índice GIN). Uma tag nova de um rascunho não vaza o assunto antes da publicação. O admin vê todas. O subselect passa pelo RLS de `articles` de quem lê. O `SupabaseArticleRepository` não muda: ele só precisa dos rótulos das tags das matérias publicadas, e a suíte de contrato continua verde. O cálculo da `busca_normalizada` roda num trigger `security definer` e continua achando o rótulo da tag de um rascunho.

### 8. Sessão e cookies
O `@supabase/ssr` guarda a sessão em cookies (`sb-<ref>-auth-token`, em pedaços se passar de ~3 KB). Server Components não gravam cookie, e o refresh token só pode ser usado uma vez: se o layout renovasse o token sem devolver o cookie novo, a requisição seguinte chegaria com um token gasto, e a pessoa seria deslogada. Por isso o Proxy renova a sessão vencida antes da renderização (ADR 0006, "Extensão (história 16)"), e o `setAll` de `criarClienteDoServidor` ignora o erro de gravação num Server Component. Em Server Actions e Route Handlers (login, callback, sair), ele grava normalmente.

## Alternativas consideradas
1. **Só a checagem no servidor, sem RLS de admin.** Uma conta Google qualquer com o próprio JWT leria e gravaria pela API. Rejeitada: é exatamente o risco 1.
2. **Papel no JWT (custom claims via Auth Hook).** Evitaria a consulta a `perfis`, mas o claim só muda quando o token é renovado: um admin revogado continuaria admin por até uma hora. Rejeitada.
3. **Transições no banco (trigger ou função `decidir_acesso`).** Mais uma função `security definer` para manter, sem ganho de segurança: a política já impede o que importa (quem decide e o próprio status). Rejeitada por ora.
4. **Reabrir → aprovado direto.** Rejeitada pelo motivo da seção 5.

## Consequências
- A história 17 abre o `execute` de `publicar_revisao` para `authenticated` (o painel). Quando isso acontecer, a primeira linha do corpo precisa ser `if not public.eh_admin() then raise exception ...` (comentário na migração da história 15), senão qualquer conta logada publicaria. O `rls-admin.test.ts` falha quando o `execute` for aberto, e a 17 precisa trocar esse caso por um teste de que só o aprovado publica.
- A revisão inserida pelo painel precisa de `origem_da_revisao = 'painel'` e `autor_id = auth.uid()`. Se a 17 precisar de outra forma (por exemplo, restaurar uma revisão antiga), o snapshot copiado continua sendo uma revisão nova do painel, assinada por quem restaurou.
- Gravar tags pela API não é permitido nem ao admin. Se o editor (18) criar tags novas, a história abre `insert` em `tags` com política de admin.
- A política das tags faz um `exists` por tag lida. Com poucas dezenas de tags e o índice GIN em `articles.tags`, o custo é desprezível.
