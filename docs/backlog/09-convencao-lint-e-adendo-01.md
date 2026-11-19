# 09: Convenção do prefixo `_` no lint e correção do adendo da história 01

**Status:** pronta para desenvolvimento
**Branch:** chore/09-convencao-lint-e-adendo-01
**Tipo:** manutenção (chore), sem UI, sem designer

> Numeração: as histórias 02 a 08 já estão reservadas pelo plano da v1 (`feat/02-…` a `feat/08-…`). Esta manutenção usa o 09 para não colidir com elas, embora seja feita antes da história 02.

## Contexto
O code review da história 01 deixou duas pendências, e o usuário quer resolvê-las antes da história 02:

1. **Convenção de lint sem registro.** O dev acrescentou ao `eslint.config.mjs` a regra `@typescript-eslint/no-unused-vars` em `warn`, com `argsIgnorePattern: "^_"` e `varsIgnorePattern: "^_"`, valendo para o projeto todo. Hoje ela só tem um comentário de uma linha no próprio arquivo. Sem uma regra escrita, qualquer agente pode usar o prefixo `_` para silenciar o lint e esconder código morto. O uso legítimo é um parâmetro que o contrato exige e que ainda não é usado. O único caso atual é `SiteHeader(_: SiteHeaderProps)` em `src/components/layout/SiteHeader.tsx`, que recebe `edicao?` para a história 04.
2. **Adendo da história 01 desatualizado.** Em `docs/backlog/01-identidade-visual.md`, a tabela "Portões (reteste)" do "Adendo: reteste após correção do QA-01" diz `npm test` com "5 arquivos, 20 testes". Depois do commit `60b0da2`, são 6 arquivos e 22 testes. O adendo também não registra que `tests/e2e/foco-pular.spec.ts` passou a exigir papel (`--color-bg`) no vão da borda de baixo, com o halo do link de pular.

Quem ganha: o squad-blog (dev, code-reviewer e QA passam a ter uma regra escrita para citar) e o usuário (o histórico da história 01 fica fiel ao que foi entregue).

## História
Como membro do squad-blog, quero uma regra escrita sobre quando usar o prefixo `_` e um relatório de QA da história 01 com números corretos, para que o lint não sirva para esconder código morto e o histórico do projeto seja confiável.

## Critérios de aceite

### Convenção do prefixo `_`
1. Existe o ADR `docs/adr/0003-<slug>.md` (próximo número depois de `0002-fontes.md`), no mesmo formato dos ADRs 0001 e 0002: título `# ADR 0003: …`, linha `**Status:** aceito · **Data:** … · **História:** docs/backlog/09-convencao-lint-e-adendo-01.md` e as seções Contexto, Decisão, Alternativas consideradas e Consequências.
2. A Decisão do ADR transcreve a regra exatamente como está no `eslint.config.mjs`: `@typescript-eslint/no-unused-vars`, nível `warn`, `argsIgnorePattern: "^_"`, `varsIgnorePattern: "^_"`, sem filtro de arquivos (vale para o projeto todo).
3. O ADR diz em uma frase quando o prefixo `_` é **permitido**: parâmetro ou desestruturação exigidos por um contrato (assinatura definida pelo arquiteto, API do framework) que ainda não são usados. Cita como exemplo `SiteHeader(_: SiteHeaderProps)`, com `edicao?` reservado para a história 04.
4. O ADR diz quando o prefixo `_` é **proibido**: renomear variável, import, função ou parâmetro que não é mais usado, só para calar o aviso. Nesse caso, o código deve ser apagado.
5. O ADR define a regra de rastreio: todo identificador com prefixo `_` aponta para o contrato ou para a história que vai usá-lo, num comentário ao lado ou nas Notas técnicas da história. O `SiteHeader` atende a isso: se ele ainda não tiver esse apontamento, ganha um comentário de uma linha citando a história 04. Nenhuma outra linha do componente muda.
6. O ADR registra nas Consequências que o code-reviewer confere cada `_` novo no diff contra os critérios 3 a 5, e que remover o prefixo `_` (passando a usar o parâmetro) é responsabilidade da história citada.
7. O comentário da linha 9 do `eslint.config.mjs` passa a citar o ADR 0003 (por exemplo, `ver docs/adr/0003-…`). A regra em si não muda: `git diff main -- eslint.config.mjs` mostra só a linha de comentário alterada.
8. Na decisão do usuário sobre onde mais registrar a regra (Dúvida 1, abaixo), se a resposta incluir o `CLAUDE.md`, a seção "Regras do projeto" ganha **um** item curto que resume a convenção e aponta para o ADR 0003. Nenhum outro trecho do `CLAUDE.md` ou do `AGENTS.md` muda.

### Correção do adendo da história 01
9. Na tabela "Portões (reteste)" do "Adendo: reteste após correção do QA-01" em `docs/backlog/01-identidade-visual.md`, a linha `npm test` diz "verde: 6 arquivos, 22 testes". Antes de gravar, confira os números rodando `npm test` na `main` (que já contém o `60b0da2`). Se a contagem for diferente, use a contagem real e registre a diferença na resposta ao orquestrador.
10. O adendo ganha uma nota, datada e identificada como correção posterior (por exemplo, "Correção (história 09): …"), que diz: (a) a contagem anterior de 5 arquivos e 20 testes era de antes do commit `60b0da2`; (b) depois desse commit, `tests/e2e/foco-pular.spec.ts` também exige papel (`--color-bg`) no vão da borda de baixo, onde fica o halo do link de pular, e não só nas bordas de cima, esquerda e direita.
11. A linha `npm test` do relatório de QA original (seção "Portões", antes do adendo, com "5 arquivos, 20 testes") **não muda**, porque registra a rodada daquele momento. Nenhum outro trecho da história 01 muda além dos itens 9 e 10: `git diff main -- docs/backlog/01-identidade-visual.md` mostra só a linha da tabela do adendo e a nota nova.
12. Se a nota do critério 10 contradisser a ressalva sobre a borda de baixo, que ainda diz que "a spec dispensa a borda de baixo da exigência de ≥ 95% papel", a nota diz explicitamente que essa ressalva ficou superada pelo `60b0da2`. A ressalva original não é apagada.

### Escopo do diff e portões
13. Nenhum arquivo em `src/`, `tests/`, `content/` ou `docs/design/` é alterado, exceto o comentário de uma linha do critério 5 em `SiteHeader.tsx`, se for preciso. O build gera as mesmas rotas de antes: `/` e `/_not-found`, estáticas.
14. Os 5 portões ficam verdes na branch `chore/09-convencao-lint-e-adendo-01`, e o resultado é registrado no "Relatório de QA" desta história:
    - `npm run lint`: 0 erros e 0 avisos.
    - `npm run typecheck`: verde.
    - `npm test`: verde, com a mesma contagem do critério 9.
    - `npm run test:e2e`: verde, com o mesmo número de testes da `main`.
    - `npm run build`: verde.
15. Os commits seguem Conventional Commits em português, com o tipo `docs:` ou `chore:` (por exemplo, `docs: ADR 0003 sobre o prefixo _ no lint`), e terminam com a linha `Co-Authored-By` exigida pelo `CLAUDE.md`.

## Fora de escopo
- Mudar a regra de lint: nível (`warn` para `error`), padrões ou alcance por pasta.
- Implementar `edicao?` no `SiteHeader` ou tirar o `_` dele. Isso é da história 04.
- Caçar código morto ou refatorar outros arquivos.
- Rodar a homologação visual da história 01 de novo, ou mexer em `tests/e2e/foco-pular.spec.ts` e nas outras specs.
- Novas regras de lint, Prettier ou hooks de pre-commit.
- Reescrever outros trechos do relatório de QA da história 01.

## Dúvidas para o usuário
1. **Onde registrar a convenção do `_`?**
   - (A) Só no ADR 0003, e o `eslint.config.mjs` aponta para ele.
   - (B) Só uma regra no `CLAUDE.md`, sem ADR.
   - (C) **Recomendado:** ADR 0003 com a decisão completa e um item de uma linha no `CLAUDE.md` apontando para ele. O `CLAUDE.md` é lido por todos os agentes em toda sessão, e o ADR guarda o porquê e as alternativas.

   Mudar o `CLAUDE.md` precisa da aprovação explícita do usuário. Sem ela, vale a opção A e o critério 8 não se aplica.

## Referências
- `CLAUDE.md`: Regras do projeto, Portões de qualidade, Git e GitHub.
- `eslint.config.mjs`, linhas 8 a 16.
- `src/components/layout/SiteHeader.tsx`, linha 15.
- `docs/backlog/01-identidade-visual.md`: seção "Verificação do desvio do dev" (ressalvas) e "Adendo: reteste após correção do QA-01" (tabela "Portões (reteste)").
- `docs/adr/0001-estrategia-de-estilo.md` e `docs/adr/0002-fontes.md`, para o formato.
- `docs/superpowers/plans/2026-11-19-blog-fut-v1.md`: histórias 1 a 8 e suas branches, para a numeração.
- Commit `60b0da2`.

## Notas técnicas

Decisão do usuário sobre a Dúvida 1: **opção C**. O ADR 0003 foi escrito pelo arquiteto, e a mudança no `CLAUDE.md` está aprovada, então o critério 8 se aplica. Não há framework envolvido (nenhuma API do Next muda), nem dependência nova, nem teste novo: a prova de cada critério é o diff e os portões.

### Arquivos

| Arquivo | Quem | Mudança |
|---|---|---|
| `docs/adr/0003-prefixo-underscore-no-lint.md` | arquiteto (feito) | ADR novo. Cobre os critérios 1 a 6. |
| `eslint.config.mjs` | dev | Só a linha 9 (comentário). A regra não muda. |
| `src/components/layout/SiteHeader.tsx` | ninguém | **Não muda.** A linha 14 já tem o apontamento exigido pelo critério 5 (`// \`edicao\` é contrato da história 4; por ora o parâmetro é recebido e ignorado.`). |
| `CLAUDE.md` | dev | Um item novo na seção "Regras do projeto". |
| `docs/backlog/01-identidade-visual.md` | qa | Linha `npm test` da tabela "Portões (reteste)" e uma nota de correção no fim do adendo. |
| `docs/backlog/09-convencao-lint-e-adendo-01.md` | qa | "Relatório de QA" desta história (critério 14). |

### 1. `eslint.config.mjs` (dev)
Trocar só a linha 9. Antes:
```js
    // Convenção: parâmetro com prefixo `_` é recebido de propósito e ainda não usado.
```
Depois:
```js
    // Convenção: `_` só para parâmetro de contrato ainda não usado; ver docs/adr/0003-prefixo-underscore-no-lint.md.
```
Prova (critério 7): `git diff main -- eslint.config.mjs` mostra uma linha removida e uma adicionada, ambas de comentário.

### 2. `CLAUDE.md` (dev)
Na seção `## Regras do projeto`, inserir **uma** linha nova logo depois do item "**Regra do repositório:**" (linha 53) e antes de "**Texto do squad é imutável:**". As duas são regras de código, então ficam juntas. Texto exato:
```md
- **Prefixo `_` no lint:** só para parâmetro ou desestruturação exigidos por um contrato e ainda não usados, com comentário apontando a história que vai usá-los. Código que deixou de ser usado é apagado, não renomeado. Veja `docs/adr/0003-prefixo-underscore-no-lint.md`.
```
Prova (critério 8): `git diff main -- CLAUDE.md AGENTS.md` mostra só essa linha adicionada. O `AGENTS.md` não é tocado (lembrete: o `next dev` regrava o bloco dele; se aparecer diff ali, descartar antes do commit, sem commitar).

### 3. `docs/backlog/01-identidade-visual.md` (qa)
Antes de editar, na `main` (ou na branch, que tem o mesmo código), rodar `npm test` e anotar a contagem real de arquivos e testes. Conferir também o que o `60b0da2` mudou na spec com `git show 60b0da2 -- tests/e2e/foco-pular.spec.ts` (leitura, permitida a todos).

a) Na tabela "Portões (reteste)" (hoje linha 299), trocar só esta linha. Antes:
```md
| `npm test` | verde: 5 arquivos, 20 testes |
```
Depois (com os números reais, se forem diferentes):
```md
| `npm test` | verde: 6 arquivos, 22 testes |
```
A linha igual da seção "Portões" original (hoje linha 269) **não muda** (critério 11). Atenção ao editar: as duas linhas são idênticas, então a edição precisa usar o contexto da tabela do reteste (a linha seguinte, `npm run test:e2e` (rodada 1) | verde: 136 passaram…) para não acertar a linha errada.

b) Logo depois da linha "Nenhum bug novo." do adendo (hoje linha 304) e antes de "**Veredito atualizado: APROVADO.**", inserir este parágrafo (critérios 10 e 12):
```md
**Correção (história 09, 2026-11-19):** a contagem de `npm test` desta tabela dizia "5 arquivos, 20 testes", número de antes do commit `60b0da2`. Depois desse commit, são 6 arquivos e 22 testes. O mesmo commit fez `tests/e2e/foco-pular.spec.ts` exigir papel (`--color-bg`) também no vão da borda de baixo, onde fica o halo do link de pular, e não só nas bordas de cima, esquerda e direita. Com isso, a ressalva da seção "Verificação do desvio do dev", segundo a qual a spec dispensa a borda de baixo da exigência de ≥ 95% papel, ficou superada pelo `60b0da2`. A ressalva original foi mantida como registro daquela rodada.
```
Se a contagem real for diferente de 6 e 22, usar os números reais nas duas partes (tabela e nota) e informar a diferença ao orquestrador. Se `git show 60b0da2` mostrar que a exigência na borda de baixo não é ≥ 95% papel (por exemplo, outro limiar), ajustar a frase ao que a spec faz de fato e avisar o orquestrador. Se a contagem do e2e também tiver mudado, **não** editar a linha do e2e (o critério 11 limita o diff); só registrar no relatório de QA desta história.

Prova (critério 11): `git diff main -- docs/backlog/01-identidade-visual.md` mostra exatamente uma linha trocada na tabela do reteste e o parágrafo novo (mais a linha em branco que o separa).

### 4. Relatório de QA desta história (qa)
Acrescentar `## Relatório de QA` ao fim deste arquivo com os 5 portões (critério 14): lint com 0 erros e 0 avisos; typecheck verde; `npm test` com a mesma contagem do item 3; `npm run test:e2e` com o mesmo número de testes da `main`; build verde com `/` e `/_not-found` estáticos (critério 13). Incluir a saída de `git diff main --stat` para provar o escopo do critério 13: nenhum arquivo em `src/`, `tests/`, `content/` ou `docs/design/`.

### Critérios de aceite → prova

| # | Prova |
|---|---|
| 1 a 6 | Leitura do `docs/adr/0003-prefixo-underscore-no-lint.md` (cabeçalho e as quatro seções; Decisão itens 1 a 4; Consequências). |
| 5 | `SiteHeader.tsx` sem diff: a linha 14 já cita a história 4. |
| 7 | `git diff main -- eslint.config.mjs`: só a linha 9. |
| 8 | `git diff main -- CLAUDE.md AGENTS.md`: uma linha adicionada em "Regras do projeto". |
| 9 a 12 | `git diff main -- docs/backlog/01-identidade-visual.md` e `npm test`. |
| 13 | `git diff main --stat` e a saída do `npm run build`. |
| 14 | Relatório de QA desta história. |
| 15 | `git log main..HEAD` (versionador). Sugestão: um commit `docs: ADR 0003 sobre o prefixo _ no lint` (ADR, notas técnicas, `eslint.config.mjs`, `CLAUDE.md`) e outro `docs: corrige contagem de testes no adendo da história 01` (história 01 e relatório de QA). |

### Riscos para o code-reviewer
- A tabela original e a do reteste têm a linha `npm test` idêntica: conferir no diff que a trocada é a do reteste (perto da linha 299), não a da linha 269.
- O `next dev` reescreve o bloco do `AGENTS.md`: nenhum diff nesse arquivo deve entrar no PR.
- Conferir que o `eslint.config.mjs` não ganhou nenhuma mudança na regra, nem de formatação.

## Relatório de QA

História sem código de produção nem teste novo. A prova de cada critério é o diff contra a `main` e os portões, rodados na branch `chore/09-convencao-lint-e-adendo-01` depois de o dev concluir o `eslint.config.mjs` e o `CLAUDE.md`.

### Conferência prévia (critérios 9 e 10)
- `npm test` real: **6 arquivos, 22 testes**. Igual ao valor das Notas técnicas, sem diferença.
- `git show 60b0da2 -- tests/e2e/foco-pular.spec.ts`: o laço que exigia fundo só em `topo`, `esquerda` e `direita` virou `faixasPorLado`, com `base: ["vao"]`. O limiar continua `toBeGreaterThanOrEqual(0.95)` (≥ 95% de `--color-bg`) também no vão de baixo. Na borda de baixo, a faixa de fora segue sem exigência de papel. O commit também fixou `deviceScaleFactor: 1`. A nota da correção descreve isso corretamente, sem ajuste no texto.

### Critério → prova → resultado

| # | Prova | Resultado |
|---|---|---|
| 1 | `docs/adr/0003-prefixo-underscore-no-lint.md`: título `# ADR 0003: …`, linha de Status/Data/História, seções Contexto, Decisão, Alternativas consideradas e Consequências | passa |
| 2 | Decisão, item 1: regra, `warn`, `argsIgnorePattern: "^_"`, `varsIgnorePattern: "^_"`, sem filtro de arquivos | passa |
| 3 | Decisão, item 2: quando é permitido, com o exemplo `SiteHeader(_: SiteHeaderProps)` e `edicao?` para a história 04 | passa |
| 4 | Decisão, item 3: quando é proibido, e o código deve ser apagado | passa |
| 5 | Regra de rastreio no ADR. `SiteHeader.tsx` sem diff (a linha 14 já cita a história 4) | passa |
| 6 | Consequências: conferência do code-reviewer e remoção do `_` pela história citada | passa |
| 7 | `git diff main -- eslint.config.mjs`: uma linha removida e uma adicionada, as duas de comentário (linha 9), citando o ADR 0003 | passa |
| 8 | `git diff main -- CLAUDE.md AGENTS.md`: só uma linha adicionada em "Regras do projeto", entre "Regra do repositório" e "Texto do squad é imutável". `AGENTS.md` sem diff | passa |
| 9 | `git diff main -- docs/backlog/01-identidade-visual.md`: a linha trocada é a da tabela "Portões (reteste)" (hunk em `@@ -296`), agora "verde: 6 arquivos, 22 testes" | passa |
| 10 | Nota "Correção (história 09, 2026-11-19)" entre "Nenhum bug novo." e "Veredito atualizado" | passa |
| 11 | A linha `npm test` da seção "Portões" original (linha 269) não muda. O diff tem só a linha da tabela e o parágrafo novo, mais a linha em branco | passa |
| 12 | A nota declara a ressalva sobre a borda de baixo superada pelo `60b0da2`, e a ressalva original (linha 251) foi mantida | passa |
| 13 | `git diff main --quiet -- src tests content docs/design AGENTS.md` com saída 0. Build com `/` e `/_not-found` estáticos | passa |
| 14 | Portões abaixo | passa |
| 15 | Commits: responsabilidade do versionador (`git log main..HEAD`) | fora do QA |

### `git diff main --stat`

```
 CLAUDE.md                                     |   1 +
 docs/adr/0003-prefixo-underscore-no-lint.md   |  37 +++++++
 docs/backlog/01-identidade-visual.md          |   4 +-
 docs/backlog/09-convencao-lint-e-adendo-01.md | 146 ++++++++++++++++++++++++++
 eslint.config.mjs                             |   2 +-
 5 files changed, 188 insertions(+), 2 deletions(-)
```
(Antes deste relatório ser acrescentado. Nenhum arquivo em `src/`, `tests/`, `content/`, `docs/design/` ou `AGENTS.md`.)

### Portões

| Portão | Resultado |
|---|---|
| `npm run lint` | verde: 0 erros e 0 avisos (também conferido com `eslint . --max-warnings=0`, saída 0) |
| `npm run typecheck` | verde |
| `npm test` | verde: 6 arquivos, 22 testes |
| `npm run test:e2e` | verde: 136 passaram, o mesmo número da `main` |
| `npm run build` | verde (`/` e `/_not-found` estáticos) |

### Testes acrescentados
Nenhum. A história não tem comportamento novo para testar (veja as Notas técnicas).

### Bugs
Nenhum.

**Veredito: APROVADO.**
