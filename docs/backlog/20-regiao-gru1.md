# 20: Funções da Vercel em São Paulo (`gru1`)

**Status:** pronta para desenvolvimento
**Branch:** chore/20-regiao-gru1
**Tipo:** configuração de infraestrutura, sem código e sem UI.
**Escrita por:** orquestrador, em 2026-11-22, a pedido do usuário, depois da análise da lentidão do painel.

## Contexto

O usuário notou o painel lento e suspeitou das conferências de acesso (`exigirAdmin()`) feitas em cada server action. A análise mostrou duas coisas:

- **A conferência não pode sair.** Cada action é um endpoint público por POST, e bloquear a tela não protege a action (doc do Next 16, `server-actions.md`, "Authenticate and authorize"). O teste `tests/e2e-db/admin-sem-permissao.spec.ts` prova que um pendente chega à action repetindo o POST.
- **O custo vem principalmente da distância.** Medido em 2026-11-22: `GET /api/manter-ativo` responde com `X-Vercel-Id: gru1::iad1::…`. A borda está em São Paulo, mas a função roda em Washington (`iad1`, padrão da Vercel, porque o projeto nunca fixou região). O Supabase foi criado em São Paulo (`sa-east-1`, guia `docs/operacao/contas-v2.md`). Cada chamada ao banco ou ao Auth vai aos EUA e volta, e uma action do painel faz de 4 a 5 chamadas em sequência (`getUser`, `perfis`, `eh_admin` e a RPC da action).

A decisão do usuário foi corrigir a região primeiro, medir o painel em produção e só depois decidir as otimizações do `exigirAdmin` (tirar o `eh_admin` repetido, usar `getClaims()` e deixar a prévia conferir só o token).

## Critérios de aceite

1. O `vercel.json` ganha `"regions": ["gru1"]`. O plano Hobby permite escolher uma região, e a doc da Vercel é `functions/configuring-functions/region`.
2. Depois do deploy de produção, uma rota que sempre executa função (`/api/manter-ativo` sem segredo, que responde 401) mostra `X-Vercel-Id` com `gru1` como região da função, e não mais `iad1`.
3. O cron `/api/manter-ativo` continua no `vercel.json`, sem mudança.
4. Os cinco portões passam, e o CI (`portoes.yml`) fica verde.

## Fora do escopo (próximo passo, depende da medição)

- Tirar o `rpc("eh_admin")` repetido de `src/lib/admin/sessao.ts` e de `src/lib/admin/decisoes.ts`. O banco continua conferindo em cada RPC e no RLS.
- Trocar o `getUser()` por `getClaims()` em `src/lib/auth/servidor.ts`. Antes, conferir se o projeto do Supabase usa chaves JWT assimétricas.
- Na prévia do editor, conferir só o token, sem ler o perfil (decisão do usuário).
