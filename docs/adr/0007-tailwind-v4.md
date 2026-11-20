# ADR 0007: Tailwind CSS v4 com os tokens no `@theme`

**Status:** aceito · **Data:** 2026-11-20 · **História:** `docs/backlog/11-tailwind.md` · **Substitui:** ADR 0001

## Contexto
- O ADR 0001 escolheu CSS Modules por componente. Com a v1 andando, as próximas telas (capa, editorias, tags, busca) pedem velocidade. O usuário pediu a troca para Tailwind (2026-11-20) e escolheu Tailwind v4 + `@theme` + uma camada mínima de componentes.
- Os tokens já existem como variáveis CSS em `src/styles/tokens.css`, com tema escuro por `prefers-color-scheme` e por `[data-theme]`. Os nomes já seguem os namespaces do Tailwind v4 (`--color-*`, `--font-*`, `--text-*`).
- O visual não podia mudar. A migração foi conferida por screenshots de referência gerados antes da troca (`tests/e2e/visual.spec.ts`).

## Decisão
**Tailwind v4 via `@tailwindcss/postcss`, com os tokens expostos por `@theme inline reference`.**

### Onde o Tailwind procura classes
- `@import "tailwindcss" source("../");` em `src/app/globals.css`. O caminho é relativo ao arquivo, então só `src/` é varrido.
- Sem isso, a detecção automática varre o projeto inteiro. Os exemplos de `tests/` e `docs/` viravam CSS de produção: os casos positivos do teste de cores (`.bg-[#fff]` etc.) saíam no build.
- `tests/e2e/css-do-build.spec.ts` lê o CSS que a página baixa e falha se algum utilitário arbitrário tiver cor literal, se as paletas ou as fontes padrão chegarem ao build ou se houver referência circular de token.

### Como os tokens são expostos (`src/app/globals.css`)
- `src/styles/tokens.css` continua sendo a fonte executável e o **único** arquivo com cor literal. Ele não mudou.
- Um `@theme` desliga o padrão do Tailwind: `--color-*: initial`, `--font-*: initial`, `--text-*: initial`. Assim `bg-red-500`, `font-sans` ou `text-xl` não geram CSS. O mesmo bloco troca os breakpoints pelos de `tokens.md` §4: `sm` 40rem, `md` 48rem, `grade` 56rem, `lg` 64rem.
- Um `@theme inline reference` aponta cada token para ele mesmo: `--color-bg: var(--color-bg)`, `--font-display: var(--font-display)`, `--text-h1: var(--text-h1)` etc.
  - `inline` faz o utilitário usar o valor direto: `bg-bg` vira `background-color: var(--color-bg)`. Como `var()` é resolvido no navegador, a troca de tema de `tokens.css` continua valendo sem nenhum componente saber do tema.
  - `reference` impede o Tailwind de reemitir essas variáveis no `:root`. Sem ele, sairia `--color-bg: var(--color-bg)` no CSS final, uma referência circular.
- Resultado: `bg-bg`, `text-ink`, `border-rule-strong`, `outline-focus-night`, `font-display`, `font-text`, `font-mono`, `text-h1`, `text-label`… Os utilitários de tamanho (`text-h1`) só definem `font-size`; a altura de linha vem sempre explícita (`leading-[0.93]`), como no CSS de antes.
- Espaços e larguras que não são cor nem tipografia são lidos direto da variável, com a sintaxe curta do v4: `pt-(--space-section)`, `px-(--layout-gutter)`, `max-w-(--layout-measure)`, `min-h-(--tap-min)`, `border-t-(length:--rule-width)`. Valores pontuais do mockup ficam arbitrários (`mt-[1.1rem]`).
- `tests/unit/tailwind.test.ts` confere que o `@theme` cobre todas as cores, fontes e tamanhos de `tokens.css`, que cada entrada é só `var(--mesmo-nome)` e que o padrão está desligado.

### O que fica no `@layer components`
CSS que não cabe bem em classe utilitária. Fica em `globals.css`, só com `var(--…)`, e qualquer utilitário no JSX vence esta camada:
- `.wrap`, `.label` e `.mono`, as classes globais de antes (os testes e2e usam `.label`);
- `.nav-numerada`: o contador `01–07` da nav do cabeçalho (`counter-reset`, `counter-increment`, `::before` com `counter()`);
- `.prosa`: o corpo da matéria, que vem do Markdown sem classes, por isso é estilizado por seletor de elemento (`p`, `h2`, `blockquote`, listas, `::first-line`, `::after`).

Os seletores de tema continuam em `tokens.css`, que não está em camada. No `@layer base` ficam a base do `body`, títulos, links, `:focus-visible` e `prefers-reduced-motion`, sobre o preflight do Tailwind. O preflight muda alguns elementos que o sanitizador aceita (ADR 0004), e a `.prosa` trata cada um:
- **devolvidos ao comportamento anterior:**
  - marcadores das listas (`disc`/`decimal`, e `circle`/`square` nas aninhadas);
  - `hr`: margem `0.5em`, fio de `--rule-width` na cor `--color-rule` (antes era o cinza do navegador; agora a cor vem do token);
  - `code`, `kbd`, `samp` e `pre`: menores que o texto (`0.875em`, como o monospace do navegador) e na fonte `--font-mono`, e não no monospace genérico, para não ter fonte fora dos tokens. O `pre` volta a ter margem embaixo e ganha `overflow-x: auto` para não criar rolagem horizontal no 320px;
  - `h5` e `h6`: `0.83em` e `0.67em`, como no navegador. O `h4` já tinha o tamanho do texto, e a margem zero e o peso 400 dos títulos já vinham da base antiga.
- **aceito como melhoria:** `img` com `display: block` e `max-width: 100%` do preflight (uma imagem larga não vaza a coluna). Outros ajustes do preflight sem efeito na leitura (`table` com `border-collapse`, `sub`/`sup`) também ficam.
- `tests/e2e/prosa-elementos.spec.ts` injeta esses elementos no corpo de uma matéria e confere o estilo computado.

### Regra de cor arbitrária
- É proibido usar cor fora dos tokens nas classes: hex em valor arbitrário (`bg-[#fff]`, `shadow-[0_0_0_2px_#000]`), função de cor (`rgb(`, `hsl(`, `oklch(`…) ou nome de cor CSS dentro de `[...]` (`[color:white]`), e as paletas padrão (`bg-red-500`, `text-slate-900`, `text-white`). `text-amber` é permitido porque `amber` é token do portal; `text-amber-500` não.
- Cor de token entra pelo nome do tema (`bg-night`) ou por variável (`bg-(--color-night)`, `shadow-[0_0_0_var(--focus-offset)_var(--color-bg)]`).
- O fallback literal de variável também é proibido: `bg-(--x,#fff)`.
- Verificação: `tests/unit/cores-literais.test.ts` varre todo `.ts`/`.tsx` de `src/` com `encontrarCoresArbitrariasEmClasses` (`tests/unit/helpers/css.ts`) e continua garantindo que nenhum CSS fora de `tokens.css` tem cor literal. Como as paletas estão desligadas, uma classe de paleta que escapasse do teste também não geraria CSS.

## Alternativas consideradas
1. **`@theme` com os valores literais** (mover os tokens para dentro do Tailwind). Rejeitada: duplicaria `tokens.css` e o tema escuro (`prefers-color-scheme` + `[data-theme]`) teria de ser refeito com variantes.
2. **`@theme inline` sem `reference`.** Funciona, porque as variáveis de `tokens.css` não estão em camada e vencem as de `@layer theme`, mas deixa `--color-bg: var(--color-bg)` no CSS final. Rejeitada por ser frágil e confusa.
3. **Manter CSS Modules** (ADR 0001). Rejeitada a pedido do usuário.

## Consequências
- Dependências novas, todas com versão exata: `tailwindcss` e `@tailwindcss/postcss` 4.3.5, `prettier-plugin-tailwindcss` 0.8.1 (ordena as classes no `pnpm format`). Config em `postcss.config.mjs`.
- Nenhum `*.module.css` em `src/`; o único CSS além de `tokens.css` é `src/app/globals.css`.
- `hover:` do Tailwind v4 só vale em dispositivos com hover (`@media (hover: hover)`). Nos links com utilitário, o hover deixa de “grudar” no toque. O visual com mouse e as capturas são idênticos. Por coerência, o hover dos links da `.prosa` também fica dentro de `@media (hover: hover)`.
- A regressão visual (`tests/e2e/visual.spec.ts`) fica como rede de segurança para as próximas mudanças de estilo. As referências têm sufixo `-win32`; quando houver CI em Linux, será preciso gerar as do Linux.
