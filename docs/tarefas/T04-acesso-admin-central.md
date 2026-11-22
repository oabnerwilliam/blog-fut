# T04: Acesso de admin conferido num lugar só

**Status:** registrada
**Branch sugerida:** chore/T04-acesso-admin-central
**Registrada em:** 2026-11-22, a pedido do usuário. Continua a análise da história 20 (`docs/backlog/20-regiao-gru1.md`).

## Problema

O usuário quer que o acesso de admin seja conferido "globalmente", e não em cada uso. Hoje:

- cada server action de `src/lib/admin/materias.ts` começa por `exigirAdmin()`, e as de `src/lib/admin/acessos.ts` fazem a própria conferência, com outro formato;
- o `exigirAdmin()` faz 3 chamadas de rede em sequência: `getUser()` no Auth, a leitura de `perfis` e `rpc("eh_admin")`. A última repete a anterior, porque `eh_admin()` é "perfil aprovado". O `decisoes.ts` repete o `eh_admin` de novo;
- a prévia do editor paga a conferência completa a cada 400 ms de digitação, e as actions rodam em fila no Next 16.

**O que não muda:** a conferência continua existindo em cada action. Uma server action é um endpoint público por POST, e bloquear a tela ou o layout não a protege (doc do Next 16, `server-actions.md`, "Authenticate and authorize"; prova em `tests/e2e-db/admin-sem-permissao.spec.ts`). "Global" aqui quer dizer **um único ponto de entrada**, escrito uma vez e barato, que nenhuma action consegue esquecer.

## Critérios de aceite

1. **Um ponto de entrada:** um wrapper (por exemplo, `acaoDoAdmin(fn)`) ou uma camada de acesso a dados única, usada por **todas** as actions do admin (`materias.ts` e `acessos.ts`). Os dois formatos de conferência viram um só. Um teste falha se um arquivo `"use server"` em `src/lib/admin/` exportar uma action que não passe por esse ponto.
2. **Sem chamada repetida:** sai o `rpc("eh_admin")` do servidor (`sessao.ts` e `decisoes.ts`). O status do perfil lido na mesma requisição decide, e o banco continua conferindo `eh_admin()` em cada RPC e no RLS (ADR 0009, as duas camadas).
3. **Token conferido sem rede:** `getUser()` vira `getClaims()` em `src/lib/auth/servidor.ts`, nas páginas e nas actions, desde que o projeto do Supabase use chaves JWT assimétricas (conferir no painel, em *Settings → JWT Keys*, e registrar). Revogar um admin continua tendo efeito na hora, porque o status vem do banco. Registrar no ADR 0009 que sair em outro aparelho só vale neste navegador quando o token vencer.
4. **Prévia leve:** a action `previsualizar` confere só o token (decisão do usuário em 2026-11-22), sem ler o perfil, e continua devolvendo o HTML sanitizado do site.
5. **Medição:** o tempo de uma action do painel (por exemplo, salvar) medido em produção antes e depois, por log temporário sem dado pessoal ou pelos logs da Vercel, fica registrado no PR. O log temporário sai antes do merge final.
6. **Segurança intacta:** `admin-sem-permissao.spec.ts`, `editor-riscos.spec.ts` e `rls-admin.test.ts` continuam passando. Um pendente, um recusado e um revogado continuam recebendo `nao_autorizado` em todas as actions. Os cinco portões e o `pnpm test:db` passam.

## Notas

- Mexe em segurança: o revisor confere o risco de cada action, uma por uma.
