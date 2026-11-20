# 05: Editorias e tags

**Status:** pronta para desenvolvimento
**Branch:** feat/05-editorias-tags
**Tipo:** UI nova, sem designer. O layout reaproveita as linhas da seção Últimas da capa (`docs/design/01-identidade-visual/zona-mista-v2/variacao-2/capa.html`, `.rows`).
**Escrita por:** orquestrador, a partir do plano da v1 (história 5) e da spec (seções 6.2, 6.4 e 6.5). As decisões do usuário foram tomadas em 2026-11-20.

## História
Como leitor, quero abrir uma editoria ou uma tag e ver todas as matérias dela, da mais nova para a mais antiga.

Como squad-fut, quero que os buscadores achem as matérias reais pelo `sitemap.xml` e nunca as fictícias.

## Decisões do usuário (2026-11-20)
- A paginação usa `?pagina=N`, como no plano. O Proxy confere a faixa e responde 404 real fora dela, seguindo o ADR 0006.
- Uma editoria da lista fechada sem nenhuma matéria visível responde **404**. Uma tag sem matéria visível também.
- O layout reaproveita a capa: cabeçalho com nome e contagem, as linhas de Últimas e a navegação entre páginas.
- O sitemap tem a capa, as matérias reais e as páginas de editoria e de tag com pelo menos uma matéria real.

## Critérios de aceite

### A. Regras (funções puras com teste de unidade)
1. `src/lib/listagens.ts` exporta `lerPagina(valor)`. Ela recebe o `pagina` da query (`string | string[] | undefined`). Sem valor, devolve `1`. Com um inteiro decimal ≥ 1 escrito sem zero à esquerda (`"2"`), devolve o número. Em qualquer outro caso devolve `null`: `"0"`, `"-1"`, `"1.5"`, `"02"`, `"abc"`, `""` e array. O teste cobre todos esses valores.
2. `montarListagem(repositorio, filtro, pagina)`, no mesmo arquivo, recebe `{ editoria }` ou `{ tag }` e busca só pelo `ArticleRepository`. Ela devolve `null` quando:
   - a editoria não está na lista fechada (`isEditoria`);
   - a editoria ou a tag não tem matéria visível;
   - a página passa de `totalPaginas`.

   Quando encontra, devolve `{ tipo, slug, rotulo, total, pagina, totalPaginas, itens, soFicticias }`, com o rótulo vindo de `listEditorias()` ou `listTags()`. O teste usa um repositório falso em memória.
3. `src/lib/sitemap.ts` exporta `entradasDoSitemap(repositorio, base)`. A lista tem a capa, cada matéria **real** (`lastModified` = `publicado_em`), cada editoria e cada tag com pelo menos uma matéria real. As URLs são absolutas, a partir de `SITE_URL`. O teste usa um repositório com reais e fictícias e confere que **nenhuma fictícia** e nenhuma lista só de fictícias aparece.

### B. Rotas
4. `src/app/editorias/[editoria]/page.tsx` e `src/app/tags/[tag]/page.tsx` obtêm os dados só por `getRepository()` + `montarListagem`. Os `generateStaticParams` geram as editorias e as tags com matéria visível. Use um valor de reserva quando a lista vier vazia, como no `SLUG_DE_RESERVA` de `src/lib/materias.ts`.
5. **404 real**, estendendo o `src/proxy.ts` (matcher e checagem):
   - `/editorias/inexistente` responde 404;
   - `/editorias/entrevista` responde 404 quando não houver matéria de entrevista visível (teste de unidade/integração com repositório sem ela);
   - `/tags/nao-existe` e `/tags/%C3%87%C3%87` (`ÇÇ`) respondem 404;
   - `?pagina=0`, `?pagina=abc` e `?pagina=99` respondem 404.

   A página com `?pagina=1` explícito responde 200 com o mesmo conteúdo da página sem query. O `notFound()` da página continua como segunda defesa.
6. **Metadados** (`src/lib/seo.ts`, função nova):
   - `title` "Crônica" ou "Tag: Taça das Serras", e a página N > 1 recebe o sufixo "· página N";
   - `description` curta com a contagem;
   - `alternates.canonical` aponta para a própria página, sem `?pagina=1`;
   - `robots: noindex` quando `soFicticias` for verdadeiro.
7. `src/app/sitemap.ts` e `src/app/robots.ts` usam as convenções de metadata do Next 16 (consulte `node_modules/next/dist/docs/`). O `robots.txt` permite tudo e aponta para `<SITE_URL>/sitemap.xml`. Hoje todas as matérias são fictícias, então o sitemap sai só com a capa. O e2e confere isso.

### C. Página
8. Há **um único `h1`** com o rótulo ("Crônica" ou "Taça das Serras"), acompanhado de um chapéu "Editoria" ou "Tag" e da contagem ("2 matérias" / "1 matéria"). As matérias aparecem numa `<ol>` com o mesmo visual das linhas de Últimas: data curta, editoria, selo "Exemplo" quando for fictícia, título com link (`h2`), linha fina e minutos.
   - Extraia a linha para um componente compartilhado com a capa, sem duplicar classes. Ele aceita o nível do título (`h2`/`h3`).
   - A capa precisa continuar idêntica: as referências do `visual.spec.ts` da capa não mudam.
9. **Paginação**: só aparece com `totalPaginas > 1`. É uma `<nav aria-label="Paginação">` com "← Anteriores" e "Próximas →" (links para `?pagina=N`), mais "Página N de M". A página atual não vira link. O teste de unidade do componente usa uma listagem falsa com 3 páginas, porque com 8 matérias não existe página 2.
10. A **nav de editorias do cabeçalho** marca a editoria atual com `aria-current="page"`, que já tem estilo em `EditoriasNav`. Se isso exigir um componente cliente, limite-o ao `<ul>`/links. Na matéria e na capa, nenhum link fica marcado.
11. Os links de tag da matéria (`TagsDaMateria`) e os de editoria da capa e da matéria abrem páginas com status 200.

### D. Acessibilidade herdada do PR #8 (pedido do usuário)
12. `EditoriasDaCapa.tsx`: o nome acessível passa de "Crônica2 matérias" para "Crônica 2 matérias". Troque o `aria-label` do `<sup>` por `<span className="sr-only"> 2 matérias</span>` + `<sup aria-hidden="true">02</sup>`. Em `capa-riscos.spec.ts`, aperte a regex para exigir o espaço (`/^Crônica 2 matérias$/`).
13. `FaixaDaEditoria.tsx`: o `<time>` passa a ser lido como "25 out", e não "25out". Use um espaço real ou `sr-only` entre dia e mês, sem mudar o visual.
14. `ChapeuDaCapa.tsx`: o `relative z-1` sai do `<p>` e vai só para o link da editoria e o selo. Assim a área vazia do chapéu volta a abrir a matéria pelo link esticado. Um e2e confere: clicar na área vazia do chapéu de uma linha de Últimas abre a matéria, e clicar na editoria abre a editoria.

### E. Testes e portões
15. Um e2e novo (`tests/e2e/listagens.spec.ts`) em **320px e 1280px** confere:
    - `/editorias/cronica`: um único `h1`, 2 itens, ordem por data decrescente, selo nas fictícias, nada de rolagem horizontal e axe sem violações no claro e no escuro;
    - `/tags/taca-das-serras`: 4 itens e o rótulo vindo do `tags.json`;
    - `/tags/liga-do-planalto-azul`: rótulo humanizado;
    - os 404 do critério 5 (`response.status() === 404` e a página `not-found` do site);
    - o `sitemap.xml` e o `robots.txt` (critério 7);
    - `aria-current` na nav.

    O `visual.spec.ts` ganha referências de `/editorias/cronica` em 375px e 1280px, no claro e no escuro. As outras referências não mudam. Os cinco portões passam: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e` e `pnpm build`.

## Notas técnicas
- `list({ editoria | tag, page })` já filtra, ordena e pagina (`src/lib/content/catalog.ts`), e `listEditorias()`/`listTags()` já dão rótulo e total. Não recrie nada disso. `list()` lança `RangeError` com `page < 1`, então valide antes com `lerPagina`.
- Com Cache Components, ler `searchParams` torna a renderização dinâmica. Consulte `node_modules/next/dist/docs/` (guias de Cache Components, `page.md` e `loading.md`) para decidir onde fica o `<Suspense>` ou o `"use cache"`, e mantenha o build sem erro de "dados fora de Suspense". O status 404 vem do Proxy, como no ADR 0006. Acrescente ao ADR 0006 uma seção curta "Extensão (história 05)". Não crie ADR novo.
- O Proxy tem que concordar com a página: use a mesma `montarListagem` (ou a mesma `lerPagina` + repositório). Assim, a regra de 404 fica num lugar só.
- O tamanho da página é o padrão de 12 (`TAMANHO_PADRAO_DA_PAGINA`). Não mude.
- A nav do cabeçalho continua com as 7 editorias fixas. Com `MOSTRAR_EXEMPLOS=false` e sem matérias reais, os links dão 404. Isso é aceito e fica fora do escopo.
- Fora do escopo: busca (história 6), botão de tema (história 7) e índice `/tags` com todas as tags.
