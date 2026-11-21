# Blog Fut v2: Supabase, admin e Vercel (design)

**Data:** 2026-11-21 · **Base:** v1 completa na `main` (`0b17cd1`, PRs #1–#13) · **Spec anterior:** `2026-11-19-blog-fut-design.md`

## 1. Intenção
Hoje as matérias vivem em `content/materias/*.md`, entram por PR e o site é gerado no build. O usuário quer **preparar o terreno para coisas novas**:
- um painel de administração dentro do blog;
- matérias criadas direto no banco;
- um editor de texto.

O Supabase passa a ser a **fonte da verdade** das matérias, e o site vai ao ar na **Vercel**.

O motivo não é publicar mais rápido. É ter uma base onde três origens de matéria convivem sem reescrever as telas: o squad-fut, o painel e o editor.

## 2. Objetivos
1. Tabela `articles` real no Supabase, com migrações versionadas, mais `SupabaseArticleRepository` atrás do mesmo `ArticleRepository` (`CONTENT_SOURCE=supabase`).
2. As matérias atuais (8 fictícias + PSG) importadas para o banco. O site público fica **idêntico** ao da v1.
3. Site na Vercel. Uma mudança no banco aparece em segundos, sem build novo.
4. O squad-fut entrega no banco, como **rascunho**.
5. `/admin` com login **exclusivamente Google** (Supabase Auth OAuth) e um fluxo de **solicitação de acesso** aprovado por um admin.
6. Painel: listar, editar e publicar matérias, com **histórico de versões**.
7. Editor de texto para criar matérias no painel.

## 3. Não objetivos (desta v2)
- Login para leitores, comentários, newsletter, analytics, domínio próprio (pode vir depois; o `SITE_URL` já aceita só origem).
- Papéis diferentes (quem escreve e quem publica). O campo de papel nasce agora, mas todo admin pode tudo.
- Upload de imagens. As matérias continuam só com texto.
- Supabase Realtime e colaboração simultânea no editor.

## 4. Antiobjetivos (falha, mesmo funcionando)
- **Qualquer conta Google lendo rascunhos ou gravando matérias.** Login com Google não é autorização. Quem decide são o RLS e a lista de admins.
- **Chave `service_role` no navegador ou no repositório.** O repo é público. As chaves ficam só nas variáveis da Vercel e no `.env.local`, e o `.gitignore` já cobre `.env*`.
- **O site público ficar dinâmico e lento.** As páginas públicas continuam com cache e shell estático. Só `/admin` e as rotas de API são dinâmicas.
- **Perder o texto original do squad.** A revisão 1 de uma matéria do squad é o `final.md` literal e nunca muda.
- **Duas fontes da verdade em produção.** Em produção vale só o banco. Os `.md` ficam para dev e testes.
- **Regredir a v1:** 404 real, `noindex` e sitemap sem fictícias, busca sem acento, a11y AA, 320px e tema sem piscar.

## 5. Decisões do usuário (2026-11-21)
| # | Decisão |
|---|---|
| U1 | Supabase é a fonte da verdade. Prepara o terreno para painel, criação no banco e editor. |
| U2 | `/admin` dentro do blog, com login **só Google** via OAuth do Supabase. |
| U3 | Vários admins. O primeiro login vira **solicitação**, que um admin aceita ou recusa. Aceito, entra. |
| U4 | Ordem das histórias: A (Supabase como fonte) → B (Vercel) → C (squad-fut no banco) → D (login + solicitações) → E (painel) → F (editor). |
| U5 | Atualização do site público: **cache com etiqueta** (`use cache` + `cacheTag`, invalidado com `revalidateTag`/`updateTag`). Sem build por mudança. |
| U6 | O squad-fut entra por **comando que envia como rascunho**. O diagramador continua gravando em `content/entrada/`, e o PR de conteúdo deixa de existir. |
| U7 | Texto da matéria: **editável com histórico**. O banco guarda cada versão; o original do squad é preservado. |
| U8 | Testes com banco de verdade: **Supabase local no Docker** (Supabase CLI). |
| U9 | Editar matéria publicada: **rascunho de edição**. Salvar cria uma revisão, e o site continua mostrando a versão publicada até alguém clicar em "Publicar alterações". |
| U10 | Produção: **o usuário cria as contas e os projetos** (Supabase, Vercel, Google Cloud) seguindo um passo a passo. **Um GitHub Actions** roda os portões em cada PR e aplica as migrações (`supabase db push`) no merge na `main`. |
| U11 | Supabase no **plano gratuito, com keep-alive**: uma consulta leve agendada todo dia. Se o banco estiver fora do ar, o site continua servindo o cache. |
| U12 | 404 real com o banco: o proxy usa a função de leitura com `"use cache"`, se a doc do Next 16 permitir cache no proxy. Se não permitir, um índice em memória com TTL de 60 s. Uma matéria recém-publicada pode dar 404 por até 1 minuto. |
| U13 | Webhook de invalidação **numa migração** (`pg_net` + trigger). A URL e o segredo ficam no **Vault** do Supabase, configurados uma vez por ambiente, e o webhook é testável no Supabase local. |
| U14 | Previews da Vercel: `CONTENT_SOURCE=files`, com o **`/admin` desligado**, que responde 404. O admin é testado no Supabase local e no CI. |
| U15 | **O usuário cria as contas antes** da sessão autônoma (Supabase, Vercel, Google Cloud OAuth, secrets do GitHub e `.env.prod.local`), seguindo `docs/operacao/contas-v2.md`. A sessão conecta e põe no ar. Se uma configuração estiver faltando ou errada, ela **não para tudo**: registra o problema, segue com o que é local e deixa o passo pendente no relatório final. |
| O1 | *(Orquestrador.)* Editor (F): `textarea` de markdown + prévia renderizada pelo mesmo pipeline sanitizado, sem lib de editor. |
| O2 | *(Orquestrador.)* As telas do `/admin` seguem a identidade visual da v1. O designer faz os mockups (D, E, F) e eles não voltam para aprovação do usuário. |

## 6. Abordagens consideradas
- **Atualização (U5).** Cache com etiqueta (escolhida) × build novo por mudança (lento, gasta minutos de build) × sempre dinâmico (lento, carga no banco, perde o estático).
- **Entrada do squad (U6).** Comando com rascunho (escolhida) × comando que publica (sem revisão) × manter PR + GitHub Action (duas fontes da verdade).
- **Texto do squad (U7).** Editável com histórico (escolhida) × corpo travado (mais simples, mas o usuário quer liberdade) × edição livre sem histórico (perde a fidelidade).
- **Testes (U8).** Docker local (escolhida) × projeto de testes na nuvem (precisa de rede e chaves) × só banco falso (o RLS fica sem prova).

## 7. Desenho

### 7.1 Dados (Postgres no Supabase)
Migrações em `supabase/migrations/` (Supabase CLI). O `0001_articles.sql` atual é um rascunho: será **substituído** pela primeira migração real da história A.

**`articles`**: os campos da spec v1 §6.2, mais:
- `id uuid`;
- `status text check in ('rascunho','publicado')`, padrão `rascunho`;
- `corpo_md`;
- `busca_normalizada text`: título + linha fina + tags (slug e rótulo) + corpo, sem acento e em minúsculas. É mantida por trigger com `unaccent` (função `immutable` própria).
- `revisao_publicada int` (nula enquanto a matéria nunca foi publicada) e `revisao_em_edicao int` (a mais recente salva). Os campos editoriais da linha de `articles` são sempre os da **revisão publicada**, que é o que o site lê. A revisão em edição fica só em `article_revisions` até ser publicada (U9);
- `fonte text check in ('squad','painel','importacao')`, separado de `origem`. A `origem` continua sendo o caminho `squad-fut/textos/...` e só é obrigatória quando `fonte = 'squad'` e a matéria é real. *(Decisão do orquestrador, a partir do builder check.)*;
- `created_at` e `updated_at`;
- `publicado_em` continua sendo a data editorial. A primeira publicação não a altera.

A constraint de `origem` passa a ser `ficticio or fonte <> 'squad' or coalesce(btrim(origem),'') <> ''`.

**`article_revisions`**:
- campos: `id`, `article_id`, `numero` (1, 2, 3…), um snapshot completo dos campos editoriais (título, linha fina, corpo, SEO, tags, editoria), `autor_id` (nulo quando a origem é o squad), `origem_da_revisao` (`squad`, `painel`, `importacao`), `created_at`;
- `unique (article_id, numero)`;
- **somente inserção**: nenhuma política permite `update` ou `delete`. A revisão 1 de uma matéria do squad é o texto literal da entrega.

**`tags`**: `slug`, `rotulo`. Substitui o `content/tags.json`. A importação copia o JSON.

**`perfis`**:
- `user_id` → `auth.users`, com `email`, `nome` e `avatar_url` (vindos do Google);
- `status`: `pendente`, `aprovado`, `recusado` ou `revogado`;
- `papel` = `admin`;
- `decidido_por`, `decidido_em`, `created_at`.

Um trigger em `auth.users` cria o perfil `pendente` no primeiro login.

**Editorias** continuam como lista fechada no código (`src/lib/editorias.ts`), espelhada no `check` do banco.

### 7.2 Regras de acesso (RLS)
- **Leitura pública** (papel `anon`): só `articles` com `status = 'publicado'`, e `tags`. Fictícias entram, porque são publicadas e marcadas.
- **Admin:** a função `public.eh_admin()` (`security definer`, `stable`) verdadeira se o perfil do `auth.uid()` está `aprovado`. Admin lê e grava `articles`, insere em `article_revisions`, lê `perfis` e decide solicitações.
- **Quem não é admin** (pendente, recusado, revogado) lê só o próprio perfil e não grava nada.
- **Restrições:** um admin não pode alterar o próprio `status`, para o painel nunca ficar sem dono. O primeiro admin é promovido por um comando com `service_role` (`pnpm admin:promover <email>`), porque sem ele ninguém aceita o primeiro pedido.
- **Os comandos locais** (`materia:*`, `admin:promover`, importação) apontam por padrão para o **Supabase local**, configurado no `.env.local`. Para mirar a produção, é preciso um `.env.prod.local` separado **e** a flag `--prod`, que mostra o projeto de destino e pede confirmação. Assim, um `pnpm dev` ou um teste nunca escreve na produção. *(Decisão do orquestrador.)*
- **`service_role`** só existe em comandos locais (`scripts/`) e em rotas de servidor que precisem dela. Nunca vai para componente cliente nem para variável `NEXT_PUBLIC_*`.
- **Testes de RLS:** cada regra tem um teste no Supabase local, com usuários `anon`, pendente, aprovado e recusado.

### 7.3 Camada de dados no app
- `getRepository()` passa a aceitar `CONTENT_SOURCE=supabase`. O padrão continua `files` em dev e nos testes, e `supabase` vale só em produção e preview.
- **`SupabaseArticleRepository`** implementa o mesmo `ArticleRepository`: `list`, `getBySlug`, `search`, `listEditorias` e `listTags`. Ele lê com a chave `anon` (publicável), então o RLS já esconde os rascunhos. `MOSTRAR_EXEMPLOS` continua valendo, como filtro na consulta.
- **A busca mantém o contrato da v1** (termos sem acento, todos precisam aparecer, como substring): `busca_normalizada ilike` para cada termo. Não usa full-text, para "sao paulo", "SÃO PAULO" e "São Paulo" seguirem iguais e para a mesma suíte de testes valer.
- **O markdown continua renderizado no servidor** pelo pipeline sanitizado da v1 (ADR 0004).
- **Suíte de contrato:** os mesmos testes de `ArticleRepository` rodam contra `FileArticleRepository` (sempre) e contra `SupabaseArticleRepository` (`pnpm test:db`, com Docker). As duas implementações precisam dar o mesmo resultado para o mesmo conteúdo.
- **Escrita** (painel e comandos) fica num módulo separado só de servidor, `src/lib/admin/`, com `import "server-only"`. O `ArticleRepository` público continua somente leitura.
- **Regra do repositório da v1:** páginas e componentes públicos obtêm dados só por `getRepository()`. O `/admin` usa `src/lib/admin/`. Nada importa o cliente Supabase fora de `src/lib/content/` e `src/lib/admin/`.

### 7.4 Cache e atualização (U5)
- As leituras do repositório ficam em funções com `"use cache"` e `cacheTag`:
  - `materias` em toda listagem, capa, busca e sitemap;
  - `materia:<slug>` em cada matéria;
  - `tags`.
- O `cacheLife` usa um perfil longo, porque a invalidação é explícita.
- **Quem invalida:**
  - as server actions do painel chamam `updateTag`/`revalidateTag` depois de gravar;
  - a rota `POST /api/revalidar`, protegida por segredo (`REVALIDATE_SECRET`), recebe um **Database Webhook** do Supabase em `insert`, `update` e `delete` de `articles` e `tags`. Assim, uma edição feita em qualquer lugar (painel, comando ou o painel do próprio Supabase) atualiza o site.
- **Proxy de 404 (ADR 0006):** com o banco, ele não pode consultar a rede a cada requisição. A história A decide como, num **adendo ao ADR 0006**, testando no `next build` com a doc do Next 16. Opções:
  1. o proxy chama a mesma função com `"use cache"`, se a doc permitir em proxy;
  2. o proxy guarda em memória um índice de slugs e listagens com TTL curto, mais invalidação pela mesma rota;
  3. outra saída documentada.

  O requisito não muda: 404 real para slug, editoria, tag e `?pagina=` inválidos, nunca 500.

### 7.5 Squad-fut → banco (U6)
- O diagramador continua gravando `content/entrada/<slug>.md` no formato da v1. A segunda entrega não muda.
- O comando `pnpm materia:enviar <slug>` (em `scripts/`, com `service_role` no `.env.local`) faz o seguinte:
  - valida o arquivo com o **mesmo** schema zod da v1;
  - grava a matéria como `rascunho` + a revisão 1 (`origem_da_revisao = squad`, corpo literal);
  - move o arquivo para `content/entrada/enviadas/`;
  - acrescenta ao banco as tags que faltarem, com rótulo humanizado.

  Se o slug já existir, o comando recusa com uma mensagem clara. Reenviar é uma decisão do painel.
- **Antes do painel (E):** `pnpm materia:publicar <slug>` muda o status para `publicado`. O webhook invalida o cache. Depois da história E, publicar passa a ser pelo painel, e o comando continua só como atalho.
- O versionador deixa de abrir PR de conteúdo. O agente e o `CLAUDE.md` são atualizados na história C: o versionador passa a rodar os comandos e relatar o resultado. O `content/materias/` vira só fixture de dev e testes.

### 7.6 Login e solicitações (U2, U3)
- `@supabase/ssr` com cookies. Um único provedor: Google. O botão "Entrar com Google" fica em `/admin/entrar`, com o callback em `/admin/auth/callback`.
- **Fluxo:**
  1. O primeiro login cria o perfil como `pendente`. A pessoa vê "Seu pedido de acesso foi enviado".
  2. Um admin abre `/admin/acessos` e aceita ou recusa.
  3. Quem for `aprovado` entra no painel. Quem for `recusado` vê "Acesso não autorizado" e não gera um pedido novo a cada login.
  4. Um admin pode reabrir o pedido de quem foi recusado e revogar outro admin, nunca a si mesmo.
- **Proteção em duas camadas:**
  - as rotas `/admin/**` conferem a sessão e o status no servidor, no layout do admin ou no proxy;
  - o RLS é a garantia final.

  Um admin pendente que chame a API direto não grava nada.
- **O site público não ganha botão de login.** O `/admin` leva `noindex` e fica fora do sitemap.
- **Configuração externa** (feita pelo usuário, com passo a passo na história D): o OAuth client no Google Cloud e o provedor Google no Supabase, com as URLs de redirecionamento de local, preview e produção.

### 7.7 Painel e editor (U7)
- **E, painel:**
  - lista de matérias com filtro por status, editoria e "do squad";
  - edição dos campos editoriais;
  - publicar e despublicar;
  - histórico de revisões, com ver e comparar versões e restaurar uma versão (a restauração vira uma revisão nova).

  Salvar cria uma revisão nova (`revisao_em_edicao`) e **não** muda o site. "Publicar alterações" copia essa revisão para os campos de `articles`, atualiza `revisao_publicada` e invalida o cache (U9). O painel avisa quando há alterações não publicadas. O corpo da matéria do squad pode ser editado; a revisão 1 fica intacta.
- **F, editor:**
  - cria matérias no painel em markdown, com prévia renderizada pelo **mesmo** pipeline sanitizado do site;
  - a lib de editor é escolhida na história F (o designer entra), sem dependência pesada se não for preciso;
  - uma matéria criada no editor tem `fonte = 'painel'` e `origem` nula;
  - o `autor` vem preenchido com o nome do admin no Google e pode ser editado. No JSON-LD, ele vira `Person` quando a fonte é o painel e continua `Organization` ("Squad Fut") nas matérias do squad. *(Decisão do orquestrador.)*
- **A regra "texto do squad é imutável" muda** para: *a revisão 1 de uma matéria do squad é o texto literal e nunca muda; edições posteriores são revisões novas, registradas com autor.* O `CLAUDE.md` do projeto é atualizado na história E.

### 7.8 Vercel (história B)
- **Projeto ligado ao repo público** `oabnerwilliam/blog-fut`. Cada PR gera um preview, e a `main` vai para produção.
- **Variáveis de ambiente:**
  - `SITE_URL` (só a origem);
  - `CONTENT_SOURCE=supabase`;
  - `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publicáveis);
  - `SUPABASE_SERVICE_ROLE_KEY`, só se alguma rota de servidor precisar;
  - `REVALIDATE_SECRET`;
  - `MOSTRAR_EXEMPLOS`.
- **Ambientes:** um projeto Supabase de **produção**. Os previews usam o mesmo projeto em leitura, ou um segundo, a decidir na história B pelo custo. Dev local usa `files` ou o Supabase local.
- **Deploy:** feito pela integração Git da Vercel. O squad-blog não roda `vercel deploy` de escrita sem pedido.
- **Contas (U10):** o usuário cria o projeto Supabase (plano gratuito), o projeto Vercel e o OAuth client do Google, seguindo o passo a passo das histórias B e D. O squad-blog nunca recebe as senhas dessas contas.
- **CI (U10):** fica em `.github/workflows/`.
  - Em cada PR, roda os portões. O `test:db` roda num Supabase local dentro do próprio runner.
  - No merge na `main`, aplica as migrações com o Supabase CLI, usando `SUPABASE_ACCESS_TOKEN` e `SUPABASE_DB_PASSWORD` guardados nos secrets do GitHub.
  - Se a migração falhar, o job quebra e avisa. O deploy da Vercel não depende desse job.
  - Migração destrutiva exige revisão manual, e o plano precisa dizer isso.
- **Database Webhook:** vai por migração (`pg_net` + trigger) ou pelo dashboard, a decidir na história B. A URL de destino vem de uma configuração por ambiente e nunca fica fixa no SQL commitado.
- **Keep-alive (U11):** um cron (Vercel Cron ou GitHub Actions) faz uma leitura leve por dia.
  - Com o banco pausado ou fora do ar, as páginas em cache continuam no ar.
  - Uma leitura sem cache que falhar responde com um erro tratado, nunca com uma tela em branco.
  - O build não pode depender do banco acordado: o `generateStaticParams` tolera a falha e usa o valor de reserva.

## 8. Restrições
- Next.js 16.4 com Cache Components. Consultar `node_modules/next/dist/docs/` antes de cada API de cache, proxy, rota ou server action.
- Os portões da v1 continuam e ganham `pnpm test:db` (Supabase local) nas histórias que mexem no banco (A, C, D, E, F). O `pnpm test` continua rodando sem Docker.
- Repositório público, sem segredos. Fluxo do squad-blog: orquestrador → dev → revisor → merge com squash. O designer entra quando houver tela nova (D, E, F). Git só pelo orquestrador, e o git-guard é respeitado.
- Interface em pt-BR, a11y AA também no `/admin`, 320px.

## 9. O que fica para quem constrói
- Os nomes exatos de arquivos, funções e colunas que não estão fixados aqui.
- Qual dos dois caminhos do U12 a doc permite. O resultado vai para um adendo ao ADR 0006.
- O layout do painel, com o designer (O2).
- Os novos ADRs: um para "Supabase como fonte + cache com etiqueta" (A) e outro para "autorização com perfis + RLS" (D).
