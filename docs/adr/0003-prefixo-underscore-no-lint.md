# ADR 0003: Prefixo `_` para identificadores de contrato ainda não usados

**Status:** aceito · **Data:** 2026-11-19 · **História:** `docs/backlog/09-convencao-lint-e-adendo-01.md` (critérios 1 a 6)

Fontes consultadas:
- `eslint.config.mjs` (linhas 8 a 16), onde a regra está.
- `node_modules/eslint-config-next/dist/typescript.js`, linha 36: o preset `eslint-config-next/typescript` já liga `@typescript-eslint/no-unused-vars` em `'warn'`, sem padrões de exceção. O bloco do projeto mantém o nível e só acrescenta os padrões.

## Contexto
Na história 01, o `SiteHeader` passou a receber `SiteHeaderProps` com `edicao?: Date`, um contrato definido pelo arquiteto para a história 04. Nesta fase o componente ainda não usa a prop. Sem exceção, o `no-unused-vars` avisaria, e o portão `npm run lint` exige 0 avisos. Por isso o dev acrescentou ao `eslint.config.mjs` os padrões `^_`, e o parâmetro virou `_`.

Até aqui, a convenção só tinha um comentário de uma linha. Sem regra escrita, qualquer agente pode pôr `_` na frente de uma variável morta para calar o aviso, e o código morto passa pelo lint e pelo review sem ninguém notar.

## Decisão
1. **A regra fica como está** no `eslint.config.mjs`, valendo para o projeto todo (o bloco não tem `files`):
   ```js
   "@typescript-eslint/no-unused-vars": [
     "warn",
     { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
   ],
   ```
   Ou seja: regra `@typescript-eslint/no-unused-vars`, nível `warn`, `argsIgnorePattern: "^_"`, `varsIgnorePattern: "^_"`, sem filtro de arquivos.
2. **Quando o `_` é permitido:** só em parâmetro ou desestruturação que um contrato exige (assinatura definida pelo arquiteto nas Notas técnicas ou API do framework) e que ainda não são usados. Exemplo atual e único: `SiteHeader(_: SiteHeaderProps)` em `src/components/layout/SiteHeader.tsx`, com `edicao?` reservado para a história 04.
3. **Quando o `_` é proibido:** para renomear variável, import, função ou parâmetro que deixou de ser usado, só para calar o aviso. Nesses casos, o código deve ser apagado.
4. **Regra de rastreio:** todo identificador com prefixo `_` aponta para o contrato ou para a história que vai usá-lo, num comentário na linha de cima ou ao lado (por exemplo, `// \`edicao\` é contrato da história 4; …`) ou nas Notas técnicas da história que o criou. Um `_` sem esse apontamento é tratado como código morto.

## Alternativas consideradas
- **Não ter exceção e usar `// eslint-disable-next-line` em cada caso:** deixa cada exceção explícita, mas espalha diretivas pelo código, e uma diretiva esquecida continua silenciando a linha mesmo depois que o parâmetro passa a ser usado (só aparece com `--report-unused-disable-directives`). Rejeitada.
- **Não declarar o parâmetro até a história 04 (`SiteHeader()` sem props):** o lint fica limpo, mas o contrato `SiteHeaderProps` deixa de ser verificado pelo TypeScript em quem chama o componente, e a história 04 teria de mudar a assinatura e todos os pontos de uso. Rejeitada.
- **Subir a regra para `error`:** está fora do escopo da história 09. O portão já exige 0 avisos, então na prática `warn` bloqueia o PR do mesmo jeito.
- **Registrar a convenção só no `CLAUDE.md`, sem ADR:** o `CLAUDE.md` deve ficar curto e não guarda o porquê nem as alternativas. Decisão do usuário (opção C da história 09): ADR completo e um item de uma linha no `CLAUDE.md` apontando para ele.

## Consequências
- O **code-reviewer** confere cada `_` novo no diff contra os itens 2 a 4 da Decisão: há um contrato que exige o identificador, ele ainda não é usado, e existe o apontamento para o contrato ou para a história. Se faltar qualquer um dos três, o parecer é MUDANÇAS, e o pedido é apagar o código ou acrescentar o apontamento.
- **Remover o prefixo `_`** (passando a usar o parâmetro com o nome real, por exemplo `{ edicao }`) é responsabilidade da história citada no apontamento. No caso do `SiteHeader`, da história 04, que também apaga o comentário de rastreio.
- A configuração não define `caughtErrorsIgnorePattern`, então `catch (_e)` continua gerando aviso. Isso é intencional: um erro capturado e ignorado deve ser tratado ou o binding omitido (`catch {}`). Se surgir um caso legítimo, ele pede uma decisão nova, que estende este ADR.
- Mudar o nível, os padrões ou o alcance da regra exige um ADR novo que substitua este.
