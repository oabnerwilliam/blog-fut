# Blog Fut: design

Data: 2026-11-19 · Repositório: `D:\ABNER\projetos-claude\blog-fut` → `github.com/oabnerwilliam/blog-fut` (público)

## 1. Intenção

Um portal de matérias de futebol que publica os textos produzidos pelo **squad-fut** (`D:\ABNER\projetos-claude\squad-fut`), a redação de agentes que já existe. O site é construído e mantido por um segundo time de agentes, o **squad-blog**, que segue o mesmo padrão: um agente por função e um orquestrador.

Por enquanto o site roda **local, com dados mockados**. Ele precisa estar pronto para ir ao ar depois **com Supabase** sem reescrever as telas.

Esse é um projeto pessoal, versionado pelo próprio Claude por meio do agente `versionador`. É o único repositório liberado pelo `git-guard` (veja a seção 9).

## 2. Objetivos, não-objetivos e antiobjetivos

**Objetivos (v1)**
- Capa com destaque e lista das matérias.
- Página da matéria com título, linha fina, data, tempo de leitura, intertítulos e SEO completo (meta, Open Graph, JSON-LD). Os dados vêm do `07-titulos.md` do squad.
- Páginas de editoria (formato: análise, crônica, notícia…) e de tag (clube, campeonato, tema).
- Busca nas matérias.
- Modo escuro: segue o sistema por padrão, tem um botão para alternar, a escolha fica guardada e a página não pisca ao carregar.
- Conteúdo misto. Entram as matérias reais do squad e cerca de 8 matérias de exemplo fictícias, todas marcadas com o selo "Exemplo".
- Uma camada de dados que permita trocar arquivos por Supabase só com configuração.

**Não-objetivos (v1)**
- Supabase de verdade, deploy, domínio, analytics.
- Login, comentários, newsletter, painel administrativo.
- Imagens nas matérias: o squad não produz imagens, então o layout precisa funcionar só com tipografia. O `og:image` fica como TODO.

**Antiobjetivos (seria um fracasso mesmo funcionando)**
- O blog alterar o texto do squad: cada palavra, número e aspa precisa chegar igual.
- Uma matéria fictícia parecer real. Exemplos usam **clubes e jogadores inventados** e levam o selo visível "Exemplo", para não espalhar notícia falsa sobre times reais.
- Qualquer agente fazer commit ou push fora do `blog-fut`.
- Telas acessando arquivos diretamente, o que quebraria a troca por Supabase.

## 3. Restrições

- Windows 11, Node 22, npm, Git Bash/PowerShell.
- O repositório é **público**: nada de segredos no código, e o `.env*` fica no `.gitignore`.
- O GitHub usa a conta pessoal `oabnerwilliam`. O remoto é `git@github-personal:oabnerwilliam/blog-fut.git` (SSH com alias). O `gh` roda com `GH_TOKEN=$(gh auth token --user oabnerwilliam)` em cada comando. **Nunca** usar `gh auth switch`, porque a conta ativa global é a do trabalho.
- O squad-fut **não** é versionado por enquanto. Editar os arquivos dele pode, mas nada de git lá.

## 4. Abordagens consideradas

**Base do React**
| Opção | Prós | Contras |
|---|---|---|
| **Next.js (escolhida)** | SSG/SSR deixa o SEO e as prévias em redes no HTML; tem integração madura com Supabase; deploy simples | Mais conceitos (server/client components) |
| Vite + React Router | Simples e rápido | SPA: SEO e prévias fracos sem pré-renderização |
| Astro + React | Ótimo para conteúdo | React vira coadjuvante; partes dinâmicas futuras dão mais trabalho |

**Dados mockados**
| Opção | Prós | Contras |
|---|---|---|
| **Arquivos `.md` com frontmatter + interface de repositório (escolhida)** | O diagramador grava um arquivo por matéria; o diff legível vira PR de conteúdo; trocar para Supabase é só criar outra implementação | Precisa validar o frontmatter |
| Supabase local (Docker) | Fica idêntico à produção | Pesado para o dia a dia; o diagramador teria que gravar no banco |
| Um `mock.json` | Trivial | Arquivo grande e compartilhado, com conflitos e edição frágil por agente |

**Como a matéria chega ao blog**
| Opção | Prós | Contras |
|---|---|---|
| Script de importação | Desacoplado | Um passo manual a mais |
| Leitura direta da pasta do squad | Zero passos | Acopla duas pastas e não sobrevive ao deploy |
| **O diagramador publica (escolhida)** | Fica automático no fim do pipeline do squad | Mexe no squad-fut, que ganha uma entrega a mais |

## 5. Decisões do usuário

- Next.js; v1 com capa, matéria, editorias/tags, busca e modo escuro.
- Conteúdo misto, com as matérias reais e as de exemplo.
- O diagramador do squad-fut grava a matéria no formato do blog.
- Repositório público, com fluxo de branch, PR, review, homologação e merge.
- Visual: o designer propõe com mockups e o usuário aprova antes da implementação.
- Time de oito agentes com um dev só (seção 8).
- Dados: arquivos + `ArticleRepository`.

## 6. Arquitetura

### 6.1 Stack (chamadas minhas, o arquiteto pode ajustar com justificativa)
- Next.js (App Router) + TypeScript (strict). Matérias geradas estaticamente (`generateStaticParams`).
- Estilo: CSS com tokens em variáveis (`:root` / `[data-theme="dark"]`) definidos pelo designer, usando Tailwind CSS ou CSS Modules, à escolha do arquiteto. O importante é que os tokens sejam a fonte única de cor e tipografia.
- Markdown → HTML: `remark`/`rehype`, com sanitização.
- Frontmatter validado por `zod` no carregamento. Uma matéria inválida quebra o build com uma mensagem clara.
- Testes: Vitest (unidade e integração da camada de dados) e Playwright (e2e e screenshots da homologação).
- Lint e formatação: ESLint + Prettier.

### 6.2 Modelo de conteúdo

Um arquivo por matéria: `content/materias/<slug>.md`. O frontmatter usa os mesmos nomes de campo da futura tabela `articles` do Supabase:

```yaml
slug: psg-balanco-temporada-2026-27-mercado-elenco-curto
titulo: "O mercado enxuto do PSG deu certo até aqui. Falta aguentar até maio"
titulo_seo: "Balanço do PSG 2026/27: mercado enxuto, liderança e lesões"
linha_fina: "O clube arrecadou mais de 350 milhões..."
editoria: analise            # analise | cronica | noticia | coluna | perfil | ...
tags: [psg, ligue-1, champions-league, luis-enrique]
meta_description: "..."
palavras_chave: ["balanço da temporada do PSG", "..."]
publicado_em: 2026-11-19
autor: Squad Fut
ficticio: false              # true nas matérias de exemplo → selo "Exemplo"
origem: squad-fut/textos/2026-11-19-psg-balanco-temporada   # vazio nos exemplos
```

O corpo do arquivo é o markdown do `final.md` **sem o título e sem a linha fina** (eles ficam no frontmatter) e sem nenhuma outra alteração. O tempo de leitura é calculado (cerca de 200 palavras por minuto), não gravado.

**Taxonomias** (decisão minha):
- `editoria` é um **conjunto fechado** definido no código: `analise`, `cronica`, `noticia`, `coluna`, `perfil`, `entrevista`, `reportagem`. Cada uma tem rótulo próprio. Um valor fora da lista quebra a validação (zod) com uma mensagem clara. O diagramador converte o formato livre da pauta ("análise (balanço de temporada…)") para um desses slugs.
- `tags` são **livres**, em slug kebab-case. O rótulo vem de `content/tags.json` quando existe (`psg → "PSG"`). Quando não existe, o rótulo é o slug humanizado (`ligue-1 → "Ligue 1"`), com um aviso no build e sem erro. O versionador inclui o rótulo no `tags.json` no mesmo PR de conteúdo quando o humanizado ficar ruim.

**Matérias de exemplo** (decisão minha, para cumprir o antiobjetivo):
- Levam o selo "Exemplo" no card e na página, mais um aviso no topo da matéria ("Conteúdo fictício de demonstração").
- **Nunca** ficam no destaque da capa enquanto houver alguma matéria real. As datas delas ficam antes de 2026-11-01, então as reais aparecem primeiro na ordem cronológica.
- Ficam fora do `sitemap.xml` e levam `noindex`. Entram na busca, nas editorias e nas tags, sempre com o selo.
- A variável `MOSTRAR_EXEMPLOS` (padrão `true`) esconde todas de uma vez quando houver matérias reais suficientes. O filtro fica no repositório.

### 6.3 Camada de dados

```ts
interface ArticleRepository {
  list(opts?: { editoria?: string; tag?: string; page?: number; pageSize?: number }): Promise<Paginated<ArticleSummary>>;
  getBySlug(slug: string): Promise<Article | null>;
  search(query: string): Promise<ArticleSummary[]>;
  listEditorias(): Promise<Taxonomy[]>;
  listTags(): Promise<Taxonomy[]>;
}
```

- `FileArticleRepository` lê `content/`, que é a fonte da v1.
- `getRepository()` escolhe a implementação pela variável `CONTENT_SOURCE` (padrão `files`). O `SupabaseArticleRepository` fica para depois. Junto com a v1 vai um rascunho de `supabase/migrations/0001_articles.sql` com a tabela `articles` (os campos da seção 6.2 + `corpo_md`, `id uuid`, `created_at`) e um índice full-text em português, **como documentação, sem executar**.
- **Regra:** páginas e componentes só importam do repositório, nunca de `fs` nem de `content/`. O code-reviewer barra qualquer violação.
- Busca: a rota `/busca?q=` chama `repository.search()`. Nos arquivos, a busca é por texto normalizado (sem acentos, sem diferenciar maiúsculas) em título, linha fina, tags e corpo. No Supabase, será full-text.

### 6.4 Rotas
- `/`: capa com a matéria mais recente em destaque, as demais em grade e uma faixa por editoria.
- `/materias/[slug]`: matéria.
- `/editorias/[editoria]` e `/tags/[tag]`: listas paginadas.
- `/busca`: busca.
- `not-found` próprio; `sitemap.xml` e `robots.txt` gerados.

### 6.5 SEO
Os metadados de cada matéria saem do frontmatter, pela API `metadata` do Next: `title` = `titulo_seo` ou `titulo`, mais description, keywords, Open Graph `article`, Twitter card e JSON-LD (`NewsArticle`, ou `Article` em crônica e coluna, com autor `Organization`). Nas matérias fictícias, `robots: noindex`.

## 7. Integração com o squad-fut

O agente `squad-fut/.claude/agents/diagramador.md` ganha uma **segunda entrega**. Além do `final.html`, ele grava a matéria na **caixa de entrada** do blog, `D:\ABNER\projetos-claude\blog-fut\content\entrada\<slug>.md`, no formato da seção 6.2. A pasta `content/entrada/` está no `.gitignore`, então o arquivo nunca entra por acidente no commit de uma branch de feature em andamento. A publicação funciona assim: quando o usuário pede, o versionador cria a branch `content/<slug>` a partir da `main`, move o arquivo para `content/materias/`, faz o commit e abre o PR. O code-reviewer confere o frontmatter e o homologador vê a página. Depois vem o merge. Campos da matéria:
- `slug`, `titulo_seo`, `meta_description` e `palavras_chave` saem do `07-titulos.md`; `editoria` sai do formato do `01-pauta.md`; `publicado_em` é a data da pasta; `tags` são derivadas dos clubes, campeonatos e pessoas centrais do texto (de 3 a 6).
- A regra de ouro continua valendo: o corpo é cópia literal do `final.md`.
- A conferência final do diagramador passa a incluir esse arquivo.
- O diagramador **não** roda git e só grava na `content/entrada/`.
- O `CLAUDE.md` do squad-fut é atualizado para mencionar a nova entrega.
- A matéria do PSG que já existe é convertida uma vez, pelo próprio diagramador, como prova do fluxo.

## 8. O squad-blog

Fica em `blog-fut/.claude/agents/`, com um `blog-fut/CLAUDE.md` que descreve o fluxo, como o do squad-fut. A sessão principal é o **Tech Lead/orquestrador**: recebe o pedido, aciona os agentes em ordem e repassa o material. Subagentes não chamam subagentes.

| # | Agente | Função | Entrega |
|---|---|---|---|
| 1 | `product-owner` | Transforma o pedido em histórias com critérios de aceite verificáveis | `docs/backlog/NN-<slug>.md` |
| 2 | `designer` | Identidade visual (nome, paleta, tipografia), mockups HTML para aprovação e tokens | `docs/design/` + tokens |
| 3 | `arquiteto` | Decisões técnicas, estrutura de pastas, contratos (tipos/interfaces) e ADRs | `docs/adr/`, notas na história |
| 4 | `dev` | Implementa a história com TDD na branch criada pelo versionador | código + testes |
| 5 | `qa` | Completa os testes (casos de borda, e2e) e roda a suíte inteira | relatório na história |
| 6 | `code-reviewer` | Revisa o diff contra a história e as regras do projeto: correção, regra do repositório, a11y, SEO, segurança | parecer (aprova ou pede mudanças) |
| 7 | `homologador` | Sobe o site, navega como leitor, confere cada critério de aceite e tira screenshots (claro/escuro, 375px e desktop) | parecer de homologação |
| 8 | `versionador` | **Único agente que roda git e gh.** Cuida de branch, commits, PR e merge | branch, PR e merge |

**Fluxo de cada história**
1. O PO escreve a história.
2. O designer entra só se houver UI nova; a v1 começa pela identidade visual, **aprovada pelo usuário**.
3. O arquiteto define o contrato e a abordagem.
4. O versionador cria a branch `feat/NN-slug` a partir da `main` atualizada.
5. O dev implementa com testes, e o versionador faz commits pequenos ao fim de cada etapa.
6. O QA testa. Se falhar, a história volta ao dev.
7. O versionador faz push e abre o PR, com a história e os critérios no corpo.
8. O code-reviewer revisa. O parecer vira um comentário no PR, e mudanças pedidas voltam ao dev.
9. O homologador homologa. O resumo vira um comentário no PR, e uma reprovação volta ao dev.
10. Com review e homologação aprovados, o versionador faz merge com squash na `main` e apaga a branch.

**Portões de qualidade (obrigatórios antes do PR):** `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e`, `npm run build`, todos verdes.

**Convenções git**
- Commits no padrão Conventional Commits, em português (`feat: página da matéria`), com o trailer `Co-Authored-By` do Claude.
- Branches `feat/`, `fix/`, `content/`, `chore/`.
- A `main` só recebe merge de PR. O setup inicial é a exceção: o commit do esqueleto e deste documento vai direto na `main`.

## 9. Proteção do versionamento

Um hook global PreToolUse (`~/.claude/hooks/git-guard.js`) nega comandos `git` de escrita (commit, push, merge, rebase, pull, tag, reset etc.) e comandos `gh` de escrita (`pr create/merge/comment…`, `repo create`, `release`, `gh api` com POST e afins) em qualquer repositório fora de `~/.claude/hooks/git-guard-allowlist.json`. Hoje a lista tem só o `blog-fut`. Os agentes também passam pelo hook. O CLAUDE.md do blog repete a regra: se o git-guard bloquear, o agente para e avisa.

**"Só o versionador mexe no git" dentro do blog-fut** (decisão minha). O hook só distingue repositórios, não agentes, então a regra tem três camadas:
1. Instrução explícita no prompt de cada agente: dev, QA e homologador usam o Bash só para npm/npx e leitura com git (`status`, `diff`, `log`). O orquestrador nunca pede git a outro agente.
2. **Proteção da branch `main` no GitHub**, configurada pelo versionador no setup: merge só por PR e sem force-push. Assim, um commit indevido não chega à `main`.
3. O code-reviewer confere no PR se todos os commits vieram do fluxo, ou seja, se seguem a convenção e têm uma mensagem por etapa.

## 10. Quem constrói o quê

O usuário pediu para "colocar o time para trabalhar e criar o projeto". Por isso, a implementação das histórias 1 a 8 é feita **pelo squad-blog no fluxo da seção 8**, uma história por vez, orquestrada pela sessão principal. O plano de implementação detalha:
- o **setup** (história 0): arquivos dos agentes, CLAUDE.md, esqueleto Next.js, portões de qualidade, GitHub, proteção da `main`. Esses passos são feitos diretamente pelo orquestrador, porque o time ainda não existe;
- para cada história seguinte, a **missão de cada agente** (o que recebe, o que entrega e os critérios de aceite), sem prescrever o código, que fica com o arquiteto e o dev.

## 11. Backlog da v1 (ordem)

0. **Setup:** squad-blog (agentes + CLAUDE.md), esqueleto Next.js, portões de qualidade, `.gitignore`, README, repositório no GitHub e primeiro push.
1. **Identidade visual:** proposta do designer e aprovação do usuário.
2. **Camada de conteúdo:** schema zod, `FileArticleRepository`, `getRepository`, matérias de exemplo e rascunho da migração SQL.
3. **Página da matéria** (com SEO).
4. **Capa.**
5. **Editorias e tags.**
6. **Busca.**
7. **Modo escuro.** Os tokens já nascem com o tema escuro na história 1; aqui entram o botão e a persistência.
8. **Integração com o squad-fut:** diagramador atualizado e matéria do PSG publicada pelo fluxo (PR `content:`).

## 12. Fica a critério do time
- Escolha entre Tailwind e CSS Modules, bibliotecas pequenas (ícones, datas) e estrutura de pastas, registrada em ADR.
- Nome e identidade do portal: propostos pelo designer e aprovados pelo usuário.
- Conteúdo das matérias de exemplo, dentro das regras: clubes e jogadores fictícios, formato e tamanho realistas, editorias e tags variadas.
- Tamanho da paginação e layout exato da capa, conforme o design aprovado.
