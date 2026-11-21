# Contas da v2: o que o usuário prepara antes da sessão autônoma

Plano: `docs/superpowers/plans/2026-11-21-blog-fut-v2.md`, Parte 0. Spec: `docs/superpowers/specs/2026-11-21-blog-fut-v2-supabase-design.md`, U10 e U15.

Este guia leva uns 30 a 40 minutos. Nenhuma senha vai para o chat nem para o git: as chaves ficam no `.env.producao.local`, que está no `.gitignore`, e nos painéis da Vercel e do GitHub.

## 1. Supabase (produção, plano gratuito)
1. Em https://supabase.com, crie um projeto. Sugestão de nome: `blog-fut`. A região mais próxima é São Paulo (`sa-east-1`). Anote a **senha do banco**.
2. Em **Project Settings → API**, anote três valores:
   - a `Project URL`;
   - a chave `anon` / publishable;
   - a chave `service_role` / secret.
3. Em **Project Settings → General**, anote o **Reference ID** (`project-ref`).
4. Em **Account → Access Tokens**, crie um token chamado `blog-fut-ci` e anote-o. Ele é usado pelo GitHub Actions para aplicar as migrações.
5. Em **Authentication → Providers**, deixe tudo desligado por enquanto, inclusive o e-mail. O Google é ligado no passo 3.
6. Em **Database → Extensions**, você não precisa fazer nada: as migrações ligam `unaccent` e `pg_net`.

## 2. Vercel
1. Em https://vercel.com, faça **Add New → Project** e importe `oabnerwilliam/blog-fut`, mantendo o framework Next.js. O primeiro deploy pode falhar por falta de variáveis, e tudo bem.
2. Anote o domínio de produção, por exemplo `blog-fut.vercel.app`.
3. Em **Settings → Environment Variables**, cadastre:

| Variável | Production | Preview |
|---|---|---|
| `SITE_URL` | `https://<domínio de produção>` | `https://<domínio de produção>` |
| `CONTENT_SOURCE` | `supabase` | `files` |
| `MOSTRAR_EXEMPLOS` | `true` | `true` |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL | (não cadastrar) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | chave anon | (não cadastrar) |
| `REVALIDATE_SECRET` | um texto aleatório longo, gerado com `openssl rand -hex 32` | (não cadastrar) |
| `CRON_SECRET` | outro texto aleatório | (não cadastrar) |
| `ADMIN_HABILITADO` | `true` | `false` |

Não cadastre a `service_role` na Vercel. Nenhuma rota precisa dela por enquanto.

4. Opcional: se você instalar a CLI (`npm i -g vercel`) e rodar `vercel login` e `vercel link` dentro do repositório, a sessão autônoma consegue conferir as variáveis com `vercel env ls`. Sem isso, ela só relata.

## 3. Google Cloud (OAuth)
1. Em https://console.cloud.google.com, crie um projeto chamado `blog-fut`.
2. Em **APIs & Services → OAuth consent screen**, escolha o tipo External, use o nome "Zona Mista" e o seu e-mail de suporte. Publique o app, ou adicione como usuários de teste os e-mails que vão pedir acesso.
3. Em **Credentials → Create credentials → OAuth client ID**, escolha **Web application**.
   - **Authorized JavaScript origins:** `https://<domínio de produção>` e `http://localhost:3000`.
   - **Authorized redirect URIs:** `https://<project-ref>.supabase.co/auth/v1/callback`.
4. Copie o **Client ID** e o **Client secret**.
5. De volta ao Supabase, em **Authentication → Providers → Google**, ligue o provedor e cole os dois.
6. Em **Authentication → URL Configuration**:
   - **Site URL:** `https://<domínio de produção>`;
   - **Redirect URLs:** `https://<domínio de produção>/admin/auth/callback` e `http://localhost:3000/admin/auth/callback`.

## 4. Secrets do GitHub
Em `github.com/oabnerwilliam/blog-fut` → **Settings → Secrets and variables → Actions**, crie:
- `SUPABASE_ACCESS_TOKEN`: o token do passo 1.4;
- `SUPABASE_DB_PASSWORD`: a senha do banco;
- `SUPABASE_PROJECT_REF`: o Reference ID.

Também dá para criar pelo terminal, digitando o valor quando o comando pedir:
```
GH_TOKEN=$(gh auth token --user oabnerwilliam) gh secret set SUPABASE_ACCESS_TOKEN
```

## 5. `.env.producao.local` (na raiz do blog-fut, nunca commitado)
```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<chave anon>
SUPABASE_SERVICE_ROLE_KEY=<chave service_role>
SITE_URL=https://<domínio de produção>
REVALIDATE_SECRET=<o mesmo da Vercel>
```

## 6. Máquina local
- O Docker Desktop precisa estar **aberto** durante a sessão, porque o Supabase local roda nele.
- Não é preciso instalar o Supabase CLI: ele entra como dependência do projeto na história 13.

## 7. Depois da história 16 (login)
1. Abra `https://<domínio>/admin/entrar` e entre com o seu Google uma vez. Você vai ver "pedido enviado".
2. A sessão, ou você, roda `pnpm admin:promover <seu e-mail> --prod --sim`. A partir daí, você é o primeiro admin e aceita os próximos pedidos em `/admin/acessos`.

## Checklist rápido para a sessão autônoma conferir (sem imprimir valores)
- [ ] `.env.producao.local` com as 5 chaves.
- [ ] `gh secret list` mostra os 3 secrets.
- [ ] Projeto Vercel ligado ao repositório, com as variáveis da tabela.
- [ ] Provedor Google ativo no Supabase.
- [ ] Docker Desktop aberto.
