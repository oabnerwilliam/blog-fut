# 16: login Google e solicitações de acesso

**Status:** pronta para design e desenvolvimento
**Branch:** feat/16-login-admin
**Tipo:** autenticação, RLS e quatro telas novas no `/admin`.
**Escrita por:** orquestrador, em 2026-11-21, na sessão autônoma da v2.
**Base:** plano `docs/superpowers/plans/2026-11-21-blog-fut-v2.md` (História 16 e risco 1 do Foco de revisão), spec §7.2 e §7.6 (U2, U3, U14) e ADRs 0006 e 0008.

## Design (designer, sem aprovação do usuário, O2)
Mockups em `docs/design/16-login-admin/`: `/admin/entrar`, "pedido enviado", "acesso não autorizado" e `/admin/acessos`, nos temas claro e escuro, em 375 e 1280.
- Seguem a identidade visual da v1 (`docs/design/tokens.md`), sem tokens novos se não for preciso.
- `/admin/acessos` mostra os pedidos em três grupos: pendentes, aprovados e recusados ou revogados. Cada pessoa aparece com avatar, nome, e-mail e data, e com as ações da linha (Aceitar e Recusar; Revogar; Reabrir). O próprio usuário aparece sem ação.
- O topo do admin é simples: o nome do portal com o marcador "Admin", o nome e o avatar de quem está logado, e o botão "Sair". O cabeçalho público não ganha link de login.

## Critérios de aceite

1. **Dependência** `@supabase/ssr@0.12.7`, com a versão fixada. Consulte a doc do `@supabase/ssr` e a de `cookies()` do Next 16 em `node_modules/next/dist/docs/` antes de escrever.
2. **Migração `<timestamp>_perfis.sql`**, não destrutiva:
   - tabela `perfis` conforme a spec §7.1 (`user_id` como PK e FK para `auth.users` com `on delete cascade`, `email`, `nome`, `avatar_url`, `status` com check `pendente|aprovado|recusado|revogado` e padrão `pendente`, `papel` com padrão `admin`, `decidido_por`, `decidido_em`, `created_at`);
   - trigger `after insert on auth.users`, que cria o perfil `pendente` a partir de `raw_user_meta_data` (`full_name` ou `name`, e `avatar_url` ou `picture`). Ele é `security definer` e tem `search_path = ''`;
   - `public.eh_admin()`: `security definer`, `stable`, `search_path = ''`. É verdadeira quando o perfil de `auth.uid()` está `aprovado`;
   - políticas:
     - o admin lê todas as matérias (inclusive rascunhos), insere e altera `articles`, e lê e insere `article_revisions` (nunca `update` nem `delete`);
     - todo usuário autenticado lê o próprio perfil;
     - o admin lê todos os perfis e altera `status`, `decidido_por` e `decidido_em` de **outro** usuário (`user_id <> auth.uid()`), nunca o próprio;
   - grants mínimos para `authenticated`. O `anon` continua só com o que tinha;
   - **tags de rascunho** *(sugestão do PR #19, decisão do orquestrador)*: a política de leitura pública de `tags` passa a mostrar só as tags usadas por alguma matéria publicada. O admin vê todas. O `SupabaseArticleRepository` continua igual, e a suíte de contrato continua verde.
3. **`src/lib/auth/servidor.ts`** (`server-only`):
   - `criarClienteDoServidor(): Promise<SupabaseClient>`, com cookies via `next/headers`;
   - `obterSessaoDoAdmin(): Promise<{ usuario; perfil } | null>`, que lê o usuário com `getUser()` (nunca só com `getSession()`) e o perfil.
4. **Rotas** (todas dinâmicas):
   - `/admin/entrar`: um único botão "Entrar com Google", com `signInWithOAuth({ provider: "google" })` e `redirectTo = <origem>/admin/auth/callback`;
   - `/admin/auth/callback`: troca o code pela sessão e redireciona para `/admin`. Com erro, volta para `/admin/entrar` com uma mensagem em pt-BR;
   - `src/app/admin/layout.tsx`: confere a sessão e o status no servidor. Sem sessão, redireciona para `/admin/entrar`; `pendente` mostra "pedido enviado"; `recusado` ou `revogado` mostram "acesso não autorizado"; `aprovado` mostra o conteúdo;
   - `/admin`: um painel provisório com o link para `/admin/acessos` (a lista de matérias chega na 17);
   - `/admin/acessos`: a lista do design, com as server actions `aceitar`, `recusar`, `revogar` e `reabrir` em `src/lib/admin/acessos.ts` (`server-only`). Cada action confere `eh_admin` no servidor antes de gravar, recusa mexer no próprio usuário e atualiza `decidido_por` e `decidido_em`;
   - "Sair" faz `signOut` e volta para `/admin/entrar`.
5. **`ADMIN_HABILITADO !== "true"` responde 404 real** em todo `/admin/**`, inclusive no callback. Use o `src/proxy.ts`, que já é a peça do 404 real (ADR 0006): o matcher ganha `/admin/:path*`. Registre a decisão na seção "Extensão (história 16)" do ADR 0006. Com o admin ligado, o proxy não consulta o banco para o `/admin`.
6. **Metadados:** o `/admin` leva `robots: { index: false, follow: false }` e fica fora do sitemap. Nenhuma página pública ganha link ou botão de login.
7. **`scripts/admin-promover.ts`** (`pnpm admin:promover <email> [--prod] [--sim]`): torna `aprovado` o perfil com esse e-mail (comparação sem diferenciar maiúsculas), usando a `service_role` de `carregarAmbiente`. Se o perfil não existir, sai com código 1 e explica que a pessoa precisa entrar uma vez em `/admin/entrar` antes. Já aprovado: avisa e sai com código 0. **O e-mail nunca vai para log commitado nem para fixture.** Nos testes, use e-mails `@exemplo.test`.
8. **Testes de RLS** (`tests/db/rls-admin.test.ts`), sobre o risco 1. Quatro situações reais no Supabase local: `anon` e três usuários criados com `auth.admin.createUser` e logados com `signInWithPassword` (pendente, aprovado e recusado), com o perfil ajustado pela `service_role`:
   - só o aprovado lê rascunho, insere e altera `articles` e insere `article_revisions`;
   - ninguém altera nem apaga `article_revisions`, nem o aprovado;
   - ninguém muda o próprio status, nem o aprovado;
   - o aprovado muda o status de outro usuário; pendente e recusado, chamando a API direto com o próprio JWT, recebem 0 linhas ou erro;
   - o pendente lê só o próprio perfil;
   - com `authenticated`, as funções internas (`normalizar_busca`, `calcular_busca_normalizada`, `enviar_materia_do_squad`, `publicar_revisao` e as do webhook) continuam sem `execute` (sugestão do PR #16);
   - a tag usada só por um rascunho não aparece para o `anon` e aparece para o aprovado;
   - o trigger cria o perfil `pendente` com nome e avatar dos metadados.
9. **e2e de banco** (`pnpm test:e2e:db`, projeto já existente), com `ADMIN_HABILITADO=true`, a sessão injetada por cookie gerado no teste no formato do `@supabase/ssr` (documente o helper):
   - sem sessão, `/admin` redireciona para `/admin/entrar`, que tem um `h1` e o botão "Entrar com Google";
   - o pendente vê "pedido enviado";
   - o recusado vê "acesso não autorizado";
   - o aprovado aceita um pendente em `/admin/acessos`, e esse pendente passa a ver o painel;
   - o aprovado não tem ação na própria linha;
   - axe em cada tela, nos temas claro e escuro, sem rolagem horizontal em 320px.
10. **e2e sem banco** (`pnpm test:e2e`): com `ADMIN_HABILITADO` desligado, `/admin`, `/admin/entrar` e `/admin/acessos` respondem 404.
11. **Regra do repositório:** o `regra-do-repositorio.test.ts` aceita `@supabase/ssr` só em `src/lib/auth/` e `src/lib/admin/`. As páginas do `/admin` obtêm dados só por `src/lib/admin/` e `src/lib/auth/`.
12. **ADR** `docs/adr/0009-autorizacao-perfis-rls.md`: perfis, `eh_admin`, as duas camadas (servidor e RLS), por que o admin não muda o próprio status, o primeiro admin por comando e a política das tags.
13. **Docs:** `docs/operacao/contas-v2.md` §7 e `docs/operacao/colocar-no-ar.md` ganham o passo do primeiro admin.
14. **Portões:** os cinco da v1, mais `pnpm test:db`, e o CI do PR. As referências visuais da v1 não mudam.

## Depois do merge (orquestrador)
- Conferir se o CI aplicou a migração na produção.
- Conferir se `https://blog-fut-tau.vercel.app/admin/entrar` responde 200, porque a Production tem `ADMIN_HABILITADO=true`.
- O usuário precisa entrar uma vez com o Google. Depois disso, o orquestrador roda `pnpm admin:promover <e-mail do usuário> --prod --sim`, com o e-mail guardado na memória e nunca no git. Se o perfil ainda não existir, fica como pendência no relatório.
