# ADR 0001: Estratégia de estilo (CSS Modules + CSS global de tokens)

**Status:** aceito · **Data:** 2026-11-19 · **História:** `docs/backlog/01-identidade-visual.md` (critério 5)

## Contexto
- A spec (seção 6.1) deixa ao arquiteto a escolha entre Tailwind CSS e CSS Modules. O que importa é que os tokens sejam a **fonte única** de cor e tipografia.
- O designer entregou os tokens como **variáveis CSS** (`docs/design/tokens.md`), com tema escuro por `prefers-color-scheme` e por `[data-theme="dark"]`/`[data-theme="light"]`, e os componentes de base descritos em CSS puro (seletores, `::before` com `counter()`, `:focus-visible`, `font-stretch`, `clamp()`).
- O projeto foi criado **sem Tailwind**. Não há `tailwindcss` nem `@tailwindcss/postcss` em `package.json`.
- O critério 9 exige que nenhuma cor literal apareça fora do arquivo de tokens, verificável por busca no código.
- O design não usa nenhum utilitário ou animação; é pouca CSS, muito específica (wordmark, nav numerada, faixa noturna).

## Decisão
**CSS Modules por componente + um CSS global só de tokens e base.**
- `src/styles/tokens.css`: o **único** arquivo com cores literais. Contém exatamente o bloco de `docs/design/tokens.md` (cores claro/escuro, fontes, escala, espaço, larguras, UI).
- `src/app/globals.css`: reset, base do `body`, `:focus-visible`, `prefers-reduced-motion`, classes globais mínimas (`.wrap`, `.sr-only`, `.label`, `.mono`). Só usa `var(--…)`.
- `Componente.module.css` ao lado de cada componente (`src/components/**`, `src/app/**`). Só usa `var(--…)`.
- Os dois CSS globais são importados uma única vez, no `src/app/layout.tsx` (tokens primeiro).

## Alternativas consideradas
1. **Tailwind CSS v4** (`@theme` mapeando as variáveis). Prós: velocidade em telas novas, sem nomear classes. Contras: nova dependência + PostCSS; duplicaria os tokens num segundo vocabulário (`bg-…`, `text-…`) que precisa ficar em sincronia; classes arbitrárias (`bg-[#fff]`) tornam o critério 9 mais difícil de garantir por regex; `counter()`, `::before`, `font-stretch` e o `:not([data-theme])` iam virar CSS custom de qualquer forma. Rejeitada.
2. **Só CSS global** (um arquivo grande). Prós: zero configuração. Contras: colisão de nomes entre histórias, arquivo cresce sem dono. Rejeitada.
3. **CSS-in-JS** (styled-components, vanilla-extract). Contras: dependência, custo em Server Components, sem ganho sobre variáveis CSS. Rejeitada.

## Consequências
- Nenhuma dependência nova. CSS Modules é nativo no Next 16.
- Tema escuro e a futura troca de tema (história 7) só mexem no atributo `data-theme` do `<html>`; nenhum componente conhece o tema.
- O teste `tests/unit/cores-literais.test.ts` varre `src/` e falha se houver cor literal fora de `src/styles/tokens.css`. Com Tailwind isso seria menos confiável.
- `docs/design/tokens.md` continua sendo a fonte; `src/styles/tokens.css` é a cópia executável. O teste `tests/unit/tokens.test.ts` protege a duplicação interna (bloco escuro de `@media` = bloco `[data-theme="dark"]`).
- Breakpoints ficam literais nas media queries (`30rem`, `48rem`, `56rem`, `64rem`); CSS não aceita `var()` em media query.
- Se um dia a quantidade de telas justificar utilitários, Tailwind v4 pode ser adicionado lendo as mesmas variáveis, sem reescrever os tokens (novo ADR).
