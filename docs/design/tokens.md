# Tokens do portal Zona Mista

**Fonte oficial e única** de cor, tipografia e medidas do portal. Direção aprovada em 2026-11-19: Zona Mista v2, variação 2 "Súmula" (veja `docs/design/01-identidade-visual/decisao.md`).
Mockups de referência: `docs/design/01-identidade-visual/zona-mista-v2/variacao-2/capa.html` e `materia.html`.

Regras:
- Fora do arquivo que define estes tokens, nenhum CSS usa cor literal (critério 9). Exceções: `transparent`, `currentColor`, `inherit`.
- Raio 0 em tudo. Sem cartões, sem sombras. Separação por filetes.
- Os nomes abaixo são definitivos. Os nomes curtos dos mockups (`--bg`, `--hair`, `--led`…) aparecem na coluna "mockup" só para conferência.

## 1. Cores

| Token | Uso | Claro | Escuro | mockup |
|---|---|---|---|---|
| `--color-bg` | fundo da página (papel) | `#EFEEE9` | `#0E1120` | `--bg` |
| `--color-surface` | superfície. O design não tem cartões: a superfície é o próprio papel | `#EFEEE9` | `#0E1120` | (= `--bg`) |
| `--color-ink` | texto principal, títulos | `#16181D` | `#ECEBE5` | `--ink` |
| `--color-ink-muted` | texto secundário: linha fina, datas, metadados, números da nav | `#585B63` | `#A3A7B6` | `--muted` |
| `--color-rule` | filete fino de 1px, **decorativo** (não usar como única pista de UI) | `#C9C7BF` | `#272B3F` | `--hair` |
| `--color-rule-strong` | regras de seção e borda superior da nav | `#16181D` | `#ECEBE5` | (= `--ink`) |
| `--color-accent` | azul-caneta: links, editoria, item ativo da nav, hover | `#2638C9` | `#9DAAFF` | `--accent` |
| `--color-amber` | âmbar do placar: chapéu e destaques **sobre a faixa noturna**, fundo do link de pular. **Nunca como texto sobre o papel claro** (≈1,6:1) | `#FFB000` | `#FFB000` | `--led` |
| `--color-night` | faixa noturna: destaque da capa, topo da matéria, rodapé | `#0E1120` | `#1A2142` | `--night` |
| `--color-night-ink` | texto sobre a faixa noturna | `#ECEBE5` | `#ECEBE5` | `--night-text` |
| `--color-night-ink-muted` | texto secundário sobre a faixa | `#A3A7B6` | `#A3A7B6` | `--night-muted` |
| `--color-night-rule` | filete de 1px sobre a faixa | `#2C3148` | `#343C63` | `--night-hair` |
| `--color-badge-bg` | fundo do selo "◇ EXEMPLO" | `#FFB000` | `#FFB000` | `--badge-bg` |
| `--color-badge-ink` | texto do selo e do link de pular | `#16181D` | `#16181D` | `--badge-text` |
| `--color-notice-bg` | fundo do aviso de conteúdo fictício | `#FFE9B0` | `#2B2410` | `--notice-bg` |
| `--color-notice-ink` | texto e filetes de 2px do aviso | `#16181D` | `#FFE2A0` | `--notice-text` |
| `--color-focus` | contorno de foco sobre o papel | `#2638C9` | `#9DAAFF` | `--focus` |
| `--color-focus-night` | contorno de foco sobre a faixa noturna e o rodapé | `#FFB000` | `#FFB000` | (= `--led`) |

No escuro a faixa noturna sobe para `#1A2142` para continuar se destacando do fundo `#0E1120`.

### Definição (copiar para o arquivo de tokens)

```css
:root {
  --color-bg: #EFEEE9;
  --color-surface: #EFEEE9;
  --color-ink: #16181D;
  --color-ink-muted: #585B63;
  --color-rule: #C9C7BF;
  --color-rule-strong: #16181D;
  --color-accent: #2638C9;
  --color-amber: #FFB000;
  --color-night: #0E1120;
  --color-night-ink: #ECEBE5;
  --color-night-ink-muted: #A3A7B6;
  --color-night-rule: #2C3148;
  --color-badge-bg: #FFB000;
  --color-badge-ink: #16181D;
  --color-notice-bg: #FFE9B0;
  --color-notice-ink: #16181D;
  --color-focus: #2638C9;
  --color-focus-night: #FFB000;
  color-scheme: light;
}

/* valores escuros: mesmos nos dois blocos abaixo */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --color-bg: #0E1120;
    --color-surface: #0E1120;
    --color-ink: #ECEBE5;
    --color-ink-muted: #A3A7B6;
    --color-rule: #272B3F;
    --color-rule-strong: #ECEBE5;
    --color-accent: #9DAAFF;
    --color-night: #1A2142;
    --color-night-rule: #343C63;
    --color-notice-bg: #2B2410;
    --color-notice-ink: #FFE2A0;
    --color-focus: #9DAAFF;
    color-scheme: dark;
  }
}
:root[data-theme="dark"] {
  /* repetir exatamente o bloco escuro acima */
}
```

Tokens que não mudam no escuro (`--color-amber`, `--color-night-ink`, `--color-night-ink-muted`, `--color-badge-*`, `--color-focus-night`) não precisam ser repetidos. A ordem de precedência atende aos critérios 7 e 8: sem atributo vale o sistema; `data-theme="dark"` força o escuro; `data-theme="light"` bloqueia o escuro do sistema pelo `:not()`.

## 2. Contraste (WCAG 2.x, calculado)

Script: `test-results/design/contraste-v2.mjs` (saída em `contraste-v2.out.md`).

### Claro
| Par | Texto | Fundo | Razão | Mínimo |
|---|---|---|---|---|
| `--color-ink` / `--color-bg` | `#16181D` | `#EFEEE9` | 15,29:1 | 4,5:1 |
| `--color-ink-muted` / `--color-bg` | `#585B63` | `#EFEEE9` | 5,85:1 | 4,5:1 |
| `--color-accent` / `--color-bg` (links, editoria) | `#2638C9` | `#EFEEE9` | 7,26:1 | 4,5:1 |
| `--color-badge-ink` / `--color-badge-bg` (selo, link de pular) | `#16181D` | `#FFB000` | 9,69:1 | 4,5:1 |
| `--color-notice-ink` / `--color-notice-bg` | `#16181D` | `#FFE9B0` | 14,83:1 | 4,5:1 |
| `--color-night-ink` / `--color-night` (rodapé) | `#ECEBE5` | `#0E1120` | 15,70:1 | 4,5:1 |
| `--color-night-ink-muted` / `--color-night` | `#A3A7B6` | `#0E1120` | 7,82:1 | 4,5:1 |
| `--color-amber` / `--color-night` | `#FFB000` | `#0E1120` | 10,24:1 | 4,5:1 |
| `--color-rule-strong` / `--color-bg` (UI) | `#16181D` | `#EFEEE9` | 15,29:1 | 3:1 |
| `--color-focus` / `--color-bg` (UI) | `#2638C9` | `#EFEEE9` | 7,26:1 | 3:1 |
| `--color-focus-night` / `--color-night` (UI) | `#FFB000` | `#0E1120` | 10,24:1 | 3:1 |

### Escuro
| Par | Texto | Fundo | Razão | Mínimo |
|---|---|---|---|---|
| `--color-ink` / `--color-bg` | `#ECEBE5` | `#0E1120` | 15,70:1 | 4,5:1 |
| `--color-ink-muted` / `--color-bg` | `#A3A7B6` | `#0E1120` | 7,82:1 | 4,5:1 |
| `--color-accent` / `--color-bg` | `#9DAAFF` | `#0E1120` | 8,60:1 | 4,5:1 |
| `--color-amber` / `--color-bg` (números, capitular) | `#FFB000` | `#0E1120` | 10,24:1 | 4,5:1 |
| `--color-badge-ink` / `--color-badge-bg` | `#16181D` | `#FFB000` | 9,69:1 | 4,5:1 |
| `--color-notice-ink` / `--color-notice-bg` | `#FFE2A0` | `#2B2410` | 12,21:1 | 4,5:1 |
| `--color-night-ink` / `--color-night` | `#ECEBE5` | `#1A2142` | 13,12:1 | 4,5:1 |
| `--color-night-ink-muted` / `--color-night` | `#A3A7B6` | `#1A2142` | 6,54:1 | 4,5:1 |
| `--color-amber` / `--color-night` | `#FFB000` | `#1A2142` | 8,55:1 | 4,5:1 |
| `--color-rule-strong` / `--color-bg` (UI) | `#ECEBE5` | `#0E1120` | 15,70:1 | 3:1 |
| `--color-focus` / `--color-bg` (UI) | `#9DAAFF` | `#0E1120` | 8,60:1 | 3:1 |
| `--color-focus-night` / `--color-night` (UI) | `#FFB000` | `#1A2142` | 8,55:1 | 3:1 |

Pior texto: `--color-ink-muted` no claro, 5,85:1. Pior UI: foco azul no claro, 7,26:1. `--color-rule` é decorativo e não entra na conta de 3:1.
Proibido: `--color-amber` como texto sobre `--color-bg` no claro; `--color-ink-muted` sobre `--color-night` (use `--color-night-ink-muted`); `--color-focus` sobre a faixa (use `--color-focus-night`).

## 3. Tipografia

### Fontes (`next/font/google`)

| Token | Família | Import | Opções |
|---|---|---|---|
| `--font-display` | Instrument Serif | `Instrument_Serif` | `weight: '400'`, `style: ['normal', 'italic']`, `subsets: ['latin']` (o itálico é obrigatório: wordmark e títulos de seção) |
| `--font-text` | Instrument Sans | `Instrument_Sans` | variável (`wght` 400–700), `axes: ['wdth']` (a nav usa `font-stretch: 92%`), `subsets: ['latin']`; pesos usados 400, 500, 600, 700 |
| `--font-mono` | Geist Mono | `Geist_Mono` | variável (`wght`), `subsets: ['latin']`; pesos usados 500 e 600 |

Sugestão de ligação, para não colidir com os tokens: as fontes expõem variáveis próprias e os tokens as referenciam com o fallback.

```ts
// variable: '--font-instrument-serif' | '--font-instrument-sans' | '--font-geist-mono'
```
```css
:root {
  --font-display: var(--font-instrument-serif), "Times New Roman", Georgia, serif;
  --font-text: var(--font-instrument-sans), system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --font-mono: var(--font-geist-mono), ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
}
```
O arquiteto confere a API exata em `node_modules/next/dist/docs/` (Next 16). Nada de `<link>` para Google Fonts no app (critério 11); o `<link>` existe só nos mockups.

### Escala

| Token | Valor | Altura de linha | Estilo / uso |
|---|---|---|---|
| `--text-label` | `.6875rem` (11px) | `1.4` | mono 500 (600 no selo), caixa-alta, `letter-spacing: .08em`, `tabular-nums slashed-zero`. Data do cabeçalho, chapéu, selo, metadados, colofão |
| `--text-nav-index` | `.625rem` (10px) | `1` | mono 500, número 01–07 da nav |
| `--text-nav` | `.9375rem`; `1rem` a partir de 64rem | `1` | sans 500, `font-stretch: 92%` |
| `--text-body` | `clamp(1.0625rem, 1rem + .25vw, 1.15rem)` | `1.68` | sans 400, texto corrido |
| `--text-lead` | `clamp(1.25rem, 1.1rem + .6vw, 1.5rem)` | `1.5` | sans 400, 1º parágrafo da matéria; 1ª linha em `all-small-caps`, 600, `.05em` |
| `--text-dek` | `clamp(1.0625rem, 1rem + .4vw, 1.3125rem)` | `1.5` | sans 400, linha fina (na matéria: `clamp(1.125rem, 1rem + .5vw, 1.375rem)`, 500, 1.45) |
| `--text-row-title` | `clamp(1.45rem, 1.25rem + .7vw, 1.9rem)` | `1.06` | serifa 400, `-.012em` |
| `--text-section` | `clamp(1.75rem, 1.4rem + 1.4vw, 2.5rem)` | `1` | serifa **itálico** 400, `-.015em`; títulos de seção ("Últimas") |
| `--text-h2` | `clamp(1.85rem, 1.5rem + 1.3vw, 2.6rem)` | `1.02` | serifa itálico 400, h2 da matéria |
| `--text-feature` | `clamp(2.1rem, 1.2rem + 3.2vw, 4rem)` | `.98` | serifa 400, `-.025em` |
| `--text-wordmark` | `clamp(2.6rem, 1.6rem + 4.4vw, 5.5rem)` | `.82` | serifa 400, `-.035em` |
| `--text-h1` | `clamp(2.6rem, 1rem + 6.2vw, 7.25rem)` | `.93` | serifa 400, `-.03em`, `max-width: 18ch` (h1 da matéria) |
| `--text-display` | `clamp(2.75rem, 1rem + 7vw, 8rem)` | `.92` | serifa 400, `-.03em`, `max-width: 17ch` (destaque da capa) |
| `--text-footer-mark` | `clamp(3.5rem, 2rem + 7vw, 9rem)` | `.85` | serifa 400, `-.04em` (wordmark do rodapé) |

Base do `body`: `font-family: var(--font-text)`, `font-size: 1rem`, `line-height: 1.5`, `color: var(--color-ink)`, `background: var(--color-bg)`, `overflow-wrap: break-word`. Títulos: `text-wrap: balance`. Números em mono: `font-variant-numeric: tabular-nums slashed-zero`.

## 4. Espaçamento, larguras e UI

| Token | Valor | Uso |
|---|---|---|
| `--space-1` | `.25rem` | |
| `--space-2` | `.5rem` | |
| `--space-3` | `.75rem` | |
| `--space-4` | `1rem` | |
| `--space-5` | `1.5rem` | |
| `--space-6` | `2rem` | |
| `--space-7` | `3rem` | |
| `--space-section` | `clamp(2.5rem, 6vw, 4.5rem)` | respiro antes de cada bloco |
| `--layout-gutter` | `clamp(1rem, 4vw, 3rem)` | margem lateral (16px no 320px, critério 18) |
| `--layout-max` | `84rem` | largura máxima da página |
| `--layout-measure` | `66ch` | coluna de leitura; no desktop (≥64rem) deslocada para `margin-left: 25%` |
| `--radius` | `0` | tudo |
| `--rule-width` | `1px` | filetes |
| `--rule-width-strong` | `2px` | filetes do aviso, sublinhado do item ativo |
| `--focus-width` | `3px` | `outline: var(--focus-width) solid var(--color-focus)` |
| `--focus-offset` | `3px` | (0 nos links da nav) |
| `--tap-min` | `40px` | altura mínima de links de nav (cabeçalho e rodapé) |

Breakpoints (não viram variável, CSS não aceita var em media query): `30rem` (data + slogan na linha de cima), `48rem` (slogan ao lado do wordmark), `56rem` (grades 8/4 e rodapé em 2 colunas), `64rem` (nav em uma linha distribuída, coluna de leitura a 25%).

Container `.wrap`: `max-width: var(--layout-max); margin-inline: auto; padding-inline: var(--layout-gutter)`.

## 5. Componentes de base (história 1)

Valores tirados do CSS de `variacao-2/capa.html`. Medidas fixas que não viraram token aparecem literais.

### 5.1 Link "Pular para o conteúdo"
- Primeiro filho do `<body>`: `<a href="#conteudo">Pular para o conteúdo</a>`; o `<main id="conteudo">`.
- Fora da tela até receber foco: `position: absolute; top: -200px; left: var(--layout-gutter); z-index: 20`.
- No `:focus`: `top: .75rem`.
- Visual: fundo `--color-amber`, texto `--color-badge-ink` (9,69:1), `font: 600 .8125rem/1 var(--font-mono)`, caixa-alta, `letter-spacing: .06em`, `padding: .85rem 1rem`, raio 0.
- Foco: contorno de `--focus-width` em `--color-ink`, afastado do âmbar por um vão de `--focus-offset` **preenchido com `--color-bg`**: `outline: var(--focus-width) solid var(--color-ink); outline-offset: var(--focus-offset); box-shadow: 0 0 0 var(--focus-offset) var(--color-bg)`. O halo garante que o vão seja sempre papel, qualquer que seja o que estiver atrás do link.
  - Por isso o contraste do contorno é medido como `--color-ink` / `--color-bg`: 15,29:1 no claro e 15,70:1 no escuro (mínimo 3:1). **Não** medir contra o âmbar: `--color-ink` / `--color-amber` dá 9,69:1 no claro, mas no escuro (`#ECEBE5` sobre `#FFB000`) cai para 1,53:1. Sem o halo, o contorno escuro-claro encostaria no âmbar e reprovaria.
  - O azul (`--color-focus`) não serve aqui: sobre âmbar não teria contraste.

### 5.2 Cabeçalho (`<header>`, sobre o papel)
Estrutura: linha de data → wordmark (+ slogan) → nav. Todo o conteúdo dentro de `.wrap`, exceto a nav, cujas bordas vão de ponta a ponta e o `<ul>` interno tem `max-width: var(--layout-max)` e o mesmo `padding-inline`.

**Linha de data** (`padding-top: .9rem` no header)
- `display: flex; justify-content: space-between; gap: 1rem; padding-bottom: .65rem; border-bottom: 1px solid var(--color-rule)`.
- Tipo `--text-label`, cor `--color-ink-muted`.
- Esquerda: dia da semana + data em mono, ex. "Quinta, 19.11.2026" (a data em `tabular-nums slashed-zero`). Direita: "Futebol depois do apito", alinhado à direita, **oculto abaixo de 30rem**.

**Wordmark**
- `<a href="/" aria-label="Zona Mista, página inicial">Zona<i>Mista</i></a>` (o `<i>` é só visual; o rótulo acessível vem do `aria-label`).
- `font: 400 var(--text-wordmark)/.82 var(--font-display); letter-spacing: -.035em; padding-bottom: .08em; white-space: nowrap`, cor `--color-ink`.
- "Mista": `font-style: italic; letter-spacing: -.045em; margin-left: .1em`.
- Linha do wordmark: `display: flex; align-items: flex-end; justify-content: space-between; gap: 1rem; padding-block: .6rem .2rem`.
- Slogan à direita (só a partir de 48rem): "Análise, crônica e reportagem / apuradas pelo squad-fut", em `--text-label`, `--color-ink-muted`, alinhado à direita, `padding-bottom: .55rem`.
- No 320px o wordmark mede 2,6rem e cabe em uma linha.

**Nav das editorias** (`<nav aria-label="Editorias">` + `<ul>`)
- Bordas: `border-top: 1px solid var(--color-rule-strong); border-bottom: 1px solid var(--color-rule)`.
- `<ul>`: `list-style: none; margin: 0 auto; max-width: var(--layout-max); padding: .2rem var(--layout-gutter); display: flex; flex-wrap: wrap; gap: 0 1.15rem; counter-reset: ed`.
- Cada `<li>`: `counter-increment: ed`.
- Link: `display: inline-flex; align-items: baseline; gap: .3rem; min-height: var(--tap-min); padding-block: .7rem .55rem; font: 500 var(--text-nav)/1 var(--font-text); font-stretch: 92%`, cor `--color-ink`.
- Número antes do rótulo, em CSS (não vai no texto do link): `::before { content: counter(ed, decimal-leading-zero); font: 500 .625rem/1 var(--font-mono); color: var(--color-ink-muted) }`. Resultado: "01 Análise" … "07 Reportagem".
- Hover: `--color-accent`. Ativo (`aria-current="page"`, a partir da história 5): `--color-accent`, sublinhado de 2px, `text-underline-offset: .35em`.
- Foco: `outline-offset: 0` (o contorno de 3px fica rente ao link, para não ser cortado nas linhas quebradas).
- **Mobile:** quebra de linha, sem rolagem. Em 320px ficam **3 linhas**, em 375px 2 linhas. A partir de 64rem: uma linha com `justify-content: space-between` e `--text-nav` em 1rem.
- Ordem e destinos: critério 14 da história (Análise, Crônica, Notícia, Coluna, Perfil, Entrevista, Reportagem → `/editorias/<slug>`).

### 5.3 Rodapé (`<footer>`, faixa noturna)
- Fundo `--color-night`, texto `--color-night-ink`; dentro dele, todo foco usa `--color-focus-night`.
- `margin-top: clamp(3rem, 7vw, 6rem); padding-block: clamp(2.5rem, 6vw, 4.5rem) 2rem`. Conteúdo em `.wrap`.
- Grade: `display: grid; gap: 2rem`; a partir de 56rem `grid-template-columns: 7fr 5fr; align-items: end`.
- Itens da grade com `min-width: 0` (`.grade > * { min-width: 0 }`). Sem isso, o `min-width: auto` padrão do grid deixa a marca alargar a coluna e vazar a tela.
- Coluna 1: um invólucro com `container-type: inline-size` (a marca passa a medir a coluna, não a viewport) e, dentro dele, o wordmark grande `Zona<i>Mista</i>` com `aria-hidden="true"` (o nome legível está no colofão): `font: 400 min(var(--text-footer-mark), 27cqi) / .85 var(--font-display); letter-spacing: -.04em`; "Mista" itálico com `-.05em` e `margin-left: .1em`.
  - **Por que o teto de `27cqi`** (bug QA-01): "ZonaMista" não tem ponto de quebra e mede cerca de 3,4em. Com a fonte do navegador a 175–200% em telas de 320–400px, `--text-footer-mark` (em rem) crescia e a marca estourava a largura, criando rolagem horizontal. O `min()` limita a marca a 27% da coluna (≈ 3,4em × 27% ≈ 92% da largura).
  - Na fonte padrão o teto nunca age: o token fica sempre abaixo de 27cqi (ex.: 320px → 56px contra ≈78px; 56rem → ≈95px contra ≈125px; desktop largo → 144px contra ≈190px). O visual aprovado não muda.
  - **Não remover** o contêiner, o `min()` nem o `min-width: 0` ao reimplementar este rodapé: os três juntos impedem o bug. Referência: `src/components/layout/SiteFooter.module.css`.
- Coluna 2: parágrafo `max-width: 46ch; line-height: 1.55`: "As matérias da Zona Mista são produzidas pelo squad-fut, uma redação de agentes que apura, escreve, checa e revisa cada texto." (atende ao critério 15). Abaixo, com `margin-top: 1rem`, uma `<nav aria-label="Editorias no rodapé">` com os 7 links: `<ul>` flex com `flex-wrap: wrap; gap: 0 1.1rem`, links `inline-flex; min-height: var(--tap-min); align-items: center`, hover `--color-amber`. Essa nav é opcional na história 1; se entrar, vem depois da nav do cabeçalho na ordem de Tab e não altera o critério 17.
- Colofão: `display: flex; flex-wrap: wrap; justify-content: space-between; gap: .5rem 2rem; border-top: 1px solid var(--color-night-rule); padding-top: 1rem; margin-top: 2.5rem`, em `--text-label`. Esquerda: "© 2026 Zona Mista" (ano em mono). Direita, em `--color-night-ink-muted`: "Depois do apito" + "◆" em `--color-amber`.

### 5.4 Selo "◇ EXEMPLO" (histórias 2 e 3; especificado aqui para fechar a identidade)
- `<span class="badge">Exemplo</span>`; o losango vem de `::before { content: "◇"; font-size: .95em; line-height: 1 }` e a caixa-alta do CSS. Leitores de tela leem "Exemplo".
- `display: inline-flex; align-items: center; gap: .35em; background: var(--color-badge-bg); color: var(--color-badge-ink); font: 600 var(--text-label)/1 var(--font-mono); text-transform: uppercase; letter-spacing: .08em; padding: .34em .5em .3em`; raio 0.
- Fica no chapéu (`kicker`), depois da editoria (texto mono em `--color-accent`, sem fundo), com `gap: .35rem .8rem`. É o único "objeto" com fundo da página: não criar outras pílulas.
- Igual nos dois temas e sobre a faixa noturna (âmbar com texto escuro, 9,69:1).

### 5.5 Aviso de conteúdo fictício (história 3)
- Lugar: logo depois da faixa noturna do topo da matéria e antes do texto. Distinto do selo: é uma faixa larga com frase completa, o selo é um carimbo curto.
- Marcação: `<div class="notice" role="note"><span class="label">◇ Aviso</span><p><strong>Conteúdo fictício de demonstração.</strong> Clubes, pessoas e fatos desta matéria foram inventados para mostrar o layout do portal.</p></div>`.
- `display: grid; gap: .35rem 1.25rem; margin: 1.25rem 0 1rem; padding: .85rem 1rem; max-width: var(--layout-measure); background: var(--color-notice-bg); color: var(--color-notice-ink); border-block: var(--rule-width-strong) solid var(--color-notice-ink)`; sem bordas laterais, raio 0.
- Rótulo "◇ Aviso": `--text-label`, peso 600. Frase: `font: 400 1rem/1.45 var(--font-text)`, `<strong>` em 700.
- A partir de 40rem: `grid-template-columns: 7rem 1fr; align-items: baseline` (rótulo numa coluna, frase na outra).

### 5.6 Foco e movimento
- Global: `:focus-visible { outline: var(--focus-width) solid var(--color-focus); outline-offset: var(--focus-offset) }`.
- Dentro de `--color-night` (rodapé, faixas): `outline-color: var(--color-focus-night)`.
- `prefers-reduced-motion: reduce`: sem transições nem animações (o design não usa nenhuma).

## 6. Lista de variáveis

Cor: `--color-bg`, `--color-surface`, `--color-ink`, `--color-ink-muted`, `--color-rule`, `--color-rule-strong`, `--color-accent`, `--color-amber`, `--color-night`, `--color-night-ink`, `--color-night-ink-muted`, `--color-night-rule`, `--color-badge-bg`, `--color-badge-ink`, `--color-notice-bg`, `--color-notice-ink`, `--color-focus`, `--color-focus-night`.
Fonte: `--font-display`, `--font-text`, `--font-mono`.
Tipo: `--text-label`, `--text-nav-index`, `--text-nav`, `--text-body`, `--text-lead`, `--text-dek`, `--text-row-title`, `--text-section`, `--text-h2`, `--text-feature`, `--text-wordmark`, `--text-h1`, `--text-display`, `--text-footer-mark`.
Espaço e layout: `--space-1` a `--space-7`, `--space-section`, `--layout-gutter`, `--layout-max`, `--layout-measure`, `--radius`, `--rule-width`, `--rule-width-strong`, `--focus-width`, `--focus-offset`, `--tap-min`.
