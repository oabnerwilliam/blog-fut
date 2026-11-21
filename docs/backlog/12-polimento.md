# 12: Polimento (sugestões acumuladas dos PRs #5 a #12)

**Status:** pronta para desenvolvimento
**Branch:** chore/12-polimento
**Tipo:** ajustes pequenos, sem UI nova e sem mudança visual.
**Escrita por:** orquestrador, em 2026-11-20, no desenvolvimento autônomo pedido pelo usuário. Ela junta as sugestões que os revisores deixaram registradas nos PRs.

## Critérios de aceite

1. **`title` da 404** (PR #5). A `not-found` exporta `metadata` com `title: "Página não encontrada"`. O e2e confere o `<title>` de `/materias/nao-existe` e de `/editorias/inexistente`. Antes de escrever, consulte `node_modules/next/dist/docs/` para ver se `not-found.tsx` aceita `metadata` no Next 16. Se não aceitar, use a alternativa documentada e registre-a.
2. **Axe da 404 no escuro** (PR #5). O `acessibilidade.spec.ts`, ou o spec que já cobre a 404, roda o axe na 404 nos temas claro e escuro.
3. **`SITE_URL` só com a origem** (PR #5). `lerUrlDoSite` passa a recusar valores com caminho além de `/`, com query ou com hash, por exemplo `https://x.com/blog` e `https://x.com/?a=1`. A mensagem de erro em pt-BR explica o motivo. O teste de unidade cobre os casos válidos e os inválidos.
4. **`outputFileTracingExcludes`** (PR #5). O `next.config.ts` exclui `./tests/**` do rastreamento de arquivos do deploy e deixa um comentário curto. O `pnpm build` continua verde.
5. **Setas da paginação** (PR #9). Em `Paginacao.tsx`, as setas "←" e "→" vão para `<span aria-hidden="true">`. O nome acessível dos links passa a ser "Anteriores" e "Próximas", e o teste de unidade confere isso.
6. **Comentário do `LinksDeEditorias`** (PR #9). Reescreva a justificativa de o `usePathname` não pedir `<Suspense>`. Ela tem de valer também para a `_not-found`, que não tem params. Consulte a doc de `usePathname` e de Cache Components do Next 16 e cite a seção.
7. **Comentário cruzado em `tema.ts`** (PR #11). `temaDoAtributo` e `SCRIPT_DO_TEMA` ganham um comentário "mude os dois juntos". O teste de unidade que garante que os dois concordam continua.
8. **Testes** (PR #12, cosmético):
   - reflow do comentário do topo de `tests/e2e/listagens.spec.ts`;
   - em `tests/e2e/capa.spec.ts`, no teste "nenhuma fictícia ocupa o destaque", um comentário dizendo que a regra geral está no teste unitário de `capa.ts`.
9. Nenhuma referência visual muda. Os cinco portões passam.

## Fora do escopo (continua registrado)
- **Fallback do `<Suspense>` em `?pagina=N>1`** (PR #9). Só vale a pena quando alguma editoria ou tag passar de 12 matérias.
- **`aria-label` do botão de tema antes da hidratação** (PR #11). Mudar o atributo antes da hidratação causaria um aviso de mismatch, e o impacto é baixo.
- **Resultado da `/busca` sem JS** (PR #10). Hoje ela mostra um aviso; o resultado de verdade exigiria tirar a página do shell com streaming.
