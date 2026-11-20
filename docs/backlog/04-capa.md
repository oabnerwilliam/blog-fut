# 04: Capa

**Status:** pronta para desenvolvimento
**Branch:** feat/04-capa
**Tipo:** UI nova, sem designer. O layout já foi aprovado na história 01 (`docs/design/01-identidade-visual/zona-mista-v2/variacao-2/capa.html`).
**Escrita por:** orquestrador, a partir do plano da v1 (história 4) e da spec (seção da capa). As decisões do usuário foram tomadas em 2026-11-20.

## História
Como leitor, quero abrir a capa e ver logo a matéria mais importante, as últimas publicadas e um caminho por editoria.

Como squad-fut, quero que uma matéria real sempre tenha prioridade sobre os exemplos fictícios no destaque.

## Critérios de aceite

### A. Regras (funções puras com teste de unidade)
1. `src/lib/capa.ts` exporta `escolherDestaque(itens)`. Ela recebe as matérias já em ordem (`publicado_em` decrescente) e devolve **a real mais recente**. Se não houver nenhuma real, devolve a fictícia mais recente. Com lista vazia, devolve `null`. Os testes cobrem três casos:
   - só fictícias;
   - real mais antiga que as fictícias (a real vence);
   - lista vazia.
2. `montarCapa(repositorio)`, no mesmo arquivo, busca os dados só pelo `ArticleRepository` e devolve `{ destaque, ultimas, editorias, faixas }`:
   - `ultimas`: todas as matérias da primeira página de `list()`, menos o destaque, na ordem da listagem;
   - `editorias`: o resultado de `listEditorias()`, só as que têm `total > 0`;
   - `faixas`: uma por editoria com **2 ou mais matérias**, cada uma com as **3 mais recentes** dessa editoria (`list({ editoria, pageSize: 3 })`). Decisão do usuário: uma matéria pode aparecer no destaque, nas Últimas e numa faixa ao mesmo tempo. A ordem das faixas é a mesma de `listEditorias()`.

   O teste de unidade usa um repositório falso em memória.
3. `formatarDataCurta("2026-11-19")` devolve `"19.11.2026"`, e `formatarDiaMes("2026-11-06")` devolve `{ dia: "06", mes: "nov" }`. As duas ficam em `src/lib/datas.ts`, seguem a mesma regra de data de calendário de `formatarData` (sem fuso) e têm teste.

### B. Página (segue o mockup `variacao-2/capa.html`)
4. `src/app/page.tsx` substitui a capa provisória e obtém os dados só por `getRepository()` + `montarCapa`.
5. **Um único `h1`**, visualmente oculto (`sr-only`): "Zona Mista: futebol depois do apito". Cada seção tem um `h2` ligado por `aria-labelledby`, e os títulos das matérias são `h3` (o do destaque é `h2`, como no mockup).
6. **Destaque**, na faixa azul-noite (tokens `night`):
   - editoria com link para `hrefDaEditoria` e o rótulo "Destaque";
   - título com link para `/materias/<slug>`;
   - linha fina;
   - `dl` com Por, Data (`formatarDataCurta`, num `<time dateTime>`) e Leitura ("9 min").

   Se a matéria for fictícia, o selo "◇ Exemplo" (`SeloExemplo`) aparece junto da editoria.
7. **Últimas**: o `h2` "Últimas" vem com a contagem em dois dígitos. A primeira matéria aparece no formato "feature" e as demais numa `<ol>` de linhas, cada uma com data curta (`16.11`), editoria, selo quando for fictícia, título com link, linha fina e minutos. Os textos são os do frontmatter, sem nenhuma alteração.
8. **Editorias**: uma frase com um link por editoria (`hrefDaEditoria`) e a contagem em `<sup>` com `aria-label` ("1 matéria" / "4 matérias"). Os separadores `/` ficam com `aria-hidden`.
9. **Faixas**: o `h2` é o rótulo da editoria, com o link "Ver todas →" para `hrefDaEditoria`. Cada item do trio mostra dia e mês (`formatarDiaMes`, num `<time dateTime>`), título com link, selo quando for fictícia e minutos.
10. **Estado vazio**: sem nenhuma matéria visível (por exemplo, `MOSTRAR_EXEMPLOS=false` só com fictícias), a capa mostra o `h1` e uma mensagem curta ("As primeiras matérias estão sendo preparadas."), sem quebrar o build. Isso tem teste de unidade ou de integração.
11. Os componentes ficam em `src/components/capa/` e usam Tailwind com tokens, sem cor arbitrária (`cores-literais.test.ts`). O CSS próprio que faltar vai para `@layer components` no `globals.css`. Os links de editoria e de tag podem dar 404 até a história 5.

### C. Testes e portões
12. Um e2e novo (`tests/e2e/capa.spec.ts`, substituindo os testes da capa provisória) em **320px e 1280px** confere:
    - um único `h1`;
    - o destaque é a fictícia mais recente e tem o selo;
    - a seção Últimas não repete o destaque;
    - a faixa de Crônica existe e é a única faixa;
    - nada de rolagem horizontal;
    - clicar no título de uma linha de Últimas abre `/materias/<slug>` com status 200, o que cobre o proxy (sugestão do PR #5).
13. Os testes que dependiam da capa provisória (`borda-320`, `acessibilidade`, `teclado`, `responsivo` e outros) são adaptados à capa nova sem que as asserções fiquem mais fracas. O axe da capa continua passando no claro e no escuro.
14. O `visual.spec.ts` regenera as referências da capa (a mudança visual é intencional) em 375px e 1280px, no claro e no escuro. As outras referências não mudam.
15. Os cinco portões passam: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e` e `pnpm build`.

## Notas técnicas
- `list()` já ordena por `publicado_em` decrescente, com empate pelo slug (`src/lib/content/catalog.ts`). A primeira página tem 12 itens (`TAMANHO_PADRAO_DA_PAGINA`). Não recrie a ordenação.
- O destaque real pode estar fora da primeira página se houver muitas fictícias mais novas. Pela spec, isso não acontece, porque as fictícias têm datas antes de 2026-11-01. Mesmo assim, `escolherDestaque` recebe a lista da primeira página e o teste documenta esse limite. Não percorra todas as páginas.
- Reutilize `SeloExemplo` de `src/components/materia/`. Se ele precisar de uma variante para a faixa noturna, aceite uma prop. Não duplique o componente.
- Antes de usar qualquer API de página ou de cache, consulte `node_modules/next/dist/docs/`. A página continua estática.
- Fora do escopo: paginação da capa, imagens, busca no cabeçalho (história 6) e botão de tema (história 7).
