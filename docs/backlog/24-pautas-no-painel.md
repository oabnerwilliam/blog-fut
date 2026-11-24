# História 24: Pautas no painel (o usuário dirige o squad)

**Status:** registrada
**Registrada em:** 2026-11-24, a pedido do usuário.
**Depende de:** [T05](../tarefas/T05-entrada-automatica-do-squad.md). Do lado do squad-fut, a tarefa S04 depende desta história.

## Pedido

"Eu quero ser tipo um diretor e, pelo blog-fut, entregar uma direção de matérias para o squad. Se eu não entregar, ele pega o que for mais quente no momento."

A rotina diária do squad (7h) consulta o blog antes de começar:

- **Com pauta pendente:** produz sobre ela.
- **Sem pauta:** escolhe o assunto mais quente, conforme `squad-fut/referencias/prioridades.md` (T05/S02).

## Critérios de aceite (rascunho, a detalhar quando a história começar)

1. Tabela `pautas`, criada por migração:
   - `id`, `tema` (texto curto, só o tema; decisão do usuário), `status` (`pendente`, `em_producao`, `feita`, `cancelada`), `ordem`, `article_id` (a matéria que saiu dela, opcional) e as datas de criação e atualização;
   - RLS: só o admin lê e escreve.
2. A tela `/admin/pautas` no painel lista as pautas por status e permite criar (um campo, o tema), reordenar as pendentes e cancelar. Cada pauta feita tem um link para a matéria que saiu dela.
3. **`GET /api/pautas/proxima`** (token da T05) devolve a primeira pendente e a marca como `em_producao` na mesma operação (função SQL), para que duas execuções não peguem a mesma. Sem pendente, responde 204.
4. **`POST /api/entrada`** aceita um `pauta_id` opcional. Com a matéria gravada, a pauta vira `feita` e guarda o `article_id`.
5. Uma pauta `em_producao` há mais de 24h volta para `pendente` (execução que falhou), ou o painel mostra a pauta para o usuário decidir. A escolha fica para o início da história.
6. A UI nova passa pelo designer: mockups claro e escuro, 375px e desktop, no padrão de `docs/design/17-painel/`. Acessibilidade AA, foco visível e layout a partir de 320px.
7. Os cinco portões e o `pnpm test:db` passam, com e2e de banco do fluxo criar → próxima → feita.
