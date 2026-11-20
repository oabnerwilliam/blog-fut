# 03: Página da matéria

**Status:** pronta para desenvolvimento
**Branch:** feat/03-pagina-materia
**Tipo:** UI nova, sem designer: o layout já foi aprovado na história 01 (`docs/design/01-identidade-visual/zona-mista-v2/variacao-2/materia.html`)
**Escrita por:** orquestrador, a partir do plano da v1 (história 3) e da spec 6.5

## História
Como leitor, quero abrir uma matéria do squad-fut e ler o texto completo, com editoria, data, tempo de leitura e tags. Quero também saber com clareza quando uma matéria é fictícia.

Como squad-fut, quero que cada matéria tenha os metadados de SEO e de compartilhamento certos, sem que ninguém altere o texto.

## Critérios de aceite

### A. Rota e dados
1. `src/app/materias/[slug]/page.tsx` gera as páginas de forma estática com `generateStaticParams`, a partir de `getRepository().list()`. Ela percorre todas as páginas da listagem e nunca lê o `fs` diretamente.
2. `/materias/nao-existe` e qualquer slug inválido (`/materias/PSG`, `/materias/..%2F..%2Fpackage`) respondem **404**, com a página de "não encontrada" do próprio site: `src/app/not-found.tsx`, com cabeçalho e rodapé do layout, um único `h1` e um link para a capa.
3. `next.config.ts` ganha `outputFileTracingIncludes: { "/*": ["./content/materias/**/*", "./content/tags.json"] }`, a pendência do ADR 0005, e o `npm run build` passa.

### B. Conteúdo visível (segue o mockup `variacao-2/materia.html`)
4. A página mostra:
   - o rótulo da editoria, com link para `/editorias/<editoria>`, que é o `hrefDaEditoria`;
   - o título, como **único `h1`**;
   - a linha fina;
   - a autoria;
   - a data por extenso em pt-BR (`2026-10-20` → "20 de outubro de 2026"), num `<time dateTime="2026-10-20">`;
   - o tempo de leitura ("7 min de leitura").
5. A data é tratada como data de calendário. Com `TZ=America/Sao_Paulo`, `2026-11-01` continua sendo "1 de novembro de 2026", e não o dia 31 de outubro. A função `formatarData` em `src/lib/datas.ts` tem teste de unidade.
6. O corpo vem de `renderMarkdown(article.corpo_md)`, já sanitizado. **O texto do corpo é idêntico ao do `.md`.** Um teste compara o `textContent` dos parágrafos renderizados com o texto do arquivo de uma matéria de exemplo, sem nenhuma troca tipográfica.
7. As tags aparecem no fim do texto, como lista de links para `/tags/<slug>` com o rótulo de cada uma. O 404 dessas rotas, até a história 5, é aceito.
8. Uma matéria fictícia mostra:
   - o selo **"◇ Exemplo"** junto da editoria;
   - o aviso **"Conteúdo fictício de demonstração"** no topo, antes do corpo, com o estilo de aviso do mockup.

   Uma matéria real não mostra nenhum dos dois. Os componentes ficam em `src/components/materia/`.

### C. Metadados (spec 6.5), via `generateMetadata`
9. A página tem:
   - `<title>`: `titulo_seo` ou, na falta dele, `titulo`;
   - `meta description`: `meta_description` ou, na falta dela, `linha_fina`;
   - `keywords`: `palavras_chave`, omitido quando a lista está vazia;
   - canonical `/materias/<slug>`.
10. Open Graph com `type: article`, `title`, `description`, `url`, `publishedTime` (`publicado_em`), `section` (o rótulo da editoria) e `tags`. Twitter card `summary`.
11. JSON-LD num `<script type="application/ld+json">`:
    - `@type`: `NewsArticle`, ou `Article` quando a editoria é `cronica` ou `coluna`;
    - `headline`, `description`, `datePublished`, `inLanguage: "pt-BR"`, `mainEntityOfPage`;
    - `author` e `publisher` como `Organization` com o nome do portal.

    O JSON é serializado com `<` escapado (`<`), para impedir que uma tag `</script>` vinda do frontmatter feche o script.
12. A URL base vem de `SITE_URL`, com padrão `http://localhost:3000`, e é aplicada no `metadataBase` do layout. Uma URL inválida dá erro claro no build. O `README.md` documenta a variável.
13. Uma matéria fictícia recebe `robots: { index: false, follow: false }` (`<meta name="robots" content="noindex, nofollow">`). Uma real não recebe nenhuma meta `robots` de noindex.

### D. Testes (portões verdes)
14. Um e2e (`tests/e2e/materia.spec.ts`) abre uma matéria fictícia de exemplo e confere:
    - `<title>`, `meta description`, `og:type=article`, `robots` com noindex;
    - o JSON-LD, que passa em `JSON.parse` e traz `@type` e `headline` certos;
    - um único `h1`;
    - o selo e o aviso;
    - os links das tags;
    - nada de rolagem horizontal em 320px;
    - nenhuma violação do axe, nos temas claro e escuro.

    Também confere que `/materias/nao-existe` responde 404 com o `h1` da página de "não encontrada". O e2e guarda screenshots (320px e 1280px, claro e escuro) em `test-results/materia/`, que **substituem a homologação**.
15. Os cinco portões passam: `lint`, `typecheck`, `test`, `test:e2e` e `build`.

## Notas técnicas
- **Next 16:** antes de escrever, leia em `node_modules/next/dist/docs/`:
  - `generateStaticParams` e `params` como `Promise`;
  - `generateMetadata`, `metadataBase` e `robots`;
  - `notFound()`;
  - JSON-LD (existe guia próprio);
  - `outputFileTracingIncludes`.

  O projeto usa `cacheComponents: true`. Confira como `generateStaticParams` e `dynamicParams` se comportam nesse modo. Um slug fora da lista deve dar 404, por exemplo com `dynamicParams = false` se for compatível, ou com `notFound()` no `getBySlug === null`.
- **Repositório:** `getBySlug(slug)` já devolve `null` para slugs inválidos (critério 24 da história 02). Basta chamar `notFound()`.
- **Estilos:** CSS Modules com os tokens de `docs/design/tokens.md` (ADR 0001). Nenhuma cor fora dos tokens. O corpo usa uma classe de prosa (`Prosa.module.css` ou equivalente) com medida de leitura de ~65ch, `h2`/`h3`, citações e listas no estilo do mockup.
- **Nome do portal:** reaproveite a constante do cabeçalho, se já existir; se não, crie `src/lib/site.ts` com `NOME_DO_SITE` e `SITE_URL`.
- **Fora do escopo:**
  - matérias relacionadas;
  - imagem de OG;
  - compartilhamento;
  - as páginas `/editorias` e `/tags` (história 5);
  - a capa (história 4).
