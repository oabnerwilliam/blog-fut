# 01: Identidade visual

**Status:** pronta para desenvolvimento (a implementação só começa depois que o usuário aprovar uma direção visual, veja o critério 4)
**Branch:** feat/01-identidade-visual

## Contexto
O Blog Fut publica as matérias do squad-fut. Antes de qualquer tela real (matéria, capa, editorias, busca), o portal precisa de uma identidade: nome, paleta, par tipográfico e o esqueleto visual comum a todas as páginas. O usuário escolheu o modelo "o time propõe, eu aprovo": o designer apresenta **2 direções** e o usuário escolhe uma antes de qualquer implementação.

As matérias não têm imagens (spec, seção 2), então a identidade precisa se sustentar só com tipografia e cor. Os tokens desta história são a **fonte única** de cor e tipografia para todas as histórias seguintes, e já nascem com o tema escuro, que segue o sistema. O botão de alternar o tema e a persistência da escolha ficam para a história 7.

Nesta história ainda **não existe** a camada de conteúdo (história 2) nem as páginas reais (histórias 3 em diante). A entrega implementada é: tokens, fontes, layout base (cabeçalho e rodapé) e uma capa provisória que use os tokens.

Para quem: o leitor do portal (legibilidade, acessibilidade, celular), o usuário dono do projeto (aprova a direção) e o próprio time (tokens que as próximas histórias reutilizam).

## História
Como leitor do Blog Fut, quero um portal com identidade própria, legível no claro e no escuro, do celular de 320px ao desktop, para ler as matérias com conforto e reconhecer o site.

Como dono do projeto, quero escolher entre duas propostas visuais antes da implementação, para que o portal tenha a cara que eu aprovei.

## Critérios de aceite

### A. Proposta e aprovação (designer + usuário)
1. Existem em `docs/design/` **2 direções** distintas. Cada uma define: nome do portal, paleta (claro e escuro), par tipográfico (fonte de títulos e fonte de texto) e uma proposta de tokens.
2. Cada direção tem mockups HTML **autocontidos** (abrem direto no navegador, sem build e sem servidor) de **capa** e de **matéria**, cada um no **claro** e no **escuro**, em **375px** e **desktop** (8 visões por direção). Os mockups usam só conteúdo fictício ou a matéria do PSG como texto de exemplo; quando usarem texto fictício com clubes, os clubes são inventados.
3. Cada direção traz, junto dos mockups, a tabela de contraste dos pares texto/fundo principais nos dois temas (texto do corpo, texto secundário, links, texto do cabeçalho e do rodapé), com a razão calculada. Todos os pares de texto ficam em **4,5:1 ou mais**.
4. **O usuário aprova uma direção** (o orquestrador pergunta com as opções) **antes** de o dev começar. A direção escolhida, a data e eventuais ajustes pedidos pelo usuário ficam registrados em `docs/design/` (por exemplo, num arquivo de decisão), e os tokens implementados correspondem a essa direção.

### B. Decisão técnica (arquiteto)
5. Existe um ADR em `docs/adr/` que registra a escolha entre **Tailwind CSS e CSS Modules**, com a justificativa e as alternativas consideradas.

### C. Tokens e tema
6. Os tokens de cor e tipografia são definidos em variáveis CSS em `:root` (tema claro) e em `[data-theme="dark"]` (tema escuro), com os nomes e valores da direção aprovada. Há tokens, no mínimo, para: fundo, superfície, texto principal, texto secundário, cor de destaque/link, borda, cor do foco, fonte de títulos (`--font-display` ou nome equivalente documentado) e fonte de texto.
7. **Fallback pelo sistema:** sem atributo `data-theme` no `<html>`, um navegador com `prefers-color-scheme: dark` mostra o tema escuro, e um com `light` mostra o claro. Verificável por e2e com `colorScheme: 'dark'` e `'light'`, conferindo a cor de fundo computada do `body` contra o valor do token de cada tema.
8. **O atributo vence o sistema:** com `data-theme="dark"` e sistema claro, a página fica escura; com `data-theme="light"` e sistema escuro, a página fica clara. (Isso prepara a história 7; aqui basta setar o atributo manualmente no teste.)
9. **Nenhuma cor fora dos tokens:** fora do arquivo de definição dos tokens, nenhum estilo ou componente usa cor literal (hex, `rgb()`, `hsl()`, `oklch()` ou nome de cor como `white`/`black`); todos usam os tokens. Verificável por busca no código (o code-reviewer confere; um teste automatizado é bem-vindo). Exceções: `transparent`, `currentColor` e `inherit`.
10. **Contraste AA:** em ambos os temas, todo texto da capa provisória, do cabeçalho e do rodapé tem contraste de **4,5:1 ou mais** contra o fundo onde aparece. O indicador de foco tem contraste de **3:1 ou mais** contra o fundo adjacente. Verificável por teste automatizado de acessibilidade (axe ou equivalente) sem violações de contraste, nos dois temas.

### D. Fontes
11. As fontes da direção aprovada são carregadas via **`next/font`** e expostas aos tokens de tipografia. A página não faz nenhuma requisição a `fonts.googleapis.com` nem a `fonts.gstatic.com` em tempo de execução (verificável no e2e, observando as requisições de rede).
12. Títulos usam a fonte de títulos e o texto corrido usa a fonte de texto, via tokens (verificável pelo `font-family` computado do `h1` e de um parágrafo da capa provisória).

### E. Layout base (em todas as páginas)
13. O `<html>` continua com `lang="pt-BR"`.
14. **Cabeçalho** com o nome do portal (da direção aprovada) como link para `/`, e uma navegação (`<nav>` com rótulo acessível, ex.: `aria-label="Editorias"`) com os **7 links de editoria** da lista fechada da spec, nesta ordem e com estes rótulos e destinos:
    - Análise → `/editorias/analise`
    - Crônica → `/editorias/cronica`
    - Notícia → `/editorias/noticia`
    - Coluna → `/editorias/coluna`
    - Perfil → `/editorias/perfil`
    - Entrevista → `/editorias/entrevista`
    - Reportagem → `/editorias/reportagem`

    As páginas de editoria ainda não existem (história 5); nesta história os links podem levar ao 404 padrão.
15. **Rodapé** (`<footer>`) com o nome do portal e uma linha dizendo que as matérias são produzidas pelo squad-fut.
16. Existe um link "Pular para o conteúdo" que é o **primeiro** elemento focável da página, fica visível ao receber foco e leva ao conteúdo principal (`<main>`).
17. **Teclado:** apertando Tab a partir do início da página, o foco passa por: link de pular, nome do portal, os 7 links de editoria (na ordem do critério 14), e cada um mostra um **foco visível** com a cor do token de foco, nos dois temas.
18. **320px:** com viewport de 320px de largura, a capa provisória não tem rolagem horizontal (`document.documentElement.scrollWidth <= 320`), a margem lateral do conteúdo é de **16px ou mais**, e os 7 links de editoria continuam acessíveis (visíveis ou alcançáveis por teclado e toque) nos dois temas. Verificável por e2e.
19. Em desktop (1280px), cabeçalho, conteúdo e rodapé seguem o mockup aprovado (o homologador compara os screenshots com o mockup da direção escolhida, no claro e no escuro).

### F. Capa provisória
20. A rota `/` mostra uma capa provisória que usa os tokens: **um único `h1`** (por exemplo, o nome do portal ou "Em breve"), um parágrafo curto de apresentação e pelo menos um exemplo de link e de texto secundário, para que o tema e o contraste possam ser conferidos. Não lê matérias nem arquivos de `content/` (a camada de dados é da história 2).
21. Os cinco portões ficam verdes: `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e`, `npm run build`. O e2e de fumaça existente (status 200 e `html[lang="pt-BR"]`) continua passando.

## Fora de escopo
- **Botão de alternar tema**, persistência em `localStorage` e o script anti-piscada no `<head>` (história 7). Aqui o tema segue só o sistema ou o atributo setado manualmente.
- Camada de conteúdo, schema, repositório e matérias de exemplo (história 2).
- Páginas reais: matéria (3), capa de verdade com destaque e grade (4), editorias e tags (5), busca e campo de busca no cabeçalho (6). Os mockups de capa e matéria servem para aprovar a direção, não são implementados agora.
- Página `not-found` própria (entra com as histórias 3 e 5); os links de editoria podem cair no 404 padrão.
- Logotipo em imagem, favicon elaborado e `og:image` (TODO da spec). O nome do portal pode ser só tipográfico.
- Selo "Exemplo" e aviso de matéria fictícia como componentes implementados (histórias 2 e 3); podem aparecer nos mockups.
- Animações e transições de tema.

## Referências
- Spec: `docs/superpowers/specs/2026-11-19-blog-fut-design.md`, seções 2 (sem imagens, modo escuro), 5 (visual aprovado pelo usuário), 6.1 (tokens como fonte única), 6.2 (lista fechada de editorias), 8 (papel do designer), 12 (nome e identidade a critério do time).
- Plano: `docs/superpowers/plans/2026-11-19-blog-fut-v1.md`, "História 1" e "Foco de revisão", itens 4 (320px) e 5 (tema escuro, teste na história 7).
- `CLAUDE.md`: acessibilidade (AA, foco visível, um `h1`, 320px), interface em pt-BR, Next.js 16 (consultar `node_modules/next/dist/docs/` antes de usar `next/font`).
- Mockups e decisão: `docs/design/` (a criar pelo designer).
- ADR de estilo: `docs/adr/` (a criar pelo arquiteto).

## Notas técnicas

Arquiteto, 2026-11-19. ADRs: `docs/adr/0001-estrategia-de-estilo.md` (CSS Modules + CSS global de tokens) e `docs/adr/0002-fontes.md` (`next/font/google` com `variable`). Docs do Next consultadas: `node_modules/next/dist/docs/01-app/03-api-reference/02-components/font.md`, `01-app/01-getting-started/13-fonts.md` e `01-app/01-getting-started/08-caching.md` (seção "Random values and timestamps"; o projeto tem `cacheComponents: true` em `next.config.ts`).

Tudo nesta história é **Server Component**. Nenhum `"use client"`, nenhum `new Date()`/`Date.now()` em render (com `cacheComponents` isso quebra o prerender com `blocking-prerender-current-time`).

### Arquivos

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `src/styles/tokens.css` | criar | **Único** arquivo com cor literal. Cópia fiel de `docs/design/tokens.md`: cores (`:root`, `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {…} }`, `:root[data-theme="dark"] {…}` com o mesmo bloco), `color-scheme`, `--font-*` ligados às variáveis do `next/font`, escala `--text-*`, `--space-*`, `--layout-*`, `--radius`, `--rule-width*`, `--focus-*`, `--tap-min`. |
| `src/app/globals.css` | reescrever | Remove `--bg`/`--text` provisórios e o `padding: 16px` do body. Reset (`box-sizing`, `margin: 0`), base do `body` (tokens.md §3, "Base do body"), títulos com `text-wrap: balance`, `:focus-visible` global, `#conteudo:focus { outline: none }` (alvo programático do link de pular, não interativo), `prefers-reduced-motion`, e as classes globais `.wrap`, `.sr-only`, `.label` (`--text-label`, mono, caixa-alta), `.mono` (`tabular-nums slashed-zero`). Só `var(--…)`. |
| `src/app/fonts.ts` | criar | `export const fonteDisplay`, `fonteTexto`, `fonteMono` (opções exatas no ADR 0002) e `export const classesDeFonte: string` = as três `.variable` unidas por espaço. |
| `src/app/layout.tsx` | modificar | `import "@/styles/tokens.css"` antes de `import "./globals.css"`. `<html lang="pt-BR" className={classesDeFonte}>` (variáveis no `<html>`, ver ADR 0002). `<body>`: `<SkipLink />`, `<SiteHeader />`, `{children}`, `<SiteFooter />`. **Sem** `data-theme` no `<html>` (história 7). `metadata`: `title: "Zona Mista"`, `description: "Análise, crônica e reportagem de futebol apuradas pelo squad-fut."` |
| `src/app/page.tsx` + `page.module.css` | reescrever | Capa provisória (abaixo). Não importa nada de `@/lib/content` nem `fs`. |
| `src/lib/editorias.ts` | criar | Lista fechada (abaixo). Sem `fs`, sem React. |
| `src/lib/site.ts` | criar | `export const NOME_DO_PORTAL = "Zona Mista"`, `export const SLOGAN = "Futebol depois do apito"`, `export const ANO_DO_COLOFAO = 2026` (constante: `new Date().getFullYear()` quebraria o prerender). |
| `src/components/layout/SkipLink.tsx` + `.module.css` | criar | tokens.md §5.1. |
| `src/components/layout/SiteHeader.tsx` + `.module.css` | criar | tokens.md §5.2 (linha de data, wordmark + slogan, nav). |
| `src/components/layout/EditoriasNav.tsx` + `.module.css` | criar | `<nav aria-label>` + `<ul>` dos 7 links, reutilizada no cabeçalho e no rodapé, com variante visual. |
| `src/components/layout/SiteFooter.tsx` + `.module.css` | criar | tokens.md §5.3 (faixa noturna, wordmark `aria-hidden`, frase do squad-fut, nav do rodapé, colofão). |
| `tests/unit/editorias.test.ts`, `tokens.test.ts`, `contraste.test.ts`, `cores-literais.test.ts` | criar | Abaixo. |
| `tests/unit/helpers/css.ts` | criar | Utilitários só de teste: `removerComentarios(css)`, `extrairBloco(css, seletor)`, `lerVariaveis(bloco): Record<string, string>`, `encontrarCoresLiterais(codigo, tipo: "css" \| "ts"): string[]`, `razaoDeContraste(hexA, hexB): number`. |
| `tests/e2e/helpers.ts` | criar | `corDoToken(page, nome): Promise<string>` (sonda: cria um `div` no `body` com `style.color = "var(nome)"`, lê `getComputedStyle().color` em `rgb(…)`, remove a sonda) e `definirTema(page, tema: "light" \| "dark")`. |
| `tests/e2e/tema.spec.ts`, `layout.spec.ts`, `teclado.spec.ts`, `responsivo.spec.ts`, `fontes.spec.ts`, `acessibilidade.spec.ts`, `capa.spec.ts` | criar | Abaixo. `smoke.spec.ts` fica intacto. |
| `vitest.config.ts` | sem mudança | `include` já cobre `tests/unit/**`. Os testes de unidade leem CSS com `node:fs` dentro de `tests/` (permitido: a regra do `fs` vale para `src/`). |

### Contratos

```ts
// src/lib/editorias.ts
export const EDITORIAS = [
  { slug: "analise", rotulo: "Análise" },
  { slug: "cronica", rotulo: "Crônica" },
  { slug: "noticia", rotulo: "Notícia" },
  { slug: "coluna", rotulo: "Coluna" },
  { slug: "perfil", rotulo: "Perfil" },
  { slug: "entrevista", rotulo: "Entrevista" },
  { slug: "reportagem", rotulo: "Reportagem" },
] as const;

export type Editoria = (typeof EDITORIAS)[number]["slug"];

/** Tupla para `z.enum(SLUGS_DE_EDITORIA)` no schema da história 2. */
export const SLUGS_DE_EDITORIA = EDITORIAS.map((e) => e.slug) as unknown as readonly [Editoria, ...Editoria[]];

export function hrefDaEditoria(slug: Editoria): `/editorias/${Editoria}`;
export function rotuloDaEditoria(slug: Editoria): string;
export function isEditoria(valor: string): valor is Editoria;
```
A **ordem é a posição no array** (ordem da nav e da numeração 01–07, feita por `counter()` no CSS). Não há campo `ordem`, para não haver duas fontes de verdade. A história 2 usa `z.enum(SLUGS_DE_EDITORIA)` no schema; a 5 usa `EDITORIAS` em `generateStaticParams`.

```tsx
// src/components/layout/*
export function SkipLink(): JSX.Element;               // <a href="#conteudo">Pular para o conteúdo</a>
export function SiteHeader(props: { edicao?: Date }): JSX.Element;
export function EditoriasNav(props: { rotulo: string; variante: "cabecalho" | "rodape" }): JSX.Element;
export function SiteFooter(): JSX.Element;
```
- `SkipLink` é o **primeiro filho do `<body>`**. O `<main>` de cada página é `<main id="conteudo" tabIndex={-1}>` (o `tabIndex` faz o foco ir de fato para o `<main>` ao ativar o link).
- `EditoriasNav` renderiza `<nav aria-label={rotulo}><ul><li><a href={hrefDaEditoria(slug)}>{rotulo}</a></li>…`. O número 01–07 é só CSS (`::before`), fora do nome acessível. Cabeçalho: `rotulo="Editorias"`; rodapé: `rotulo="Editorias no rodapé"` (vem depois na ordem de Tab).
- Wordmark do cabeçalho: `<Link href="/" aria-label="Zona Mista, página inicial">Zona<i>Mista</i></Link>` (`next/link`).

### Data no cabeçalho (decisão)
- A data do cabeçalho é a **data da edição** = `publicado_em` da matéria mais recente. Ela só passa a existir na **história 4**, quando o layout obtém essa data via `getRepository()` e passa `edicao` ao `SiteHeader`.
- **Nesta história o layout não passa `edicao`.** Sem `edicao`, a linha de data mostra só o slogan "Futebol depois do apito", à esquerda e visível em todas as larguras (a regra "oculto abaixo de 30rem" vale só quando há data). Assim não sobra linha vazia no 320px.
- Rejeitado: **data do build** (`new Date()` no Server Component). Com `cacheComponents: true` dá erro de prerender; contornar com `'use cache'` congela uma data enganosa, e `connection()` + `<Suspense>` torna o layout dinâmico só por um enfeite. Rejeitado também: **data do relógio do cliente** (Client Component): exige `"use client"`, gera diferença entre HTML do servidor e hidratação (mismatch ou flash) e deixa screenshots e testes não determinísticos.
- Contrato para a história 4: helper puro `formatarEdicao(data: Date): { rotulo: string; iso: string }` com `Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" })` (ex.: `{ rotulo: "Quinta, 19.11.2026", iso: "2026-11-19" }`), renderizado em `<time dateTime={iso}>`. Fuso fixo, para o resultado não depender da máquina do build. Implementação e teste ficam na história 4.
- Homologador (critério 19): a ausência da data no cabeçalho é esperada nesta história e não reprova a comparação com o mockup.

### Capa provisória (`src/app/page.tsx`)
```tsx
<main id="conteudo" tabIndex={-1} className={`wrap ${styles.capa}`}>
  <p className="label">◇ Edição zero</p>                       {/* texto secundário: --color-ink-muted */}
  <h1>A Zona Mista abre em breve</h1>                            {/* único h1: --font-display, --text-display */}
  <p>Análise, crônica e reportagem de futebol, apuradas e escritas pelo squad-fut. As primeiras matérias estão sendo preparadas.</p>
  <p><a href="/editorias/analise">Conheça a editoria de Análise</a></p>  {/* link: --color-accent; 404 por ora */}
</main>
```
O texto final é livre, desde que tenha 1 `h1`, 1 parágrafo de apresentação, 1 link e 1 texto secundário. O wordmark do cabeçalho **não** é `h1`.

### Dependências novas
- `@axe-core/playwright` versão exata **`4.14.0`** (devDependency; publicada em 2026-10-15; traz `axe-core ~4.14.0`; peer `playwright-core >= 1.0.0`, já atendido por `@playwright/test ^1.65.1`). Motivo: o critério 10 pede verificação automatizada de contraste nos dois temas; calcular à mão sobre o DOM seria frágil.
- Nenhuma outra. Sem Tailwind (ADR 0001), sem Testing Library (os componentes são verificados pelo e2e).

### Como testar (padrões)
- **Tema do sistema:** `test.describe("sistema escuro", () => { test.use({ colorScheme: "dark" }); … })`, e o mesmo com `"light"`.
- **Atributo vencendo o sistema:** depois de `page.goto("/")`, `definirTema(page, "dark")` faz `page.evaluate(t => document.documentElement.setAttribute("data-theme", t), tema)`, dentro de um `describe` com `colorScheme` oposto.
- **Cor esperada:** nada de hex no e2e. Comparar `getComputedStyle(document.body).backgroundColor` com `await corDoToken(page, "--color-bg")` e afirmar também que o valor do escuro difere do claro (`expect(escuro).not.toBe(claro)`), para o teste não passar com os dois temas iguais.
- **320px:** `test.use({ viewport: { width: 320, height: 720 } })`; `document.documentElement.scrollWidth <= 320`; `boundingBox()` do `h1` e do parágrafo com `x >= 16` e `x + width <= 304`.
- **Ordem de Tab:** depois de `page.goto("/")`, `page.keyboard.press("Tab")` 9 vezes; após cada uma, ler o `href` de `document.activeElement` e comparar com `["#conteudo", "/", ...EDITORIAS.map((e) => hrefDaEditoria(e.slug))]`. No spec, importar por caminho relativo (`../../src/lib/editorias`), sem depender do alias `@/`.
- **Foco visível:** para cada elemento focado, `getComputedStyle(el)` com `outlineStyle === "solid"`, `outlineWidth === "3px"` e `outlineColor === await corDoToken(page, "--color-focus")`. Link de pular: `--color-ink`. Links do rodapé: `--color-focus-night`.
- **Rede de fontes:** antes do `goto`, `page.on("request", (r) => { if (/fonts\.(googleapis|gstatic)\.com/.test(r.url())) externas.push(r.url()); })`; depois `waitForLoadState("networkidle")` e `expect(externas).toEqual([])`. Complemento: pelo menos uma requisição com `resourceType() === "font"` vinda de `/_next/static/media/` (prova que a fonte carregou, e de onde).
- **font-family computado:** `h1` casa `/Instrument[ _]Serif/`; o parágrafo casa `/Instrument[ _]Sans/` e não casa `/Serif/`; `.label` casa `/Geist[ _]Mono/`. Regex, porque o Next gera o nome da família.
- **Contraste (axe):** `await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze()` e `expect(results.violations).toEqual([])`, nos dois temas do sistema e com `data-theme` forçado. O axe não mede contorno de foco: isso fica no teste de unidade de contraste dos tokens.
- **Cores literais (Vitest):** `cores-literais.test.ts` percorre recursivamente `src/` (`.css`, `.ts`, `.tsx`), ignora só `src/styles/tokens.css`, remove comentários e falha listando `arquivo:linha:trecho`. Em `.css`: hex `#[0-9a-fA-F]{3,8}\b` dentro de valores de propriedade; funções `rgb(`, `rgba(`, `hsl(`, `hsla(`, `hwb(`, `lab(`, `lch(`, `oklab(`, `oklch(`, `color(`; e **nomes de cor CSS** (constante com os nomes do CSS Color 4 no helper) como palavra inteira em qualquer valor de propriedade. Em `.ts`/`.tsx`: as mesmas funções e o hex dentro de strings, mais nomes de cor em `style={{…}}`; o hex não pode casar `href="#conteudo"` (exigir que a string inteira seja um hex, ex. `/["'`]#[0-9a-fA-F]{3,8}["'`]/`, ou que esteja após `:` num objeto de estilo). Exceções: `transparent`, `currentColor`, `inherit`, `initial`, `unset`. O helper tem testes próprios com casos positivos (`#fff`, `rgb(0 0 0)`, `oklch(…)`, `color: white`, `style={{ color: "red" }}`) e negativos (`transparent`, `currentColor`, `href="#conteudo"`, `var(--color-ink)`).

### Critérios de aceite → prova

| # | Prova | Nome do teste / o que afirma |
|---|---|---|
| 1–3 | inspeção (orquestrador) | `docs/design/01-identidade-visual/` com as 2 direções (e as 2 variações da v2), mockups e tabelas de contraste. Já entregue pelo designer. |
| 4 | inspeção + Vitest | `docs/design/01-identidade-visual/decisao.md` com direção, data e ajustes; `tokens.test.ts` prova que os valores implementados batem com a direção. |
| 5 | inspeção | `docs/adr/0001-estrategia-de-estilo.md`. |
| 6 | Vitest `tests/unit/tokens.test.ts` | "define todos os tokens obrigatórios em :root" (lista da §6 de tokens.md); "o bloco escuro do @media e o [data-theme=dark] têm as mesmas variáveis e valores"; "os valores claro e escuro batem com docs/design/tokens.md" (lê o bloco css da §1 de tokens.md e compara variável a variável com `src/styles/tokens.css`); "--font-display/--font-text/--font-mono referenciam --font-instrument-serif/--font-instrument-sans/--font-geist-mono". |
| 7 | e2e `tema.spec.ts` | "sem data-theme, sistema escuro mostra o tema escuro" e "sem data-theme, sistema claro mostra o tema claro": `html` sem `data-theme`; `body` com `backgroundColor` = `corDoToken("--color-bg")` e `color` = `--color-ink`; o fundo difere entre os dois casos. |
| 8 | e2e `tema.spec.ts` | "data-theme=dark vence sistema claro" e "data-theme=light vence sistema escuro": o fundo do `body` é igual ao fundo do tema forçado obtido sem atributo no esquema correspondente, e difere do fundo do sistema. |
| 9 | Vitest `tests/unit/cores-literais.test.ts` | "nenhuma cor literal em src/ fora de src/styles/tokens.css" + "o detector acha os casos positivos e ignora os negativos". |
| 10 | e2e `acessibilidade.spec.ts` + Vitest `contraste.test.ts` | e2e: "sem violações axe na capa: sistema claro", "sistema escuro", "data-theme=dark", "data-theme=light". Unidade, com valores lidos de `src/styles/tokens.css`: "pares de texto da §2 de tokens.md >= 4,5 nos dois temas" e "foco >= 3: --color-focus/--color-bg, --color-focus-night/--color-night, --color-ink/--color-amber (link de pular)". |
| 11 | e2e `fontes.spec.ts` + inspeção | "não requisita fonts.googleapis.com nem fonts.gstatic.com" e "carrega fontes de /_next/static/media". Inspeção: `src/app/fonts.ts` usa `next/font/google`, nenhum `<link>` de fontes. |
| 12 | e2e `fontes.spec.ts` | "h1 em Instrument Serif, parágrafo em Instrument Sans, rótulo em Geist Mono" (regex no `font-family` computado). |
| 13 | e2e `smoke.spec.ts` (existente) | `html[lang="pt-BR"]`. |
| 14 | Vitest `editorias.test.ts` + e2e `layout.spec.ts` | Unidade: "EDITORIAS tem os 7 slugs na ordem da spec", "rótulos com acento", "hrefDaEditoria monta /editorias/<slug>", "isEditoria aceita só a lista fechada", "SLUGS_DE_EDITORIA tem a mesma ordem de EDITORIAS". e2e: "o nome do portal é link para /" (`getByRole("link", { name: "Zona Mista, página inicial" })` com `href="/"`, dentro de `banner`) e "nav Editorias tem os 7 links na ordem, com rótulo e destino" (`getByRole("navigation", { name: "Editorias", exact: true }).getByRole("link")`: `toHaveCount(7)`, nomes e `href` exatos). |
| 15 | e2e `layout.spec.ts` | "rodapé tem o nome do portal e a frase do squad-fut": `getByRole("contentinfo")` contém "Zona Mista" e casa `/produzidas pelo squad-fut/`. |
| 16 | e2e `teclado.spec.ts` | "o primeiro Tab foca o link de pular, e ele fica visível" (`toBeFocused`, `toBeInViewport`); "Enter no link de pular leva ao main" (URL termina em `#conteudo` e `main#conteudo` `toBeFocused`). |
| 17 | e2e `teclado.spec.ts` | "ordem de Tab: pular, nome, 7 editorias" e "cada um tem contorno sólido de 3px na cor do token de foco", num `describe` por `colorScheme` (light, dark). Extra: "links do rodapé usam --color-focus-night". |
| 18 | e2e `responsivo.spec.ts` | Em 320px, nos dois temas: "sem rolagem horizontal" (`scrollWidth <= 320`); "margem lateral >= 16px" (h1 e parágrafo); "os 7 links de editoria estão visíveis e dentro da viewport" (`toBeVisible` + `boundingBox` com `x >= 0` e `x + width <= 320`). |
| 19 | homologador | Screenshots em 1280px, claro e escuro, de cabeçalho, rodapé, link de pular focado e foco na nav, comparados com `zona-mista-v2/variacao-2/capa.html` e `test-results/design/01-v2/`. Data do cabeçalho ausente por decisão (acima). |
| 20 | e2e `capa.spec.ts` + inspeção | "a capa tem um único h1" (`getByRole("heading", { level: 1 })` `toHaveCount(1)`); "tem parágrafo, link e texto secundário" (link visível dentro do `main`; o texto secundário tem `color` = `corDoToken("--color-ink-muted")`). Inspeção do code-reviewer: `page.tsx` não importa `@/lib/content` nem `fs`. |
| 21 | portões | `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e`, `npm run build`. |

### Riscos para o code-reviewer
- `classesDeFonte` no `<html>`, não no `<body>` (senão `--font-display` resolve para o fallback).
- `axes: ['wdth']` no Instrument Sans; sem ele `font-stretch: 92%` não tem efeito.
- O build depende de rede para baixar as fontes (ADR 0002). Se o CI ou o deploy falharem por isso, trocar para `next/font/local`.
- O bloco `[data-theme="dark"]` repete o do `@media`: o `tokens.test.ts` precisa existir e passar.
- Nenhum `new Date()`/`getFullYear()` em render (`cacheComponents: true`).
- Regex de cores literais sem falso positivo em `href="#conteudo"` e sem falso negativo em `style={{ color: "red" }}`.
- `main` com `tabIndex={-1}` e sem contorno no foco programático, sem afetar o `:focus-visible` dos links.
