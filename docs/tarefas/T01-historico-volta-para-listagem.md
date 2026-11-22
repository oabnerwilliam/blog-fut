# T01: Histórico da matéria volta para a listagem

**Status:** registrada
**Branch sugerida:** feat/T01-historico-volta-para-listagem
**Registrada em:** 2026-11-22, a pedido do usuário.

## Problema

A tela `/admin/materias/[id]/historico` só tem navegação de volta para a edição da matéria (`src/app/admin/(painel)/materias/[id]/historico/page.tsx`, link para `/admin/materias/<id>`). Para voltar à lista, a pessoa precisa passar pela edição ou usar o botão Voltar do navegador.

## Critérios de aceite

1. O histórico ganha um link para `/admin/materias` ("Matérias"), além do link que já existe para a edição. A posição segue o padrão de navegação das outras telas do painel (mockups em `docs/design/17-painel/`). Se não houver padrão, o designer decide.
2. Os dois links têm nome acessível claro, e a ordem de foco é natural (a lista antes da edição, ou como no padrão escolhido).
3. Um e2e de banco (`tests/e2e-db/`) abre o histórico, clica no link da lista e chega a `/admin/materias`.
4. Layout sem rolagem horizontal a partir de 320px, nos temas claro e escuro. O axe continua limpo.
5. Os cinco portões e o `pnpm test:db` passam.
