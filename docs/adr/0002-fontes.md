# ADR 0002: Fontes com `next/font/google` e variáveis CSS

**Status:** aceito · **Data:** 2026-11-19 · **História:** `docs/backlog/01-identidade-visual.md` (critérios 11 e 12)

Documentação consultada (Next 16.4.6):
- `node_modules/next/dist/docs/01-app/03-api-reference/02-components/font.md` (opções `weight`, `style`, `subsets`, `axes`, `variable`, `display`; seções "CSS Variables", "Using a font definitions file", "Preloading").
- `node_modules/next/dist/docs/01-app/01-getting-started/13-fonts.md` ("built-in self-hosting": arquivos servidos do próprio domínio, nenhuma requisição ao Google no navegador).
- Metadados das famílias: `node_modules/next/dist/compiled/@next/font/dist/google/font-data.json`.

## Contexto
A direção aprovada usa três famílias do Google Fonts: Instrument Serif (títulos, só peso 400, normal e itálico), Instrument Sans (texto, variável `wght` 400–700 e eixo `wdth` 75–100, a nav usa `font-stretch: 92%`) e Geist Mono (dados). O critério 11 proíbe requisições a `fonts.googleapis.com`/`fonts.gstatic.com` em runtime. Os tokens `--font-display`, `--font-text`, `--font-mono` precisam continuar sendo a fonte única.

## Decisão
1. **`next/font/google`**, chamado uma única vez num arquivo de definições `src/app/fonts.ts`, importado só pelo root layout (preload em todas as rotas, conforme "Preloading").
2. **Método de variável CSS** (`variable`), não `className`. Variáveis próprias, para não colidir com os tokens:
   - `Instrument_Serif({ weight: '400', style: ['normal', 'italic'], subsets: ['latin'], variable: '--font-instrument-serif' })`. Fonte não variável: `weight` é obrigatório; `style` em array vale porque ela não é variável.
   - `Instrument_Sans({ subsets: ['latin'], axes: ['wdth'], variable: '--font-instrument-sans' })`. Sem `weight` (padrão `'variable'`, cobre 400–700). `axes: ['wdth']` inclui o eixo de largura, necessário para `font-stretch: 92%`. Só `style` normal (o design não usa itálico na sans).
   - `Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })`. Variável, sem `weight`.
   - `display` fica no padrão (`'swap'`); `adjustFontFallback` no padrão (`true`) para reduzir CLS.
3. As três `.variable` vão no **`<html>`** (`className={\`${serif.variable} ${sans.variable} ${mono.variable}\`}`). Motivo: `--font-display: var(--font-instrument-serif), …` é declarado em `:root`; a variável referenciada precisa existir no mesmo elemento (ou num ancestral) para ser resolvida. No `<body>` ela não seria vista por `:root`.
4. `src/styles/tokens.css` liga os tokens às variáveis com fallback de sistema, exatamente como em `docs/design/tokens.md` seção 3.
5. Subconjunto só `latin` (cobre o português; `latin-ext` não é necessário).

## Alternativas consideradas
- **`<link>` para Google Fonts**: viola o critério 11 e adiciona bloqueio de renderização. Rejeitada.
- **`next/font/local` com arquivos `.woff2` no repositório**: build offline e determinístico, mas exige baixar/atualizar arquivos manualmente e conferir a licença de cada um. Fica como plano B se o build em CI/deploy não tiver acesso à rede.
- **`className` em vez de `variable`**: aplicaria só uma família por elemento e esconderia a fonte dos tokens. Rejeitada.

## Consequências
- Os arquivos de fonte são baixados **no build** e servidos de `/_next/static/media/`. **O `npm run build` precisa de rede** para o Google na primeira vez (e no deploy). Se o ambiente de build ficar offline, migrar para `next/font/local` (novo ADR).
- O `font-family` computado terá o nome gerado pelo Next (contém "Instrument Serif"/"Instrument Sans"/"Geist Mono" e um "Fallback"); os testes usam regex, não igualdade.
- `font-stretch: 92%` depende do eixo `wdth` estar no arquivo baixado; o code-reviewer confere `axes: ['wdth']` e o homologador confere visualmente a nav.
