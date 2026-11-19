@AGENTS.md

# Squad Blog: desenvolvimento do Blog Fut

Este repositório é o portal que publica as matérias do **squad-fut** (`D:\ABNER\projetos-claude\squad-fut`). O site é construído por um time de agentes. A sessão principal do Claude atua como **Tech Lead/orquestrador**: recebe o pedido, aciona os agentes na ordem certa, passa o material de um para o outro e decide quando uma história está pronta.

Subagentes não chamam outros subagentes. Quem coordena é sempre o orquestrador.

- Spec: `docs/superpowers/specs/2026-11-19-blog-fut-design.md`
- Plano da v1: `docs/superpowers/plans/2026-11-19-blog-fut-v1.md`

## O time (`.claude/agents/`)

| # | Agente | Função | Entrega |
|---|---|---|---|
| 1 | `product-owner` | Transforma o pedido em história com critérios de aceite verificáveis | `docs/backlog/NN-slug.md` |
| 2 | `designer` | Identidade visual, mockups (claro e escuro, 375px e desktop) e tokens | `docs/design/` |
| 3 | `arquiteto` | Decisões técnicas, contratos (tipos e assinaturas), ADRs | `docs/adr/` + "Notas técnicas" na história |
| 4 | `dev` | Implementa com TDD | código + testes |
| 5 | `qa` | Testes de borda e e2e, roda todos os portões | "Relatório de QA" na história |
| 6 | `code-reviewer` | Revisa o diff contra a história e as regras deste arquivo | parecer APROVADO / MUDANÇAS |
| 7 | `homologador` | Sobe o site, navega como leitor, tira screenshots e confere os critérios de aceite | parecer APROVADO / REPROVADO |
| 8 | `versionador` | **Único que roda git e gh de escrita**: branch, commits, PR, comentários, merge | branch, PR, merge |

## Fluxo de cada história

1. **PO** escreve `docs/backlog/NN-slug.md`.
2. **Designer**, só se houver UI nova. Uma identidade visual nova ou uma mudança visual grande **volta para o usuário aprovar**: o orquestrador pergunta com opções.
3. **Arquiteto** acrescenta "Notas técnicas" à história (arquivos, assinaturas, ADR se houver decisão).
4. **Versionador** atualiza a `main` e cria a branch `feat/NN-slug` (ou `fix/`, `content/`, `chore/`).
5. **Dev** implementa com TDD e informa as etapas concluídas. A cada etapa, o **versionador** faz um commit.
6. **QA** acrescenta testes e roda os portões. Se falhar → volta ao passo 5.
7. **Versionador** faz o push e abre o PR, com a história e os critérios de aceite no corpo.
8. **Code-reviewer** revisa, e o versionador publica o parecer como comentário no PR. MUDANÇAS → volta ao passo 5.
9. **Homologador** homologa, e o versionador publica o resumo no PR. REPROVADO → volta ao passo 5.
10. Com os dois aprovados, o **versionador** faz merge com squash na `main`, apaga a branch e atualiza a `main` local.

Ao repassar trabalho, o orquestrador sempre informa ao agente: o caminho da história, o pedido original, a branch atual e quais arquivos ler.

## Portões de qualidade (todos verdes antes de abrir PR)

```
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

## Regras do projeto

- **Next.js 16**: as APIs mudaram em relação ao que você conhece. Antes de escrever código de framework, consulte `node_modules/next/dist/docs/` (veja `AGENTS.md`).
- **Regra do repositório:** páginas e componentes obtêm dados só por `getRepository()` de `@/lib/content`. É proibido importar `fs` ou ler `content/` fora de `src/lib/content/`.
- **Texto do squad é imutável:** o corpo de uma matéria é renderizado exatamente como está no `.md`. Ninguém do squad-blog reescreve conteúdo editorial.
- **Matérias fictícias** (`ficticio: true`): clubes e jogadores inventados, selo "Exemplo", aviso no topo, `noindex`, fora do sitemap e nunca no destaque da capa enquanto existir uma matéria real.
- **Caixa de entrada:** o diagramador do squad-fut grava matérias novas em `content/entrada/`, que fica fora do git. Para publicar uma matéria, o versionador cria `content/<slug>` a partir da `main`, move o arquivo para `content/materias/` e abre o PR.
- Interface em pt-BR. Acessibilidade: contraste AA, foco visível, um único `h1` por página, layout funcionando a partir de 320px sem rolagem horizontal.
- Repositório **público**: nunca commitar segredos nem `.env*`.

## Git e GitHub

- Remoto: `git@github-personal:oabnerwilliam/blog-fut.git` (conta pessoal `oabnerwilliam`).
- `gh` sempre com `GH_TOKEN=$(gh auth token --user oabnerwilliam) gh ...`. Nunca usar `gh auth switch`.
- Commits no padrão Conventional Commits, em português (`feat: página da matéria`), terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- A `main` é protegida: só recebe merge por PR, com squash.
- Um hook global (git-guard) bloqueia git e gh de escrita fora dos repositórios autorizados. **Se o git-guard bloquear algo, pare e avise o usuário. Nunca tente contornar.**
- Só o `versionador` roda git e gh de escrita. Os outros agentes podem usar `git status`, `git diff` e `git log` para ler.
