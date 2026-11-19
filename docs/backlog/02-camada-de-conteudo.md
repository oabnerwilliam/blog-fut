# 02: Camada de conteúdo

**Status:** pronta para desenvolvimento (Dúvidas 1 a 3 respondidas pelo usuário em 2026-11-19; ver "Decisões do usuário" e "Notas técnicas" no fim do arquivo)
**Branch:** feat/02-camada-de-conteudo
**Tipo:** funcionalidade sem UI, sem designer

## Contexto
Todas as telas da v1 (matéria, capa, editorias, tags e busca, histórias 3 a 6) dependem de uma fonte de dados única. A spec (seções 6.2 e 6.3) define que essa fonte é o `ArticleRepository`. Na v1, a implementação lê arquivos `.md` com frontmatter em `content/materias/`. Mais tarde, a troca para Supabase deve ser só de configuração (`CONTENT_SOURCE`), sem reescrever nenhuma tela.

Esta história entrega essa camada e o conteúdo de exemplo, e ainda não liga nada à interface. Ela também é a primeira linha de defesa das regras do `CLAUDE.md`:
- **Regra do repositório:** só `src/lib/content/` toca no sistema de arquivos, e o resto do código obtém dados por `getRepository()` de `@/lib/content`.
- **Texto do squad imutável:** o corpo chega às telas exatamente como está no `.md`, sem nenhuma transformação tipográfica.
- **Matérias fictícias:** são marcadas com `ficticio: true` e usam clubes, jogadores e competições inventados. O filtro `MOSTRAR_EXEMPLOS` fica no repositório.
- **Caixa de entrada:** `content/entrada/` nunca é lida pelo site. Só o que está em `content/materias/` é publicado.

A lista fechada de editorias já existe desde a história 01 em `src/lib/editorias.ts` (`EDITORIAS`, `SLUGS_DE_EDITORIA`, `Editoria`, `rotuloDaEditoria`, `isEditoria`). Esta história **reaproveita** essa lista e não cria outra.

Para quem: o squad-blog (as histórias 3 a 6 consomem este contrato), o squad-fut (o diagramador recebe mensagens de erro claras quando grava um frontmatter inválido) e o leitor (que nunca confunde uma matéria fictícia com uma real e nunca recebe HTML perigoso).

## História
Como dev do squad-blog, quero um repositório de matérias com contrato estável, validação de frontmatter e conteúdo de exemplo, para construir as telas sem tocar em arquivos e trocar a fonte para Supabase no futuro só com configuração.

Como leitor, quero que o texto das matérias chegue sem alterações e sem código perigoso, e que as matérias fictícias sejam sempre identificáveis, para confiar no que leio.

## Critérios de aceite

> Convenção dos testes: os testes de unidade e integração do repositório usam **uma pasta de fixtures própria** (em `tests/`), e não `content/materias/`. Assim, a chegada de matérias reais (história 8) não quebra a contagem dos testes. Só o critério 33 lê o `content/` de verdade.

### A. Estrutura e regra do repositório
1. Existem em `src/lib/content/` os módulos do plano: `schema.ts`, `types.ts`, `repository.ts`, `file-repository.ts`, `index.ts`, `markdown.ts` e `reading-time.ts`. O arquiteto pode acrescentar módulos internos, registrados nas Notas técnicas.
2. `@/lib/content` (o `index.ts`) é a porta pública: exporta `getRepository()`, os tipos `Article`, `ArticleSummary`, `Taxonomy`, `Paginated` e `ArticleRepository`, e também `renderMarkdown` e `readingTime`.
3. Nenhum arquivo fora de `src/lib/content/` importa `fs`, `node:fs`, `fs/promises` ou `node:fs/promises`, nem monta um caminho para `content/`. Verificável por busca no código (o code-reviewer confere, e um teste automatizado que faça essa busca é bem-vindo). Os arquivos de teste podem ler as fixtures.
4. **Editorias reaproveitadas:** o schema valida `editoria` com `SLUGS_DE_EDITORIA` de `@/lib/editorias`. Uma busca por `"reportagem"` (ou por qualquer outro slug de editoria como string literal) em `src/lib/content/` não encontra nada: não existe uma segunda lista dos 7 slugs. Os rótulos das editorias vêm de `rotuloDaEditoria`/`EDITORIAS`.

### B. Schema do frontmatter (spec 6.2)
5. Os campos aceitos são exatamente os da spec 6.2: `slug`, `titulo`, `titulo_seo`, `linha_fina`, `editoria`, `tags`, `meta_description`, `palavras_chave`, `publicado_em`, `autor`, `ficticio` e `origem`.
   - **Obrigatórios:** `slug`, `titulo`, `linha_fina`, `editoria`, `tags`, `publicado_em`, `autor` e `ficticio`.
   - **Opcionais:** `titulo_seo`, `meta_description` e `palavras_chave` (padrão: lista vazia).
   - **Condicional (decisão do usuário 3):** `origem` é **obrigatória e não pode ficar vazia** (nem só com espaços) quando `ficticio: false`. Quando `ficticio: true`, `origem` fica **vazia ou ausente**; uma fictícia com `origem` preenchida também é erro. Os dois casos dão erro com o nome do arquivo e o campo `origem`.
   - `ficticio` é **obrigatório e explícito** (`true` ou `false`), sem valor padrão. Assim, um exemplo que esqueceu a marcação não passa por matéria real.
6. **Editoria fora do enum** (`editoria: opiniao`, `editoria: Analise` ou `editoria: análise`) → o carregamento falha com um erro cuja mensagem contém o **nome do arquivo** (ex.: `materia-invalida.md`), o nome do campo `editoria` e o valor recebido. *(Teste obrigatório do plano.)*
7. **Campo obrigatório ausente** (ex.: sem `titulo`) ou com tipo errado (ex.: `tags: psg`, uma string em vez de lista; `ficticio: "sim"`) → erro com o nome do arquivo e o nome do campo.
8. **Campo desconhecido** (ex.: um erro de digitação como `linhafina:`) → erro com o nome do arquivo e o nome do campo desconhecido.
9. **Slug:** o `slug` é kebab-case minúsculo (só `a-z`, `0-9` e hífen, sem hífen no começo, no fim ou repetido) e **igual ao nome do arquivo** sem `.md`. `slug: PSG-Balanco`, `slug: são-paulo` ou o arquivo `a.md` com `slug: b` → erro com o nome do arquivo.
10. **Tags:** é uma lista com pelo menos 1 item, cada um em kebab-case minúsculo, com a mesma regra do slug. `tags: []` ou `tags: [Ligue 1]` → erro com o nome do arquivo. Uma tag repetida na mesma matéria (`[psg, psg]`) → erro.
11. **Data:** `publicado_em` é uma data de calendário válida no formato `AAAA-MM-DD`. `2026-13-45` ou `19/11/2026` → erro com o nome do arquivo. Uma matéria com `publicado_em: 2026-11-19` é exposta como 19 de novembro de 2026 **em qualquer fuso**. O teste roda com `TZ=America/Sao_Paulo` e confere que o valor não vira dia 18.
12. **Slug duplicado** entre dois arquivos → erro que cita os dois nomes de arquivo. (Pela regra do critério 9, isso só acontece quando há diferença de caixa no nome do arquivo, mas o erro precisa existir mesmo assim.)
13. **YAML malformado** (ex.: aspas não fechadas) → erro com o nome do arquivo, nunca um erro genérico sem contexto.

### C. Leitura dos arquivos
14. O repositório lê só os arquivos `*.md` de `content/materias/`. O `.gitkeep` e qualquer outro arquivo que não termine em `.md` são ignorados sem erro.
15. **Caixa de entrada nunca é lida:** um `.md` válido gravado em `content/entrada/` (ou na pasta equivalente das fixtures) não aparece em `list()`, `getBySlug()`, `search()`, `listEditorias()` nem `listTags()`.
16. **Pasta sem matérias** (só com o `.gitkeep`) → `list()` devolve `{ itens: [], pagina: 1, total: 0, totalPaginas: 0 }`, e `listEditorias()` e `listTags()` funcionam sem erro.
17. **Corpo imutável:** o corpo exposto em `Article` é o texto do arquivo depois do `---` que fecha o frontmatter, caractere por caractere. Só pode ser removida a quebra de linha logo depois desse `---`. O teste usa uma fixture com aspas curvas (“ ”), aspas retas, travessão (—), reticências, `--`, números com vírgula (`1,5`), espaços duplos e linha final em branco, e confere igualdade exata (`toBe`). Um arquivo com quebras de linha CRLF também é lido sem erro.

### D. Contrato do `ArticleRepository` (spec 6.3)
18. `repository.ts` declara a interface exatamente com as assinaturas da spec 6.3: `list(opts?)`, `getBySlug(slug)`, `search(query)`, `listEditorias()` e `listTags()`. Os tipos de `types.ts` seguem o plano: `Taxonomy { slug; rotulo; total }` e `Paginated<T> { itens; pagina; totalPaginas; total }`. `FileArticleRepository` implementa a interface, e o `typecheck` prova isso.
19. **Campos mínimos dos tipos.** O arquiteto define os nomes exatos nas Notas técnicas.
    - `ArticleSummary` traz o suficiente para um card sem ler o corpo: `slug`, `titulo`, `linha_fina`, `editoria` (com o rótulo disponível), `tags` (cada uma com slug e rótulo), `publicado_em`, `autor`, `ficticio` e o tempo de leitura em minutos.
    - `Article` traz tudo isso, mais os campos de SEO (`titulo_seo`, `meta_description`, `palavras_chave`), `origem` e o corpo em markdown.
    - Nenhum tipo traz um campo derivado gravado no arquivo: o tempo de leitura é calculado.
20. **Ordem:** `list()` devolve as matérias em ordem **decrescente** de `publicado_em`. Com 3 fixtures de `2026-10-01`, `2026-10-20` e `2026-10-10`, a ordem é 20, 10 e 01. Em caso de empate na data, a ordem é crescente por `slug` (determinística). *(Teste obrigatório do plano.)*
21. **Filtro por editoria:** `list({ editoria: "cronica" })` devolve só as crônicas, com `total` igual ao número de crônicas das fixtures. Uma editoria válida sem matérias, ou um valor desconhecido (`"xyz"`), devolve `itens: []` e `total: 0`, sem lançar erro. *(Teste obrigatório do plano.)*
22. **Filtro por tag:** `list({ tag: "<tag>" })` devolve só as matérias que têm essa tag, comparando o slug exato (`"PSG"` não encontra `psg`). `editoria` e `tag` juntos combinam os dois filtros (E lógico). *(Teste obrigatório do plano.)*
23. **Paginação:** com 5 fixtures e `pageSize: 2`:
    - a página 1 tem 2 itens, `pagina: 1`, `total: 5` e `totalPaginas: 3`;
    - a página 3 tem 1 item;
    - a página 4 devolve `itens: []`, mantendo `total: 5` e `totalPaginas: 3`, sem lançar erro;
    - as três páginas juntas trazem as 5 matérias, sem repetir nenhuma e na ordem do critério 20.
    
    Sem `page`, vale a página 1. Sem `pageSize`, vale um tamanho padrão definido pelo arquiteto e registrado nas Notas técnicas. `page` ou `pageSize` menor que 1 ou não inteiro (`0`, `-1`, `1.5`) → erro claro, e não um resultado silencioso. *(Teste obrigatório do plano.)*
24. **`getBySlug` inexistente → `null`:** `getBySlug("nao-existe")` devolve `null`. Também devolvem `null`, sem lançar erro e sem ler nenhum arquivo fora de `content/materias/`, os valores `""`, `"PSG-Balanco"` (caixa diferente de um slug existente), `"%00"`, `"../../package"`, `"..\\..\\package"` e `"materia/../outra"`. *(Teste obrigatório do plano.)*
25. **`getBySlug` existente** devolve o `Article` completo do critério 19, com o corpo do critério 17.
26. **`listEditorias()`** devolve as 7 editorias na ordem de `EDITORIAS`, cada uma com `slug`, `rotulo` (ex.: `"Análise"`) e `total` (o número de matérias visíveis, que pode ser 0). A capa (história 4) filtra as que têm `total > 0`.
27. **`listTags()`** devolve só as tags usadas por pelo menos uma matéria visível, cada uma com `slug`, `rotulo` e `total`, em ordem decrescente de `total`. No empate, a ordem é alfabética pelo rótulo, com comparação em pt-BR.
28. **`search(query)` (decisão do usuário 1):** a busca completa é implementada aqui (spec 6.3), sem diferenciar acentos nem maiúsculas, em título, linha fina, tags e corpo, e com ordem igual à do critério 20. Testes de unidade conferem, no mínimo, que `"sao paulo"`, `"SÃO PAULO"` e `"São Paulo"` encontram a mesma fixture, e que `""` e `"   "` devolvem `[]` sem erro. A rota `/busca`, o campo no cabeçalho, os estados vazios e os testes e2e ficam na história 6.

### E. Rótulos de tags (`content/tags.json`)
29. Existe `content/tags.json`, um objeto JSON simples `{ "<slug>": "<Rótulo>" }`. Quando a tag existe nele, o rótulo vem dele (ex.: `{ "fc-aurora": "FC Aurora" }` → `"FC Aurora"`).
30. **Tag sem rótulo → rótulo humanizado:** com a tag `ligue-1` ausente do `tags.json`, o rótulo é `"Ligue 1"`. Hífens viram espaços e cada palavra começa com maiúscula (`copa-do-litoral` → `"Copa Do Litoral"`, a menos que o arquiteto defina outra regra para preposições, registrada nas Notas técnicas e coberta por teste). Isso **não** gera erro, mas emite **um aviso** (`console.warn` ou equivalente) que cita o slug da tag. O teste confere o rótulo e o aviso. *(Teste obrigatório do plano.)*
31. `tags.json` malformado, ou com valor que não seja texto → erro claro que cita `tags.json`. Sem o arquivo, todas as tags usam o rótulo humanizado, sem erro.

### F. `getRepository()` e variáveis de ambiente
32. `getRepository()`:
    - sem `CONTENT_SOURCE`, ou com `CONTENT_SOURCE=files`, devolve o repositório de arquivos;
    - com qualquer outro valor (ex.: `supabase`, `FILES` ou vazio com espaços) lança um erro que cita `CONTENT_SOURCE` e o valor recebido. O Supabase ainda não existe, e esse valor não pode cair silenciosamente nos arquivos.
33. **`MOSTRAR_EXEMPLOS`:** sem a variável, ou com `true`, as fictícias aparecem. Com `false`, as fictícias somem de **todos** os métodos:
    - `list()` (incluindo `total` e `totalPaginas`);
    - os filtros por editoria e tag;
    - `getBySlug(<slug de fictícia>)`, que devolve `null`;
    - `search()`;
    - os totais de `listEditorias()`;
    - `listTags()`, onde uma tag usada só por fictícias desaparece.
    
    Qualquer outro valor (ex.: `nao`, `0`) → erro que cita `MOSTRAR_EXEMPLOS`. Teste com fixtures que misturam reais e fictícias. *(Teste obrigatório do plano.)*
34. O carregamento com o conteúdo real do repositório (`content/materias/` + `content/tags.json`, com as variáveis padrão) roda sem erro e lista as 8 matérias de exemplo. É o único teste que lê `content/`.

### G. Markdown e tempo de leitura
35. **`renderMarkdown(md): Promise<string>`** converte o markdown do corpo em HTML: intertítulos `##`/`###` → `<h2>`/`<h3>`, parágrafos, listas, citações, ênfase, negrito e links.
36. **HTML perigoso é sanitizado:** `renderMarkdown('<script>alert(1)</script><img src=x onerror=alert(1)>')` devolve um HTML sem `<script` e sem `onerror` (busca sem diferenciar maiúsculas). *(Teste obrigatório do plano.)* Também saem:
    - `<iframe>`, `<style>` e `<object>`;
    - atributos `on*` em qualquer tag (`<p onclick=…>`);
    - links `javascript:` (`[x](javascript:alert(1))` e `<a href="JaVaScRiPt:…">`), que ficam sem `href` executável.
37. **Sem transformação tipográfica:** o texto visível do HTML (sem as tags) é idêntico ao texto do markdown. Aspas retas `"` não viram curvas, `--` não vira travessão, `...` não vira `…`, e os números e espaços não mudam. O teste usa a fixture do critério 17 e compara o texto extraído do HTML com o texto esperado, ignorando só a marcação markdown (`##`, `**`, `>`).
38. **`readingTime(md): number`** usa 200 palavras por minuto, arredonda para cima e tem mínimo 1:
    - um texto de **1.360 palavras → 7** *(teste obrigatório do plano)*;
    - 200 palavras → 1;
    - 201 → 2;
    - `""` → 1;
    - só espaços → 1.
    
    A marcação markdown não conta como palavra: `"## Intertítulo"` conta 1 palavra, e `"**Gol** de *placa*"` conta 3.

### H. Matérias de exemplo
39. Existem **8** arquivos em `content/materias/`, todos válidos pelo schema. Cada um tem:
    - `ficticio: true`;
    - `origem` vazio ou ausente;
    - `autor: Squad Fut`;
    - `publicado_em` **anterior a 2026-11-01**, com 8 datas distintas.
40. **Só gente e clubes inventados:** clubes, jogadores, técnicos, dirigentes, estádios e competições são todos inventados. Nenhum clube, competição ou pessoa real é citado no frontmatter nem no corpo (ex.: nada de PSG, Flamengo, Champions League, Ligue 1 ou Brasileirão). As tags também são de entidades inventadas. O code-reviewer confere lendo os 8 arquivos.
41. **Variedade** (para servir às histórias 3 a 6):
    - pelo menos **5** das 7 editorias, com pelo menos uma editoria que tenha 2 ou mais matérias;
    - pelo menos 3 tags que aparecem em 2 ou mais matérias;
    - pelo menos 1 tag **ausente** do `tags.json`, cujo rótulo humanizado fica bom;
    - corpos com tamanhos diferentes: pelo menos um com 1.000 palavras ou mais, e um com menos de 400;
    - pelo menos um corpo com intertítulos `##`, um com citação (`>`) e um com lista;
    - pelo menos um título com mais de 100 caracteres, para o teste de quebra de linha das telas em 320px;
    - pelo menos uma matéria com um termo acentuado no título ou no corpo (ex.: um clube "São …" inventado), para a busca da história 6.
42. Os corpos **não** começam com o título nem com a linha fina (eles ficam no frontmatter, spec 6.2) e não têm `#` (h1).
    - **h1 no corpo é erro de carregamento (decisão do usuário 2):** um intertítulo de nível 1 no corpo (`# Título`, o h1 sublinhado com `===` ou um `<h1>` em HTML) faz o carregamento falhar com um erro que cita o **nome do arquivo** e a **linha no arquivo** (contando o frontmatter). O texto nunca é reescrito nem rebaixado.
    - Um `#` dentro de bloco de código (cercado por ` ``` ` ou indentado), dentro de código em linha ou no meio de uma linha (`#1 do ranking`) **não** é h1 e não gera erro.
43. `content/tags.json` traz o rótulo das tags dos exemplos cujo humanizado ficaria ruim (siglas, nomes com acento: `ec-sao-joao` → `"EC São João"`).

### I. Rascunho da migração Supabase
44. Existe `supabase/migrations/0001_articles.sql`. Ele começa com um comentário que diz que é um **rascunho de documentação, não executado na v1**, e cita a spec 6.3.
45. O rascunho cria a tabela `articles` com:
    - os campos da spec 6.2 (mesmos nomes do frontmatter);
    - `corpo_md`, `id uuid` (chave primária) e `created_at`;
    - `slug` único;
    - restrição (`check`) de `editoria` com os 7 slugs;
    - `ficticio` obrigatório;
    - um índice full-text com configuração `portuguese`, cobrindo título, linha fina e corpo.
46. Nenhum script do `package.json`, teste ou código chama esse arquivo, e nenhuma dependência de Supabase é instalada.

### J. Escopo e portões
47. **Sem UI nova:** nenhuma página ou componente em `src/app/` ou `src/components/` passa a usar o repositório nesta história. O build gera as mesmas rotas de antes (`/` e `/_not-found`, estáticas), e o número de testes e2e é o mesmo da `main` (hoje 136).
48. Todos os testes obrigatórios do plano existem e passam, cada um identificável pelo nome do teste:
    - editoria fora do enum → erro com o nome do arquivo (critério 6);
    - `list()` em ordem decrescente de data (20);
    - filtros por editoria (21) e por tag (22);
    - paginação (23);
    - `getBySlug` inexistente → `null` (24);
    - `MOSTRAR_EXEMPLOS=false` esconde as fictícias (33);
    - `ligue-1` → `Ligue 1` (30);
    - `renderMarkdown` sem `<script>` e sem `onerror` (36);
    - `readingTime` com 1.360 palavras → 7 (38).
49. Os 5 portões ficam verdes na branch `feat/02-camada-de-conteudo`, e o resultado vai para o "Relatório de QA" desta história:
    - `npm run lint`: 0 erros e 0 avisos;
    - `npm run typecheck`;
    - `npm test`;
    - `npm run test:e2e`;
    - `npm run build`.
50. Nenhum `.env*` é commitado. Se o arquiteto quiser documentar `CONTENT_SOURCE` e `MOSTRAR_EXEMPLOS`, faz isso no `README.md` (nome, valores aceitos e padrão).

## Fora de escopo
- Páginas, rotas e componentes:
  - matéria `/materias/[slug]` e `generateStaticParams` (história 3);
  - capa com destaque e o critério "fictícia nunca no destaque" (história 4);
  - `/editorias/[editoria]`, `/tags/[tag]`, `sitemap.xml` e `robots.txt` (história 5);
  - `/busca` e o campo de busca no cabeçalho (história 6).
- Selo "Exemplo", aviso de conteúdo fictício e `noindex` na interface (histórias 3 a 5). Aqui só existe o dado `ficticio`.
- Metadados de SEO, Open Graph e JSON-LD (história 3).
- Formatação da data por extenso em pt-BR (história 3).
- `SupabaseArticleRepository`, cliente ou dependência Supabase, execução da migração e deploy.
- Atualizar o diagramador do squad-fut e publicar a matéria do PSG (história 8).
- Rebaixar ou reescrever qualquer trecho de texto editorial.

## Dúvidas para o usuário (respondidas; ver "Decisões do usuário")
1. **`search()` entra agora ou na história 6?** A interface da spec 6.3 inclui `search()`, então o repositório de arquivos precisa ter o método para compilar.
   - (A) **Recomendado:** implementar a busca completa aqui, sem diferenciar acentos nem maiúsculas (critério 28), com testes de unidade. A história 6 fica com a rota, o campo no cabeçalho, os estados vazios e os e2e. O repositório nasce completo, e a história 6 fica só de tela.
   - (B) Aqui o método existe, mas lança "não implementado". A busca inteira fica na história 6, como diz o "Foco de revisão" do plano.
   - (C) Implementar uma busca simples aqui (só minúsculas) e a normalização de acentos na história 6.
2. **E se o corpo de uma matéria tiver um `# Título` (h1)?** Isso quebraria a regra de um único `h1` por página.
   - (A) **Recomendado:** o carregamento falha com um erro que cita o arquivo e a linha. Pela spec, o corpo vem sem o título, então um `#` indica que o diagramador esqueceu de tirá-lo. O texto não é alterado, e o erro aparece antes de publicar.
   - (B) `renderMarkdown` rebaixa `h1` para `h2` sem avisar. O texto fica igual, mas a hierarquia muda em silêncio.
   - (C) Não tratar agora, e a história 3 decide.
3. **`origem` é obrigatória nas matérias reais?**
   - (A) **Recomendado:** sim. Com `ficticio: false`, `origem` é obrigatória e não pode ser vazia (erro com o nome do arquivo). Com `ficticio: true`, `origem` fica vazia ou ausente. Isso garante o rastro até a pasta do squad-fut e ajuda o review a conferir o corpo na história 8.
   - (B) Opcional sempre, como está no exemplo da spec.
   - (C) Opcional sempre, mas com um aviso no carregamento quando faltar numa matéria real.

## Decisões do usuário (2026-11-19)
1. **`search()`: opção A.** A busca completa entra nesta história, sem diferenciar acentos nem maiúsculas, com testes de unidade. A história 6 fica com a rota, a UI (campo no cabeçalho, estados vazios) e os e2e. Critério ajustado: 28.
2. **h1 (`# Título`) no corpo: opção A.** É erro no carregamento, com o nome do arquivo e a linha. O texto nunca é reescrito. Critério ajustado: 42.
3. **`origem`: opção A.** Obrigatória e não vazia quando `ficticio: false`; vazia ou ausente nas fictícias. Critério ajustado: 5 (o 39 já estava coerente).

## Referências
- `CLAUDE.md`: Regras do projeto (regra do repositório, texto imutável, matérias fictícias, caixa de entrada) e Portões de qualidade.
- Spec `docs/superpowers/specs/2026-11-19-blog-fut-design.md`:
  - 2 (antiobjetivos);
  - 6.1 (zod, sanitização);
  - 6.2 (modelo de conteúdo, taxonomias, matérias de exemplo, `MOSTRAR_EXEMPLOS`);
  - 6.3 (`ArticleRepository`, `CONTENT_SOURCE`, migração);
  - 7 (caixa de entrada);
  - 12 (tamanho da paginação a critério do time).
- Plano `docs/superpowers/plans/2026-11-19-blog-fut-v1.md`: Restrições globais, Foco de revisão (itens 1 a 3) e História 2.
- `src/lib/editorias.ts` e `tests/unit/editorias.test.ts`: a lista fechada de editorias, que deve ser reaproveitada.
- `.gitignore`: `content/entrada/` fora do git.
- ADR 0003 (`docs/adr/0003-prefixo-underscore-no-lint.md`): a convenção do `_` vale para parâmetros de contrato ainda não usados.

## Notas técnicas (arquiteto, 2026-11-19)

**ADRs desta história:**
- `docs/adr/0004-pipeline-de-markdown-e-sanitizacao.md`: unified + rehype-raw + rehype-sanitize, sem plugins tipográficos, e h1 detectado pela árvore do markdown.
- `docs/adr/0005-frontmatter-e-leitura-do-conteudo.md`: `yaml` com esquema core em vez de gray-matter, data como texto, leitura síncrona memorizada e `server-only` sem pacote.

**Docs do Next 16 consultadas:**
- `node_modules/next/dist/docs/01-app/01-getting-started/08-caching.md` ("Predictable values", "Prerendering", "Bots and crawlers"): `readFileSync` termina dentro do prerender; `await readFile()` no render exigiria `use cache` ou `<Suspense>`.
- `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md` ("Preventing environment poisoning"): `import "server-only"` sem instalar o pacote.
- `node_modules/next/types/global.d.ts:57`: o tipo de `server-only`.
- `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/output.md`: `outputFileTracingIncludes`, pendência da história 3.

### 1. Dependências
Instalar com **npm** (o projeto usa `package-lock.json`), todas em `dependencies` e com versão exata:

```
npm install --save-exact zod@4.6.7 yaml@2.8.3 unified@11.0.5 remark-parse@11.0.0 remark-rehype@11.1.2 rehype-raw@7.0.0 rehype-sanitize@6.0.0 rehype-stringify@10.0.1
```

| Pacote | Versão | Motivo |
|---|---|---|
| `zod` | 4.6.7 | Validação do frontmatter (spec 6.1). É a versão que já está no `package-lock.json` como transitiva; agora passa a ser declarada. |
| `yaml` | 2.8.3 | Parser do frontmatter com esquema YAML 1.2 core: a data continua texto, chave duplicada é erro e o erro traz a linha (ADR 0005). A 2.8.3 corrige a GHSA-48c2-rrv3-qjmp da 2.8.1. |
| `unified` | 11.0.5 | Orquestra o pipeline de markdown (ADR 0004). |
| `remark-parse` | 11.0.0 | Markdown CommonMark → mdast. Também é usado para achar o h1 sem pegar código. |
| `remark-rehype` | 11.1.2 | mdast → hast, com `allowDangerousHtml: true`. |
| `rehype-raw` | 7.0.0 | Interpreta o HTML cru, para sanitizar sem apagar o texto que está dentro dele. |
| `rehype-sanitize` | 6.0.0 | Sanitização com o `defaultSchema` ajustado. |
| `rehype-stringify` | 10.0.1 | hast → texto HTML. |

**Não instalar:** `gray-matter`, `server-only` (o Next trata o import), `remark-gfm`, `remark-smartypants` e qualquer pacote `@supabase/*`. Também não instalar utilitários de árvore (`unist-util-visit`, `hast-util-to-text`, `mdast-util-to-string`): a travessia é uma função recursiva de poucas linhas, e o código não importa tipos de pacotes transitivos (`mdast`, `hast`). Para o nó do mdast, usar um tipo estrutural local.

Se o npm acusar que alguma versão exata não existe, o dev para e avisa o orquestrador, sem trocar por outra versão por conta própria.

### 2. Arquivos

**Criar em `src/lib/content/`.** São os 7 módulos do critério 1 mais os internos, cada um com uma responsabilidade:

| Arquivo | Responsabilidade | Público? |
|---|---|---|
| `types.ts` | `Article`, `ArticleSummary`, `EditoriaRef`, `TagRef`, `Taxonomy`, `Paginated<T>`, `DataISO`. Só tipos. | sim (via `index.ts`) |
| `repository.ts` | Interface `ArticleRepository`, `ListOptions`, `TAMANHO_PADRAO_DA_PAGINA`. | sim |
| `errors.ts` | `ContentError` e os formatadores de mensagem. | não |
| `schema.ts` | Schema zod do frontmatter, regex de slug e data, regra da `origem`, formatação dos problemas do zod. | não |
| `frontmatter.ts` | Separa o frontmatter do corpo (sem alterar o corpo) e faz o parse do YAML. | não |
| `markdown.ts` | `renderMarkdown` (pipeline sanitizado) e `encontrarLinhasDeH1`. | `renderMarkdown` sim |
| `reading-time.ts` | `contarPalavras` e `readingTime`. | `readingTime` sim |
| `tags.ts` | Leitura do `tags.json`, humanização e resolvedor de rótulo com aviso. | não |
| `search.ts` | Normalização de texto e correspondência da busca. | não |
| `parse-article.ts` | Um arquivo (nome + conteúdo) → `Article` validado. É puro, sem `fs`. | não |
| `catalog.ts` | Consultas puras em memória: ordem, filtros, paginação, busca, taxonomias e slug duplicado. | não |
| `config.ts` | Lê e valida `CONTENT_SOURCE` e `MOSTRAR_EXEMPLOS`. | não |
| `file-repository.ts` | `import "server-only"`. É o **único** arquivo com `node:fs`: lê o disco uma vez e delega ao `catalog.ts`. | não |
| `index.ts` | Porta pública: `getRepository()`, `renderMarkdown`, `readingTime` e os tipos. | sim |

**Criar fora de `src/`:**
- `content/materias/*.md` (8 exemplos) e `content/tags.json`.
- `supabase/migrations/0001_articles.sql`.
- `tests/stubs/server-only.ts`, com o conteúdo `export {};`.
- `tests/fixtures/content/**` (seção 5).
- Os testes da seção 6.

**Modificar:**
- `vitest.config.ts`: acrescentar em `resolve.alias` a entrada `"server-only": fileURLToPath(new URL("./tests/stubs/server-only.ts", import.meta.url))`.
- `.prettierignore`: acrescentar `tests/fixtures` e `supabase`. O `content` e o `docs` já estão lá. O Prettier reescreveria `*x*` como `_x_` e quebraria a imutabilidade do texto.
- `package.json` e `package-lock.json`: as dependências da seção 1.
- `README.md`: uma seção "Variáveis de ambiente" com `CONTENT_SOURCE` (aceita `files`; padrão `files`; qualquer outro valor é erro) e `MOSTRAR_EXEMPLOS` (aceita `true`/`false`; padrão `true`; **vale no build**, porque as páginas são estáticas).

**Não tocar:** `src/app/**`, `src/components/**`, `src/lib/editorias.ts` e `next.config.ts` (o `outputFileTracingIncludes` fica para a história 3, conforme o ADR 0005).

### 3. Contratos (assinaturas exatas)

`types.ts`
```ts
import type { Editoria } from "@/lib/editorias";

/** Data de calendário "AAAA-MM-DD", sem fuso. Nunca vira Date nesta camada. */
export type DataISO = string;

export interface EditoriaRef { readonly slug: Editoria; readonly rotulo: string }
export interface TagRef { readonly slug: string; readonly rotulo: string }

export interface ArticleSummary {
  readonly slug: string;
  readonly titulo: string;
  readonly linha_fina: string;
  readonly editoria: EditoriaRef;
  readonly tags: readonly TagRef[];
  readonly publicado_em: DataISO;
  readonly autor: string;
  readonly ficticio: boolean;
  /** Minutos, calculado por readingTime(corpo_md). Não existe no frontmatter. */
  readonly tempo_de_leitura: number;
}

export interface Article extends ArticleSummary {
  readonly titulo_seo: string | null;
  readonly meta_description: string | null;
  readonly palavras_chave: readonly string[];
  /** null nas fictícias; texto não vazio nas reais. */
  readonly origem: string | null;
  /** Corpo exatamente como no arquivo (critério 17). */
  readonly corpo_md: string;
}

export interface Taxonomy { readonly slug: string; readonly rotulo: string; readonly total: number }

export interface Paginated<T> {
  readonly itens: readonly T[];
  readonly pagina: number;
  readonly totalPaginas: number;
  readonly total: number;
}
```
Os nomes seguem o frontmatter e as colunas da migração (`snake_case`), para que o futuro `SupabaseArticleRepository` mapeie linha por linha. Todos os valores são serializáveis (texto, número, booleano, arrays), então podem ir como props para Client Components e sair de um `use cache`.

`repository.ts`
```ts
import type { Article, ArticleSummary, Paginated, Taxonomy } from "./types";

export const TAMANHO_PADRAO_DA_PAGINA = 12;

export interface ListOptions { editoria?: string; tag?: string; page?: number; pageSize?: number }

export interface ArticleRepository {
  list(opts?: ListOptions): Promise<Paginated<ArticleSummary>>;
  getBySlug(slug: string): Promise<Article | null>;
  search(query: string): Promise<ArticleSummary[]>;
  listEditorias(): Promise<Taxonomy[]>;
  listTags(): Promise<Taxonomy[]>;
}
```

`errors.ts`
```ts
export class ContentError extends Error {}   // no construtor: this.name = "ContentError"
/** Uma linha por problema: `${arquivo}: ${problema}`. */
export function erroNoArquivo(arquivo: string, problemas: readonly string[]): ContentError;
/** Junta erros de vários arquivos. Cabeçalho "Conteúdo inválido em content/ (N problema(s)):" e depois as linhas. */
export function juntarErros(erros: readonly ContentError[]): ContentError;
```

`schema.ts`
```ts
import { z } from "zod";
export const SLUG_REGEX: RegExp;           // /^[a-z0-9]+(?:-[a-z0-9]+)*$/
export const DATA_REGEX: RegExp;           // /^\d{4}-\d{2}-\d{2}$/
export function isDataDeCalendario(valor: string): boolean; // regex + ida e volta por Date.UTC (2026-02-30 → false)
export const frontmatterSchema;            // z.strictObject({...}).superRefine(regra da origem)
export type Frontmatter = z.output<typeof frontmatterSchema>;
/** Converte cada issue em "campo \"x\": <motivo> (recebido: <valor>)", lendo o valor em `dados` pelo `issue.path`. */
export function formatarProblemas(erro: z.ZodError, dados: unknown): string[];
```
Campos do `z.strictObject` (um campo desconhecido gera o issue `unrecognized_keys`, e a mensagem cita a chave):

| Campo | Regra |
|---|---|
| `slug` | `z.string().regex(SLUG_REGEX)` |
| `titulo`, `linha_fina`, `autor` | texto não vazio: `z.string().refine(s => s.trim() !== "")`, **sem `.trim()` transformador** (o valor sai igual) |
| `titulo_seo`, `meta_description` | texto não vazio, `.nullish()` |
| `editoria` | `z.enum(SLUGS_DE_EDITORIA)` (import de `@/lib/editorias`; nenhum slug literal) |
| `tags` | `z.array(z.string().regex(SLUG_REGEX)).min(1)` + refine "tag repetida: x" |
| `palavras_chave` | `z.array(texto não vazio).nullish()` |
| `publicado_em` | `z.string().regex(DATA_REGEX).refine(isDataDeCalendario)` |
| `ficticio` | `z.boolean()` (sem default) |
| `origem` | `z.string().nullish()` + `superRefine`: se `ficticio === false`, precisa de texto não vazio; se `true`, precisa ser `null`, `undefined` ou `""`. Os dois casos geram um issue em `path: ["origem"]`. |

A mensagem de `editoria` lista os valores aceitos a partir de `SLUGS_DE_EDITORIA.join(", ")`, em tempo de execução.

`frontmatter.ts`
```ts
export interface ArquivoSeparado {
  readonly dados: unknown;               // resultado do YAML
  readonly corpo: string;                // tudo depois do "---" de fechamento, menos 1 quebra de linha
  readonly linhaInicialDoCorpo: number;  // linha (1-based) do arquivo onde está a 1ª linha do corpo
}
export function separarFrontmatter(arquivo: string, conteudo: string): ArquivoSeparado; // lança ContentError
```
- O BOM inicial (`﻿`) é descartado. A 1ª linha precisa ser `---`; se não for, o erro é "frontmatter ausente".
- O fechamento é a 1ª linha seguinte igual a `---` (com `\r` opcional antes do `\n`, ou no fim do arquivo); sem ela, o erro é "frontmatter sem `---` de fechamento".
- O YAML é lido com `parse(texto, { schema: "core", uniqueKeys: true, prettyErrors: true })` do pacote `yaml`. Um `YAMLParseError` vira `erroNoArquivo(arquivo, ["YAML inválido na linha N: <motivo>"])`, com `N = err.linePos[0].line + 1` (o `+1` é a linha do `---` de abertura).
- Se o YAML não for um objeto (vazio, lista, texto), o erro é "frontmatter precisa ser um objeto".
- Com `k` linhas de YAML, `linhaInicialDoCorpo = k + 3`.

`markdown.ts`
```ts
export async function renderMarkdown(md: string): Promise<string>;
/** Linhas (1-based, relativas ao `md`) de cada h1: heading depth 1 (ATX ou setext) e nó html com /<h1[\s>/]/i. Ignora code e inlineCode. */
export function encontrarLinhasDeH1(md: string): number[];
```
O processador fica no escopo do módulo: `unified().use(remarkParse).use(remarkRehype, { allowDangerousHtml: true }).use(rehypeRaw).use(rehypeSanitize, ESQUEMA).use(rehypeStringify)`. Internamente, `renderMarkdown` usa `processSync` e devolve `String(file)` (ADR 0004). O `ESQUEMA` parte do `defaultSchema`: `tagNames` sem `"h1"` e `strip` = `[...(defaultSchema.strip ?? []), "style", "iframe", "object", "embed", "noscript", "template"]`. `encontrarLinhasDeH1` usa só `unified().use(remarkParse).parse(md)` e percorre `children` recursivamente.

`reading-time.ts`
```ts
export const PALAVRAS_POR_MINUTO = 200;
/** Tokens separados por espaço em branco que contenham ao menos uma letra ou dígito (/[\p{L}\p{N}]/u). */
export function contarPalavras(md: string): number;
export function readingTime(md: string): number; // Math.max(1, Math.ceil(contarPalavras(md) / 200))
```
Com essa regra, `##`, `>`, `-` e `—` soltos não contam; `**Gol**` conta 1; `1,5` conta 1. É síncrono e independe do pipeline de markdown.

`tags.ts`
```ts
export type RotulosDeTags = Readonly<Record<string, string>>;
export type Aviso = (mensagem: string) => void;
export function humanizarTag(slug: string): string;
/** JSON.parse + z.record(z.string().regex(SLUG_REGEX), texto não vazio). Qualquer falha → ContentError citando "tags.json". */
export function lerRotulosDeTags(json: string): RotulosDeTags;
/** Rótulo do tags.json ou humanizado. Avisa **uma vez por slug** por resolvedor. */
export function criarResolvedorDeRotulos(rotulos: RotulosDeTags, avisar: Aviso): (slug: string) => string;
```
- **Humanização:** separa no `-`. A 1ª palavra sempre começa com maiúscula (`toLocaleUpperCase("pt-BR")` no 1º caractere). As demais também, **exceto os conectivos** `a, as, o, os, e, de, da, das, do, dos, em, na, nas, no, nos`, que ficam minúsculos. Os dígitos ficam como estão. Exemplos: `ligue-1` → `Ligue 1`; `copa-do-litoral` → `Copa do Litoral`; `de-virada` → `De Virada`.
- **Aviso** (texto exato): `` `[conteúdo] tag "${slug}" sem rótulo em content/tags.json; usando "${rotulo}".` ``

`search.ts`
```ts
/** NFD → remove marcas (\p{M}) → toLocaleLowerCase("pt-BR") → colapsa \s+ em " " → trim. */
export function normalizarParaBusca(texto: string): string;
/** Normaliza e quebra em termos; "" ou só espaços → []. */
export function termosDaBusca(query: string): string[];
/** Texto normalizado de título + linha fina + cada tag (slug com "-" trocado por " " e rótulo) + corpo_md, separados por "\n". */
export function textoBuscavel(artigo: Article): string;
/** Verdadeiro se **todos** os termos aparecem como substring (E lógico, como o websearch_to_tsquery do Postgres). */
export function correspondeABusca(textoNormalizado: string, termos: readonly string[]): boolean;
```
`"São Paulo"`, `"SAO PAULO"` e `"sao   paulo"` viram os termos `["sao", "paulo"]`. `ç` vira `c`.

`parse-article.ts`
```ts
import type { Article } from "./types";
export interface ArtigoCarregado { readonly arquivo: string; readonly artigo: Article }
/** `arquivo` é o nome do arquivo ("x.md"). Puro: não lê disco. Junta todos os problemas do arquivo num único ContentError. */
export function parseArticleFile(
  arquivo: string,
  conteudo: string,
  rotuloDaTag: (slug: string) => string,
): ArtigoCarregado;
```
A ordem é esta:
1. `separarFrontmatter`.
2. `frontmatterSchema.safeParse`.
3. Conferir `slug === arquivo` sem `.md` (problema: `slug "b" diferente do nome do arquivo "a.md"`).
4. `encontrarLinhasDeH1(corpo)` → `h1 (# título) na linha ${linhaInicialDoCorpo + l - 1}; o título fica no frontmatter`.
5. Montar o `Article` (`editoria.rotulo` vem de `rotuloDaEditoria`; `tempo_de_leitura` de `readingTime(corpo)`; `titulo_seo`, `meta_description` e `origem` usam `?? null`, com `""` virando `null` na `origem`; `palavras_chave` usa `?? []`) e congelar com `Object.freeze` (o objeto, `editoria`, `tags`, cada tag e `palavras_chave`).

`catalog.ts`
```ts
export interface Catalogo {
  readonly artigos: readonly Article[];              // só os visíveis, já ordenados
  readonly porSlug: ReadonlyMap<string, Article>;
  readonly busca: ReadonlyMap<string, string>;       // slug → textoBuscavel
}
/** Lança ContentError citando os dois arquivos se houver slug repetido (antes do filtro de fictícias). */
export function montarCatalogo(carregados: readonly ArtigoCarregado[], opcoes: { readonly mostrarExemplos: boolean }): Catalogo;
/** publicado_em decrescente; empate → slug crescente. */
export function compararArtigos(a: ArticleSummary, b: ArticleSummary): number;
/** Cópia sem titulo_seo, meta_description, palavras_chave, origem e corpo_md (cards não carregam o corpo). */
export function paraResumo(artigo: Article): ArticleSummary;
export function listar(catalogo: Catalogo, opts?: ListOptions): Paginated<ArticleSummary>;
export function obterPorSlug(catalogo: Catalogo, slug: string): Article | null;
export function buscar(catalogo: Catalogo, query: string): ArticleSummary[];
export function contarEditorias(catalogo: Catalogo): Taxonomy[];
export function contarTags(catalogo: Catalogo): Taxonomy[];
```

`config.ts`
```ts
export type Ambiente = Readonly<Record<string, string | undefined>>;
export interface ContentConfig { readonly source: "files"; readonly mostrarExemplos: boolean }
export function lerConfiguracao(env: Ambiente): ContentConfig;
```

`file-repository.ts`
```ts
import "server-only";
export interface FileRepositoryOptions {
  readonly contentDir: string;          // pasta que contém materias/ e tags.json
  readonly mostrarExemplos: boolean;
  readonly avisar?: Aviso;              // padrão: console.warn
}
/** Lê tags.json (opcional) e materias/*.md; junta os erros de todos os arquivos. */
export function carregarArtigosDoDisco(contentDir: string, avisar: Aviso): ArtigoCarregado[];
export class FileArticleRepository implements ArticleRepository {
  constructor(opcoes: FileRepositoryOptions);
  // os 5 métodos da interface; cada um faz `const c = this.catalogo()` e delega ao catalog.ts
}
```
O `catalogo()` é privado e memorizado na instância: carrega na 1ª chamada. Uma falha não é memorizada, então a próxima chamada tenta de novo e lança o mesmo erro.

`index.ts`
```ts
export function getRepository(): ArticleRepository;
export { renderMarkdown } from "./markdown";
export { readingTime } from "./reading-time";
export type { Article, ArticleSummary, EditoriaRef, TagRef, Taxonomy, Paginated, DataISO } from "./types";
export type { ArticleRepository, ListOptions } from "./repository";
```
`getRepository()` faz `lerConfiguracao(process.env)` **a cada chamada** (um erro de variável sempre aparece) e cria `new FileArticleRepository({ contentDir: path.join(process.cwd(), "content"), mostrarExemplos })`. Em `NODE_ENV === "production"`, guarda uma instância por valor de `mostrarExemplos` num `Map` de módulo; fora de produção, devolve uma instância nova. A função é **síncrona** e não lê o disco: o conteúdo só é lido quando um método é chamado.

### 4. Regras de comportamento
- **Tamanho padrão da página: 12** (`TAMANHO_PADRAO_DA_PAGINA`). Fecha a grade em 1, 2, 3 ou 4 colunas.
- **Validação de `list()`:** `page` e `pageSize`, quando presentes, precisam satisfazer `Number.isInteger(v) && v >= 1`. Se não satisfizerem, `RangeError` com a mensagem `` `list(): "page" precisa ser um inteiro ≥ 1 (recebido: ${v})` `` (idem para `pageSize`). Não há teto para `pageSize`.
- **Paginação:** `total` = matérias depois dos filtros; `totalPaginas = Math.ceil(total / pageSize)` (0 quando `total` é 0); `pagina` repete a página pedida, mesmo fora do intervalo; `itens = filtrados.slice((page-1)*pageSize, page*pageSize)`.
- **Filtros:** comparação exata de texto com `artigo.editoria.slug` e com `tags.some(t => t.slug === tag)`. Valor desconhecido → lista vazia, sem erro e sem validar contra `isEditoria`.
- **`getBySlug`:** se `!SLUG_REGEX.test(slug)`, devolve `null` sem consultar nada. Senão, `porSlug.get(slug) ?? null`. Nenhum caminho é montado com o argumento.
- **`listEditorias`:** `EDITORIAS.map(e => ({ slug: e.slug, rotulo: e.rotulo, total }))`, contando só as visíveis.
- **`listTags`:** só as tags com `total > 0` entre as visíveis; ordem `total` decrescente e, no empate, `new Intl.Collator("pt-BR").compare(a.rotulo, b.rotulo)`.
- **`search`:** `termosDaBusca(query)` vazio → `[]`. Senão, filtra `catalogo.artigos` (já ordenado) por `correspondeABusca(busca.get(slug), termos)` e devolve os resumos.
- **`MOSTRAR_EXEMPLOS`:** `undefined` → `true`; `"true"` → `true`; `"false"` → `false`; qualquer outro valor (inclusive `""`) → `Error` com a mensagem `` `MOSTRAR_EXEMPLOS inválido: "${v}". Use "true" ou "false".` ``. O filtro é aplicado **uma vez**, em `montarCatalogo`, então todos os métodos herdam o filtro de graça. Todos os arquivos são validados mesmo com `false`: uma fictícia inválida também quebra.
- **`CONTENT_SOURCE`:** `undefined` ou `"files"` → arquivos; qualquer outro valor (`"supabase"`, `"FILES"`, `""`, `"  "`) → `Error` com a mensagem `` `CONTENT_SOURCE inválido: "${v}". Valores aceitos: files.` ``.
- **Pasta `materias/` inexistente** → `ContentError` ("pasta content/materias não encontrada"). Ela sempre existe no repositório (`.gitkeep`), então a ausência indica um deploy sem o conteúdo. Já o `tags.json` ausente → `{}`, sem erro (critério 31).
- **Leitura:** `readdirSync(dir, { withFileTypes: true })`, só `isFile() && name.endsWith(".md")`, com os nomes ordenados (os erros saem em ordem estável) e `readFileSync(caminho, "utf8")`. Nunca ler `entrada/`.
- **Detecção do h1 sem pegar código:** pela árvore do `remark-parse` (ADR 0004). `#` em bloco cercado, bloco indentado ou código em linha vira nó `code`/`inlineCode`, que não é visitado como heading. `#1 do ranking` não é heading em CommonMark. A linha reportada é `linhaInicialDoCorpo + position.start.line - 1`.

### 5. Fixtures de teste
```
tests/fixtures/content/
  basico/
    tags.json                  {"fc-aurora":"FC Aurora","sao-paulo-do-vale":"São Paulo do Vale"}
    materias/
      .gitkeep
      notas.txt                (ignorado, critério 14)
      alfa-cronica.md
      bravo-analise.md
      charlie-cronica.md
      delta-noticia.md
      eco-perfil.md
    entrada/
      fantasma-entrada.md      (válido, com tag "fantasma"; nunca pode aparecer)
  vazio/
    materias/.gitkeep          (sem tags.json)
  editoria-invalida/
    materias/materia-invalida.md   (editoria: opiniao; o resto válido)
  tags-malformado/
    tags.json                  ({"fc-aurora": 1})
    materias/.gitkeep
```

| Arquivo (`basico`) | `publicado_em` | `editoria` | `tags` | `ficticio` | Observação |
|---|---|---|---|---|---|
| `alfa-cronica.md` | 2026-10-20 | cronica | `[fc-aurora, copa-do-litoral]` | false | corpo = `CORPO_TIPOGRAFICO` (critérios 17 e 37) |
| `bravo-analise.md` | 2026-10-10 | analise | `[fc-aurora, ligue-1]` | false | `ligue-1` fora do `tags.json` (critério 30); corpo com um `# não é título` dentro de bloco cercado |
| `charlie-cronica.md` | 2026-10-10 | cronica | `[sao-paulo-do-vale]` | true | título com "São Paulo do Vale" (busca); empata na data com o bravo |
| `delta-noticia.md` | 2026-10-01 | noticia | `[fc-aurora]` | false | |
| `eco-perfil.md` | 2026-09-15 | perfil | `[liga-da-serra]` | true | tag só de fictícia (critério 33) |

- Ordem esperada (critério 20): alfa, bravo, charlie (empate resolvido pelo slug), delta, eco.
- As reais têm `origem: squad-fut/textos/<algo>`. As fictícias não têm `origem`.
- Com `MOSTRAR_EXEMPLOS=false`: alfa, bravo e delta; `cronica` total 1; `sao-paulo-do-vale` e `liga-da-serra` somem de `listTags`.
- `listTags` padrão: `FC Aurora` (3), depois os de total 1 por rótulo pt-BR (`Copa do Litoral`, `Liga da Serra`, `Ligue 1`, `São Paulo do Vale`).
- **`CORPO_TIPOGRAFICO`:** constante exportada por `tests/unit/content/helpers/corpo-tipografico.ts`, junto com `LINHAS_VISIVEIS_ESPERADAS: string[]`. O arquivo `alfa-cronica.md` contém exatamente esse texto depois do frontmatter. O texto inclui: aspas curvas, aspas retas, `—`, `...`, `--`, `1,5`, **espaços duplos no meio de uma linha** (nunca no fim, que em CommonMark vira `<br>`), um `## Intertítulo`, uma citação `>`, uma lista `-`, `**negrito**` e uma linha final em branco.
- Os **casos inválidos de schema** não viram arquivos: são strings montadas em `tests/unit/content/helpers/materia.ts` com `montarMateria(overrides?: Record<string, unknown> | null, corpo?: string): string`, que serializa um frontmatter válido (com `stringify` do `yaml`) e aplica os overrides (o valor `undefined` remove o campo). O CRLF também é testado assim (o `.gitattributes` normaliza os arquivos para LF).

### 6. Testes por critério
Os testes de unidade vão em `tests/unit/content/`, e os de integração (que leem fixtures do disco) em `tests/integration/content/`. Os nomes marcados com ★ são os obrigatórios do plano (critério 48) e devem ser usados **literalmente**.

| Critério | Arquivo | Nome do teste: o que afirma |
|---|---|---|
| 1, 2, 18 | `tests/unit/content/index.test.ts` | "a porta pública exporta getRepository, renderMarkdown e readingTime": `typeof` de cada um é `function`. A implementação da interface é provada pelo `implements` no `typecheck`. |
| 3, 4, 46 | `tests/unit/regra-do-repositorio.test.ts` | "nenhum arquivo fora de src/lib/content importa fs" (regex de `from`, `require(` e `import(` com `fs`, `node:fs`, `fs/promises` e `node:fs/promises`); "nenhum arquivo fora de src/lib/content monta caminho para content/" (regex `/(["'\`])(?:\.{1,2}\/)*content(?:\/\|\1)/`, que não pega `@/lib/content`); "src/lib/content não repete os slugs de editoria" (nenhum `"<slug>"` de `SLUGS_DE_EDITORIA` como literal); "nenhum script, teste ou código cita supabase/migrations" (varre `package.json` e `src/`). Primeiro, um teste do próprio detector com casos positivos e negativos, como em `cores-literais.test.ts`. |
| 5 | `schema.test.ts` | "aceita o frontmatter mínimo válido"; "rejeita ficticio ausente"; "origem: real sem origem → erro"; "origem: real com origem só de espaços → erro"; "origem: fictícia com origem preenchida → erro"; "origem: fictícia com origem vazia ou ausente → ok". |
| 6 | `tests/integration/content/file-repository.test.ts` | ★ "editoria fora do enum → erro com o nome do arquivo": `list()` na fixture `editoria-invalida` rejeita com `/materia-invalida\.md/`, `/editoria/` e `/opiniao/`. Em `parse-article.test.ts`, `it.each` com `Analise` e `análise`. |
| 7 | `parse-article.test.ts` | "campo obrigatório ausente cita arquivo e campo" (`titulo`); "tipo errado cita arquivo e campo" (`tags: psg`, `ficticio: "sim"`, `ficticio: sim`). |
| 8 | `parse-article.test.ts` | "campo desconhecido cita a chave" (`linhafina`). |
| 9 | `parse-article.test.ts` | "slug fora do kebab-case → erro" (`PSG-Balanco`, `são-paulo`, `-a`, `a--b`, `a-`); "slug diferente do nome do arquivo → erro" (`a.md` com `slug: b`). |
| 10 | `parse-article.test.ts` | "tags vazias, fora do padrão ou repetidas → erro" (`[]`, `[Ligue 1]`, `[psg, psg]`). |
| 11 | `parse-article.test.ts` | "data inválida → erro" (`2026-13-45`, `19/11/2026`, `2026-02-30`); "data não muda de dia em America/Sao_Paulo": `vi.stubEnv("TZ", "America/Sao_Paulo")`, pré-condição `new Date(2026, 0, 1).getTimezoneOffset() === 180` e `artigo.publicado_em === "2026-11-19"`. |
| 12 | `catalog.test.ts` | "slug duplicado cita os dois arquivos": `montarCatalogo` com `{arquivo:"A.md"}` e `{arquivo:"a.md"}` de mesmo slug lança erro com `/A\.md/` e `/a\.md/`. |
| 13 | `frontmatter.test.ts` | "YAML malformado cita arquivo e linha" (aspas não fechadas → `/x\.md/` e `/linha \d+/`); "sem frontmatter → erro"; "sem --- de fechamento → erro"; "chave duplicada → erro". |
| 14 | `file-repository.test.ts` | "ignora .gitkeep e arquivos que não são .md": `basico` tem `total` 5, sem erro. |
| 15 | `file-repository.test.ts` | "a caixa de entrada nunca é lida": `fantasma-entrada` ausente de `list`, `getBySlug`, `search("fantasma")`, `listEditorias` (totais) e `listTags`. |
| 16 | `file-repository.test.ts` | "pasta sem matérias": `list()` é igual a `{ itens: [], pagina: 1, total: 0, totalPaginas: 0 }`; as 7 editorias com total 0; `listTags()` igual a `[]`. |
| 17, 25 | `file-repository.test.ts` e `parse-article.test.ts` | "corpo é exposto sem nenhuma alteração": `getBySlug("alfa-cronica")` → `corpo_md` igual (`toBe`) a `CORPO_TIPOGRAFICO`, mais o `Article` completo (`toEqual` com todos os campos do critério 19). "arquivo CRLF é lido e o corpo mantém os \r\n": em memória. |
| 19 | `catalog.test.ts` | "resumo não carrega corpo nem campos de SEO": `"corpo_md" in item === false` nos itens de `list`/`search`; "o objeto devolvido é congelado". |
| 20 | `file-repository.test.ts` | ★ "list() em ordem decrescente de data": slugs em ordem alfa, bravo, charlie, delta, eco. |
| 21 | `file-repository.test.ts` | ★ "filtro por editoria": `cronica` → 2 itens; `reportagem` (montado como `SLUGS_DE_EDITORIA.at(-1)`) e `"xyz"` → `[]`/0. |
| 22 | `file-repository.test.ts` | ★ "filtro por tag": `fc-aurora` → 3; `"FC-AURORA"` → 0; `{ editoria: "cronica", tag: "fc-aurora" }` → só alfa. |
| 23 | `file-repository.test.ts` | ★ "paginação": as páginas 1 a 4 com `pageSize: 2`, a união sem repetição na ordem do critério 20 e a página padrão 1. `it.each([0, -1, 1.5])` → `RangeError`. Em `catalog.test.ts`: "tamanho padrão da página é 12" (com 13 artigos montados em memória). |
| 24 | `file-repository.test.ts` | ★ "getBySlug inexistente → null": `it.each(["nao-existe", "", "BRAVO-ANALISE", "%00", "../../package", "..\\..\\package", "materia/../outra"])` → `null`. Num arquivo separado, `tests/integration/content/file-repository-leituras.test.ts`, porque o `vi.mock` é içado e vale para o arquivo inteiro: "getBySlug não lê nada fora de materias/". Com `vi.mock("node:fs", { spy: true })`, nenhuma chamada a `readFileSync` recebe caminho fora de `materias/` e do `tags.json` da fixture. |
| 26 | `file-repository.test.ts` | "listEditorias devolve as 7 na ordem de EDITORIAS": slugs iguais a `SLUGS_DE_EDITORIA`, rótulo de `analise` igual a `"Análise"`, totais conferidos. |
| 27 | `file-repository.test.ts` | "listTags: só usadas, total desc, empate por rótulo pt-BR": a ordem da seção 5. |
| 28 | `search.test.ts` e `file-repository.test.ts` | "normalizarParaBusca remove acento, caixa e espaços extras"; "busca ignora acentos e maiúsculas": `"sao paulo"`, `"SÃO PAULO"` e `"São Paulo"` → `["charlie-cronica"]`; "busca vazia → []" (`""`, `"   "`); "busca procura em linha fina, tags e corpo"; "busca com vários termos exige todos". |
| 29, 30 | `tags.test.ts` | "rótulo vem do tags.json"; ★ "ligue-1 → Ligue 1 com aviso": rótulo `"Ligue 1"` e `avisar` chamado 1 vez com `/ligue-1/`, mesmo resolvendo 2 vezes; "conectivos ficam minúsculos" (`copa-do-litoral` → `"Copa do Litoral"`). |
| 31 | `tags.test.ts` e `file-repository.test.ts` | "tags.json malformado → erro citando tags.json" (`{`, `[]`, `{"a": 1}`, chave fora do padrão); fixture `tags-malformado`; "sem tags.json usa o humanizado" (fixture `vazio` ou `montarMateria`). |
| 32 | `config.test.ts` e `index.test.ts` | "CONTENT_SOURCE ausente ou files → arquivos"; `it.each(["supabase", "FILES", "  ", ""])` → erro com `/CONTENT_SOURCE/` e o valor; `getRepository()` com `vi.stubEnv` lança o mesmo erro. |
| 33 | `config.test.ts` e `file-repository.test.ts` | ★ "MOSTRAR_EXEMPLOS=false esconde as fictícias": `list` (total 3, totalPaginas), filtro `cronica` (1), filtro `sao-paulo-do-vale` (0), `getBySlug("charlie-cronica")` null, `search("sao paulo")` `[]`, totais de editoria e `listTags` sem `sao-paulo-do-vale` e `liga-da-serra`. Mais `it.each(["nao", "0", ""])` → erro com `/MOSTRAR_EXEMPLOS/`. |
| 34, 39, 40, 41, 43 | `tests/integration/content/conteudo-real.test.ts` | "o conteúdo real carrega sem erro e tem as 8 matérias de exemplo" (`getRepository()` com as variáveis removidas por `vi.stubEnv(..., undefined)`; `list({ pageSize: 100 }).total === 8`); "todas são fictícias, sem origem, do Squad Fut e antes de 2026-11-01, com datas distintas"; "variedade": ≥ 5 editorias, uma com ≥ 2; ≥ 3 tags em ≥ 2 matérias; ≥ 1 tag fora do `tags.json`; um corpo com ≥ 1.000 palavras e um com < 400 (por `contarPalavras`); `##`, `>` e lista; um título > 100 caracteres; um termo acentuado. "nenhum nome real conhecido": uma lista de nomes proibidos (`PSG`, `Flamengo`, `Champions`, `Ligue 1`, `Brasileirão`, `Libertadores`, `Premier League`, `La Liga`, `Real Madrid`, `Barcelona`) não aparece, sem diferenciar maiúsculas. É uma rede mínima; a conferência humana continua com o code-reviewer. |
| 35 | `markdown.test.ts` | "converte intertítulos, parágrafos, listas, citações, ênfase, negrito e links". |
| 36 | `markdown.test.ts` | ★ "renderMarkdown remove script e onerror": `/<script/i` e `/onerror/i` ausentes; e também "remove iframe, style, object, on* e javascript:" (cada caso com `it.each`, incluindo `JaVaScRiPt:`; o conteúdo de `<style>` também some). "preserva o texto de HTML inofensivo" (`<p onclick="x">Gol aos 90</p>` → contém `Gol aos 90` e não contém `onclick`). |
| 37 | `markdown.test.ts` | "não faz transformação tipográfica": `renderMarkdown(CORPO_TIPOGRAFICO)` → remove tags com `/<[^>]+>/g`, decodifica `&#x26;`/`&#x3C;`/`&amp;`/`&lt;`/`&quot;`, separa por `\n`, descarta as linhas vazias e compara com `LINHAS_VISIVEIS_ESPERADAS` (`toEqual`). |
| 38 | `reading-time.test.ts` | ★ "readingTime com 1.360 palavras → 7"; `it.each` para 200 → 1, 201 → 2, `""` → 1, espaços → 1; "marcação não conta como palavra" (`"## Intertítulo"` → 1 palavra, `"**Gol** de *placa*"` → 3). |
| 42 | `markdown.test.ts` e `parse-article.test.ts` | "encontrarLinhasDeH1 acha ATX, setext e <h1>"; "ignora # em bloco cercado, indentado, código em linha e #1 no meio do texto"; "h1 no corpo → erro com arquivo e linha do arquivo" (frontmatter de k linhas + h1 na 3ª linha do corpo → `/linha ${k + 5}/`). |
| 44, 45 | `tests/unit/migracao-sql.test.ts` | "o rascunho se declara não executado e cita a spec 6.3"; "tem as colunas, unique, check de editoria e índice portuguese": os slugs do `check` são extraídos por regex e comparados com `SLUGS_DE_EDITORIA` (protege contra divergência). |
| 47, 49 | QA | rodar os portões; `npm run build` lista só `/` e `/_not-found`; a contagem de e2e se mantém em 136. |

### 7. `supabase/migrations/0001_articles.sql` (rascunho)
- 1ª linha: `-- RASCUNHO DE DOCUMENTAÇÃO: não é executado na v1. Ver spec 6.3 (docs/superpowers/specs/2026-11-19-blog-fut-design.md).`
- Colunas:
  - `id uuid primary key default gen_random_uuid()`, `slug text not null unique`, `titulo text not null`, `titulo_seo text`, `linha_fina text not null`;
  - `editoria text not null check (editoria in (...7 slugs...))`, com o comentário "espelho de src/lib/editorias.ts";
  - `tags text[] not null check (cardinality(tags) >= 1)`, `meta_description text`, `palavras_chave text[] not null default '{}'`, `publicado_em date not null`, `autor text not null`;
  - `ficticio boolean not null`, `origem text`, `corpo_md text not null`, `created_at timestamptz not null default now()`.
- Restrição `articles_origem_ck check (ficticio or coalesce(btrim(origem), '') <> '')`.
- Índice: `create index articles_busca_idx on articles using gin (to_tsvector('portuguese', coalesce(titulo,'') || ' ' || coalesce(linha_fina,'') || ' ' || coalesce(corpo_md,'')));`.
- Um comentário avisa que ignorar acentos no Supabase exige `unaccent` num wrapper `immutable`, a ser decidido no ADR do Supabase.

### 8. Matérias de exemplo: matriz sugerida
Os nomes são escolha do dev, dentro do critério 40. Uma distribuição que cumpre os critérios 39 a 43 de uma vez:

| # | editoria | data | tamanho | estrutura |
|---|---|---|---|---|
| 1 | analise | 2026-10-28 | ≥ 1.000 palavras | `##` intertítulos |
| 2 | cronica | 2026-10-25 | < 400 palavras | só parágrafos |
| 3 | noticia | 2026-10-22 | médio | lista |
| 4 | cronica | 2026-10-18 | médio | citação `>` |
| 5 | perfil | 2026-10-14 | médio | `##` |
| 6 | entrevista | 2026-10-10 | médio | título > 100 caracteres; citações |
| 7 | reportagem | 2026-10-06 | longo | `##` e lista |
| 8 | coluna | 2026-10-02 | médio | termo acentuado ("São …") |

Usar 4 ou 5 tags recorrentes (clubes e competição inventados, cada uma em ≥ 2 matérias) e pelo menos uma tag cujo humanizado fique bom e que **não** esteja no `tags.json` (ex.: uma competição "liga-do-…" → "Liga do …"). Nenhum corpo começa com o título ou a linha fina, e nenhum tem h1.

### 9. Etapas TDD (cada uma vira um commit do versionador)
1. **chore:** dependências da seção 1, alias `server-only` no `vitest.config.ts`, `tests/stubs/server-only.ts` e `.prettierignore`. Os portões continuam verdes.
2. **Contrato:** `types.ts`, `repository.ts` e `errors.ts` (só tipos e a classe; o teste vem com o `index` na etapa 12).
3. **`reading-time.ts`:** os testes do critério 38 primeiro (vermelho), depois a implementação.
4. **`search.ts`:** os testes de normalização e correspondência (critério 28, parte de unidade).
5. **`tags.ts`:** os critérios 29 a 31 (parte de unidade).
6. **`schema.ts`:** os critérios 5, 9 (formato), 10 e 11 (formato), via `safeParse` direto.
7. **`frontmatter.ts`:** o critério 13, a separação do corpo e a `linhaInicialDoCorpo`.
8. **`markdown.ts`:** os critérios 35 a 37 e o `encontrarLinhasDeH1` (42).
9. **`parse-article.ts`:** os helpers `montarMateria` e `corpo-tipografico`, e os critérios 6 a 11, 17 (CRLF) e 42 (erro com linha).
10. **`catalog.ts`:** os critérios 12, 19, 20 a 24, 26 a 28 e 33, em memória, com `ArtigoCarregado` montados nos testes.
11. **`file-repository.ts` + fixtures:** os testes de integração dos critérios 6 e 14 a 33.
12. **`config.ts` + `index.ts`:** os critérios 2 e 32, mais o 33 (variável).
13. **Regra do repositório:** `regra-do-repositorio.test.ts` (critérios 3, 4 e 46).
14. **content:** as 8 matérias, o `tags.json` e o `conteudo-real.test.ts` (critérios 34 e 39 a 43).
15. **Migração:** `supabase/migrations/0001_articles.sql` e `migracao-sql.test.ts` (critérios 44 a 46).
16. **docs:** a seção de variáveis de ambiente no `README.md` (critério 50).
