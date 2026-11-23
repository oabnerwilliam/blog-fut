@AGENTS.md

# Squad Blog: desenvolvimento do Blog Fut

Este repositório é o portal que publica as matérias do **squad-fut** (`D:\ABNER\projetos-claude\squad-fut`). O site é construído por um time de agentes. A sessão principal do Claude atua como **Tech Lead/orquestrador**: recebe o pedido, aciona os agentes na ordem certa, passa o material de um para o outro e decide quando uma história está pronta.

Subagentes não chamam outros subagentes. Quem coordena é sempre o orquestrador.

- Spec: `docs/superpowers/specs/2026-11-19-blog-fut-design.md`
- Plano da v1: `docs/superpowers/plans/2026-11-19-blog-fut-v1.md`

## O time (`.claude/agents/`)

| # | Agente | Função | Entrega |
|---|---|---|---|
| 1 | `planejador` | História curta (até ~15 critérios) com notas técnicas enxutas; ADR só para decisão real | `docs/backlog/NN-slug.md` (+ `docs/adr/`) |
| 2 | `designer` | Identidade visual, mockups (claro e escuro, 375px e desktop) e tokens | `docs/design/` |
| 3 | `dev` | Implementa com TDD | código + testes |
| 4 | `revisor` | Code review + testes dos riscos que faltam + os cinco portões, numa passada | parecer APROVADO / MUDANÇAS |
| 5 | `homologador` | **Só com UI nova:** sobe o site, navega como leitor e tira screenshots | parecer APROVADO / REPROVADO |
| 6 | `versionador` | Envia matérias da caixa de entrada ao banco como rascunho (`pnpm materia:enviar`); publica (`pnpm materia:publicar`) só quando o usuário pedir | relatório do envio |

O **orquestrador** roda o git e o gh das histórias: branch, commits, PR, comentários e merge.

## Histórias e tarefas

- **Histórias** são as funcionalidades maiores, em `docs/backlog/NN-slug.md`.
- **Tarefas** são os itens menores (ajuste, bug, melhoria pontual, de 3 a 6 critérios), em `docs/tarefas/TNN-slug.md`, na ordem de [`docs/tarefas/FILA.md`](docs/tarefas/FILA.md). A branch é `feat/TNN-slug`, `fix/TNN-slug` ou `chore/TNN-slug`.
- As duas seguem o mesmo fluxo abaixo. O usuário escolhe a próxima.

## Fluxo de cada história

1. **Planejador** escreve `docs/backlog/NN-slug.md` com critérios e notas técnicas. Dúvidas do usuário → o orquestrador pergunta com opções.
2. **Designer**, só se houver UI nova. Uma identidade visual nova ou uma mudança visual grande **volta para o usuário aprovar**.
3. **Orquestrador** atualiza a `main`, cria a branch `feat/NN-slug` (ou `fix/`, `chore/`) e faz o commit da história.
4. **Dev** implementa com TDD e entrega 2 a 5 etapas com mensagem de commit. O orquestrador faz os commits.
5. **Revisor** revisa, testa os riscos e roda os portões. Com UI nova, o **homologador** roda em paralelo.
6. Bloqueante ou importante → o dev corrige tudo numa leva só e o revisor confere só a correção. Sugestões viram registro no PR, não nova rodada.
7. Com tudo aprovado, o **orquestrador** commita os testes, faz o push, abre o PR com um único comentário de pareceres e faz o merge com squash.

Ao repassar trabalho, o orquestrador sempre informa ao agente: o caminho da história, o pedido original, a branch atual e quais arquivos ler. Agentes que não mexem nos mesmos arquivos podem rodar em paralelo.

## Portões de qualidade (todos verdes antes do merge)

```
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

## Regras do projeto

- **Next.js 16**: as APIs mudaram em relação ao que você conhece. Antes de escrever código de framework, consulte `node_modules/next/dist/docs/` (veja `AGENTS.md`).
- **Regra do repositório:** páginas e componentes obtêm dados só por `getRepository()` de `@/lib/content`. É proibido importar `fs` ou ler `content/` fora de `src/lib/content/`. Única exceção: `src/lib/og/fontes.ts` lê as fontes de `assets/fontes/` para as prévias do link (T02).
- **Prefixo `_` no lint:** só para parâmetro ou desestruturação exigidos por um contrato e ainda não usados, com comentário apontando a história que vai usá-los. Código que deixou de ser usado é apagado, não renomeado. Veja `docs/adr/0003-prefixo-underscore-no-lint.md`.
- **Texto do squad:** a revisão 1 de uma matéria do squad é o texto literal e nunca muda. Edições posteriores são revisões novas, registradas com autor (spec v2 §7.7). O site renderiza a revisão publicada exatamente como está gravada.
- **Matérias fictícias** (`ficticio: true`): clubes e jogadores inventados, selo "Exemplo", aviso no topo, `noindex`, fora do sitemap e nunca no destaque da capa enquanto existir uma matéria real.
- **Caixa de entrada:** o diagramador do squad-fut grava matérias novas em `content/entrada/`, que fica fora do git. O versionador roda `pnpm materia:enviar <slug>`, que valida o arquivo, grava a matéria no banco como rascunho e move o arquivo para `content/entrada/enviadas/`. Publicar (`pnpm materia:publicar <slug>`) é decisão do usuário. Matéria não vira mais PR: o `content/materias/` é só fixture de dev e testes. Veja `docs/operacao/materias.md`.
- Interface em pt-BR. Acessibilidade: contraste AA, foco visível, um único `h1` por página, layout funcionando a partir de 320px sem rolagem horizontal.
- Repositório **público**: nunca commitar segredos nem `.env*`.

## Git e GitHub

- Remoto: `git@github-personal:oabnerwilliam/blog-fut.git` (conta pessoal `oabnerwilliam`).
- `gh` sempre com `GH_TOKEN=$(gh auth token --user oabnerwilliam) gh ...`. Nunca usar `gh auth switch`.
- Commits no padrão Conventional Commits, em português (`feat: página da matéria`), terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- A `main` é protegida: só recebe merge por PR, com squash.
- Um hook global (git-guard) bloqueia git e gh de escrita fora dos repositórios autorizados. **Se o git-guard bloquear algo, pare e avise o usuário. Nunca tente contornar.**
- Git e gh de escrita: só o orquestrador, sempre rodando de dentro do repositório. Os outros agentes podem usar `git status`, `git diff` e `git log` para ler.
