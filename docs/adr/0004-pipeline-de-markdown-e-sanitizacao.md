# ADR 0004: Pipeline de markdown e sanitização (unified + rehype-raw + rehype-sanitize)

**Status:** aceito · **Data:** 2026-11-19 · **História:** `docs/backlog/02-camada-de-conteudo.md` (critérios 35 a 38 e 42)

Fontes consultadas:
- Spec, seção 6.1: "Markdown → HTML: `remark`/`rehype`, com sanitização".
- `node_modules/next/dist/docs/01-app/01-getting-started/08-caching.md`, seções "Predictable values" e "Prerendering": com `cacheComponents: true` (ligado em `next.config.ts`), computação pura e I/O síncrono terminam dentro do prerender; trabalho assíncrono fora de `use cache` precisa de `<Suspense>`.

## Contexto
- O corpo das matérias é markdown escrito pelo squad-fut e precisa virar HTML **sem nenhuma transformação tipográfica** (regra "texto do squad é imutável"): aspas retas continuam retas, `--` não vira travessão, `...` não vira reticências.
- O HTML vai para a página com `dangerouslySetInnerHTML` (história 3), então precisa ser **sanitizado**: sem `<script>`, `<style>`, `<iframe>`, `<object>`, atributos `on*` nem links `javascript:` (critério 36).
- O usuário decidiu que um h1 no corpo é **erro de carregamento** com arquivo e linha (decisão 2). Para isso é preciso reconhecer um h1 de verdade, sem confundir com `#` dentro de bloco de código. Isso pede um parser de markdown, não uma regex.
- O texto que chega pode ter HTML cru (pouco provável, mas possível). Se ele for descartado em silêncio, as palavras que estiverem dentro dele somem da página, o que também altera o texto.

## Decisão
1. **Pipeline:** `unified` + `remark-parse` (markdown → mdast, CommonMark puro) → `remark-rehype` com `allowDangerousHtml: true` → `rehype-raw` (interpreta o HTML cru dentro da árvore) → `rehype-sanitize` com um esquema próprio → `rehype-stringify`.
2. **Sem plugins tipográficos e sem GFM.** Não entram `remark-smartypants`, `remark-gfm`, `rehype-slug` nem `rehype-autolink-headings`. CommonMark já cobre o que o critério 35 pede (intertítulos, parágrafos, listas, citações, ênfase, negrito e links). Se uma matéria real precisar de tabela, `remark-gfm` entra com um ADR novo.
3. **Esquema de sanitização:** parte de `defaultSchema` (exportado por `rehype-sanitize`, o esquema do GitHub, que já remove `on*`, `style` e protocolos fora de `http`, `https`, `mailto` etc.) e:
   - tira `h1` de `tagNames`. Um `<h1>` que escapar da validação vira só texto (o conteúdo fica, a tag sai). É uma defesa em profundidade; a regra principal é o erro de carregamento;
   - acrescenta a `strip` (remove o elemento **e** o conteúdo): `script`, `style`, `iframe`, `object`, `embed`, `noscript`, `template`. Sem isso, o CSS de um `<style>` apareceria como texto.
4. **Execução síncrona por dentro:** `renderMarkdown(md): Promise<string>` mantém a assinatura assíncrona da spec, mas usa `processor.processSync(md)` internamente. O processador é montado **uma vez**, no escopo do módulo. Assim a renderização termina dentro do prerender do Next 16 (Cache Components), sem `use cache` nem `<Suspense>`.
5. **Detecção de h1 pela mesma árvore:** `markdown.ts` também exporta `encontrarLinhasDeH1(md)`, que faz só o `parse` do `remark-parse` e percorre o mdast. São h1: `heading` com `depth === 1` (cobre `# x` e o sublinhado com `===`) e nós `html` com `<h1` (sem diferenciar maiúsculas). Nós `code` e `inlineCode` nunca são h1, então `#` dentro de código é ignorado sem nenhuma regra especial.

## Alternativas consideradas
1. **`remark-rehype` sem `allowDangerousHtml` (descarta HTML cru), sem `rehype-raw`.** Prós: uma dependência a menos (`rehype-raw` traz `parse5`). Contras: `<p onclick="x">Gol aos 90</p>` some inteiro, inclusive o texto "Gol aos 90"; o texto do squad seria alterado em silêncio. Rejeitada.
2. **`marked` + `DOMPurify`/`isomorphic-dompurify`.** Prós: popular e rápido. Contras: `DOMPurify` no servidor precisa de `jsdom` (dependência pesada); `marked` não expõe uma árvore com posições estável para achar o h1 com a linha; a spec já indica remark/rehype. Rejeitada.
3. **`markdown-it` + `sanitize-html`.** Prós: maduro. Contras: o `markdown-it` tem a opção `typographer` (se alguém ligar, viola a regra do texto imutável sem nenhum teste perceber); `sanitize-html` traz `htmlparser2` e `postcss`; a detecção de h1 teria de usar outra estrutura de tokens. Rejeitada.
4. **`remark-html` (tudo no remark).** Contras: a sanitização dele é o mesmo `hast-util-sanitize`, mas com menos controle sobre o esquema e sem o passo `rehype-raw`. Rejeitada.
5. **Rebaixar h1 para h2 no render.** Rejeitada pelo usuário (decisão 2, opção A).

## Consequências
- Dependências novas (versões exatas nas Notas técnicas da história 02): `unified`, `remark-parse`, `remark-rehype`, `rehype-raw`, `rehype-sanitize`, `rehype-stringify`. Todas são ESM puras e rodam só no servidor (o `index.ts` de `@/lib/content` é server-only pela cadeia `file-repository.ts`).
- `defaultSchema` aplica o prefixo `user-content-` a `id` e `name` vindos do HTML cru. Nenhum id é gerado pelo pipeline (não há `rehype-slug`), então nada muda para o markdown comum.
- O HTML de saída usa as referências de caractere do `hast-util-to-html` (`&#x26;` para `&`, `&#x3C;` para `<` no texto). Aspas, travessões, reticências e espaços **não** são codificados nem trocados. O teste do critério 37 decodifica essas duas referências antes de comparar.
- Dois espaços no **fim** de uma linha são quebra de linha (`<br>`) em CommonMark. É semântica do markdown, não reescrita. A fixture do critério 17/37 coloca os espaços duplos **no meio** da linha.
- Se a história 3 quiser realce de código ou âncoras nos intertítulos, cada plugin entra com um ADR que estende este e com o teste do critério 37 continuando verde.
- O Supabase não muda nada aqui: o corpo continua sendo `corpo_md` e passa pelo mesmo `renderMarkdown`.
