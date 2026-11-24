# Fila de tarefas

Tarefas são os itens menores: um ajuste, um bug ou uma melhoria pontual, com de 3 a 6 critérios. As funcionalidades maiores são **histórias** e ficam em [`docs/backlog/`](../backlog/).

- **Arquivo:** um por tarefa, `docs/tarefas/TNN-slug.md`.
- **Branch:** `feat/TNN-slug`, `fix/TNN-slug` ou `chore/TNN-slug`, conforme a natureza.
- **Fluxo:** o mesmo das histórias (`CLAUDE.md`, "Fluxo de cada história"): dev com TDD, revisor, portões e CI, PR com squash.
- **Status:** `registrada` → `em andamento` → `feita (#PR)`.

A ordem abaixo é a de entrada. O usuário decide a prioridade antes de cada uma começar.

| # | Tarefa | Tipo | Status |
|---|---|---|---|
| T01 | [Histórico da matéria volta para a listagem](T01-historico-volta-para-listagem.md) | feat | registrada |
| T02 | [Prévia do link no WhatsApp (imagem Open Graph)](T02-previa-do-link.md) | feat | feita (#27) |
| T03 | [README do repositório](T03-readme.md) | docs | feita (#26) |
| T04 | [Acesso de admin conferido num lugar só](T04-acesso-admin-central.md) | refactor | registrada |
| T05 | [Entrada automática das matérias do squad](T05-entrada-automatica-do-squad.md) | feat | registrada |

## Histórias registradas (em `docs/backlog/`)

| # | História | Tipo | Status | Depende de |
|---|---|---|---|---|
| 19 | [Polimento da v2](../backlog/19-polimento-v2.md) | ajustes | registrada | — |
| 21 | [Navegação e requisições do painel](../backlog/21-navegacao-e-requisicoes.md) | desempenho | registrada | T04, de preferência antes |
| 22 | [Avaliar a camada de dados e o Prisma](../backlog/22-avaliar-orm-prisma.md) | análise | registrada | — |
| 23 | [Avaliar React/Vite + Nest em monorepo](../backlog/23-avaliar-react-vite-nest.md) | análise | registrada | 22, ou junto com ela |
| 24 | [Pautas no painel](../backlog/24-pautas-no-painel.md) | feat | registrada | T05 |

Observação: se a 23 recomendar migrar, parte da 21 (Suspense e `loading.tsx` no Next) perde valor. Vale decidir a ordem entre a 21 e as análises 22 e 23 antes de começar.
