# ADR 0005: Frontmatter com `yaml` (esquema core) e leitura síncrona memorizada do `content/`

**Status:** aceito · **Data:** 2026-11-19 · **História:** `docs/backlog/02-camada-de-conteudo.md` (critérios 11, 13, 14, 17, 24, 32 a 34)

Fontes consultadas:
- `node_modules/next/dist/docs/01-app/01-getting-started/08-caching.md`:
  - "Predictable values" e "Prerendering": `fs.readFileSync` e computação pura terminam durante o prerender e entram no static shell; `await readFile()` dentro do render é tratado como dado não cacheado e exige `use cache` ou `<Suspense>`.
  - "Bots and crawlers": fontes de dados usadas no prerender precisam existir também em tempo de requisição.
- `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`, "Preventing environment poisoning": `import 'server-only'` gera erro de build se o módulo for importado num Client Component; instalar o pacote é **opcional**, porque o Next trata o import internamente.
- `node_modules/next/types/global.d.ts`, linha 57: o Next declara o módulo `server-only` para o TypeScript.
- `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/output.md`: `outputFileTracingIncludes`.
- `next.config.ts`: `cacheComponents: true` e `partialPrefetching: true`.
- `.gitattributes`: `* text=auto eol=lf`. `.prettierignore`: já ignora `content` e `docs`.

## Contexto
- O plano cita `gray-matter`. Ele usa `js-yaml` 3 com o esquema YAML 1.1, que transforma `publicado_em: 2026-11-19` num `Date` à meia-noite UTC. Em `America/Sao_Paulo`, isso aparece como dia 18 (critério 11). O `gray-matter` também tem motores `---js`/`---javascript` que avaliam código do frontmatter, e não recebe manutenção desde 2021.
- O corpo precisa ser exposto **caractere por caractere** (critério 17), inclusive com CRLF, e os erros de YAML precisam citar o arquivo (critério 13).
- Com Cache Components, I/O assíncrono durante o render obriga a decidir entre `use cache` e `<Suspense>` em toda tela. I/O síncrono não.
- O conteúdo é pequeno (dezenas de arquivos) e só muda por PR, ou seja, a cada build.

## Decisão
1. **Frontmatter:** divisor próprio (`src/lib/content/frontmatter.ts`, cerca de 30 linhas) + pacote `yaml` com `{ schema: "core", uniqueKeys: true }`.
   - O arquivo precisa começar com uma linha `---` (um BOM inicial é tolerado e descartado). O frontmatter termina na primeira linha seguinte que seja exatamente `---` (aceita `\r\n`).
   - O corpo é tudo depois dessa linha, menos **uma** quebra de linha (`\n` ou `\r\n`). Nada mais é removido.
   - No esquema `core` (YAML 1.2), `2026-11-19` continua sendo **texto**. Booleanos são só `true`/`false` (`sim`/`yes` viram texto e o zod recusa). Chaves duplicadas são erro.
   - `YAMLParseError` vira `ContentError` com o nome do arquivo e a linha **do arquivo** (a linha do YAML + 1, por causa do `---` de abertura).
2. **Data como texto `AAAA-MM-DD`** em todos os tipos (`publicado_em: string`). A ordenação é por comparação de texto (ISO é lexicograficamente cronológico). Nenhum `Date` é criado na camada de conteúdo. É o mesmo formato que o Supabase devolve para uma coluna `date`. A formatação por extenso é da história 3, que deve tratar o valor como data de calendário (`timeZone: "UTC"` ao formatar um `Date.UTC`).
3. **Leitura síncrona, uma vez, toda de uma vez:** `FileArticleRepository` lê `content/tags.json` e `content/materias/*.md` com `readFileSync`/`readdirSync` na **primeira chamada** a qualquer método, valida tudo, monta um catálogo em memória (congelado com `Object.freeze`) e responde todas as consultas a partir dele. Os métodos continuam `async`, como manda a spec 6.3, mas resolvem sem I/O assíncrono. Por isso terminam dentro do prerender sem `use cache`.
4. **`getBySlug` nunca monta caminho com o argumento.** A lista de arquivos vem do `readdirSync` da pasta `materias/`. O slug pedido é conferido pela regex de slug e procurado num `Map`. Path traversal (`../../package`, `%00`, `\\`) é impossível por construção.
5. **Caminho do conteúdo:** `path.join(process.cwd(), "content")`, resolvido em `index.ts` (`getRepository`). Nada de caminho absoluto no código. Os testes passam o diretório das fixtures direto ao construtor.
6. **Memória por ambiente:** `getRepository()` valida as variáveis a cada chamada. Em `NODE_ENV === "production"`, reutiliza uma instância por valor de `MOSTRAR_EXEMPLOS`. Fora de produção (dev e testes), cria uma instância nova a cada chamada, para que uma matéria editada apareça ao recarregar a página no `next dev`.
7. **`server-only`:** `file-repository.ts` começa com `import "server-only"`. **Não** se instala o pacote: o Next trata o import e declara o tipo. No Vitest, `vitest.config.ts` ganha um alias de `server-only` para `tests/stubs/server-only.ts` (módulo vazio).

## Alternativas consideradas
1. **`gray-matter`** (citado no plano). Contras: datas viram `Date` (bug de fuso no critério 11), motor `---js` que avalia código e falta de manutenção. Dá para contornar com `engines: { yaml: … }`, mas aí sobra um pacote só para fatiar o texto em `---`. Rejeitada.
2. **`js-yaml` 4** (já presente como dependência transitiva). Prós: sem download novo. Contras: o `DEFAULT_SCHEMA` ainda resolve timestamps em `Date` (precisaria de `JSON_SCHEMA` ou `CORE_SCHEMA`), não acusa chave duplicada com a mesma clareza e as mensagens de erro são menos precisas. Depender de uma transitiva sem declará-la é frágil. Rejeitada por pouco; seria a segunda opção.
3. **`fs/promises` + `use cache` no repositório.** Contras: amarra a camada de conteúdo a uma diretiva do Next, que não roda no Vitest; e o cache por argumento não resolve a validação de todos os arquivos de uma vez. Fica como o caminho natural do `SupabaseArticleRepository` no futuro (I/O de rede), com um ADR próprio. Rejeitada para os arquivos.
4. **Ler um arquivo por chamada (`getBySlug` abre `materias/<slug>.md`).** Contras: monta caminho com entrada do usuário (risco de traversal), não detecta slug duplicado e não valida o conjunto antes do build. Rejeitada.
5. **Instalar `server-only@0.0.1`.** Prós: resolve o import no Vitest sem alias. Contras: o pacote do npm **lança erro** quando importado fora da condição `react-server`, ou seja, também quebraria no Vitest. Seria preciso um alias de qualquer forma. Rejeitada.

## Consequências
- Dependências novas: `yaml` (e `zod`, já previsto na spec). Nenhum `gray-matter`.
- **O build da história 2 não valida o conteúdo**, porque nenhuma página usa o repositório ainda. A proteção nesta história é o teste de integração do critério 34, que carrega o `content/` real. A partir da história 3, `generateStaticParams` faz o build quebrar com a mensagem do `ContentError`.
- **Pendência para a história 3 (deploy):** com Cache Components, crawlers recebem renderização em tempo de requisição ("Bots and crawlers"). O `content/` precisa ir junto no deploy. A história 3 acrescenta `outputFileTracingIncludes: { "/*": ["./content/materias/**/*", "./content/tags.json"] }` ao `next.config.ts` e confere com `next build`.
- **`MOSTRAR_EXEMPLOS` vale no build:** as páginas são estáticas, então mudar a variável exige um build novo. Isso fica documentado no `README.md`.
- O `.gitattributes` normaliza tudo para LF. Por isso, o caso CRLF do critério 17 é testado com uma string montada no próprio teste, e não com um arquivo de fixture.
- Os erros de todos os arquivos são juntados num único `ContentError`, um problema por linha, cada uma começando pelo nome do arquivo. Assim o diagramador corrige tudo de uma vez.
- O futuro `SupabaseArticleRepository` implementa a mesma interface. As funções puras de consulta (`catalog.ts`) são específicas dos arquivos; no Supabase, ordenação, filtros e paginação viram SQL.
