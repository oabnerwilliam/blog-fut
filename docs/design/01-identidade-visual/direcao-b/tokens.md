# Direção B: Zona Mista (tokens propostos)

**Conceito:** o portal como a faixa de placar do estádio à noite: verde-gramado escuro, um lima de marcador eletrônico e títulos em grotesca condensada, com números grandes onde a matéria tem números. O nome é a "zona mista", o corredor onde a imprensa encontra os jogadores depois do jogo.

**Tom:** direto, esportivo, contemporâneo. Contraste forte entre a faixa escura (cabeçalho, topo da matéria, rodapé) e o conteúdo claro em cartões.

Mockups: [`capa.html`](capa.html) e [`materia.html`](materia.html) (abrir direto no navegador; o botão lima no canto inferior direito alterna claro/escuro; `?theme=dark` também funciona).

## Cores

| Token | Uso | Claro | Escuro |
|---|---|---|---|
| `--color-bg` | fundo da página | `#F2F4F1` | `#0B120E` |
| `--color-surface` | cartões, caixa de destaque, placar de números | `#FFFFFF` | `#141F19` |
| `--color-text` | texto principal, títulos | `#0F1B15` | `#E4ECE6` |
| `--color-text-muted` | texto secundário (datas, linha fina dos cards) | `#4B5B52` | `#9DB1A5` |
| `--color-accent` | link, números, editoria | `#0A6A3A` | `#5CD08A` |
| `--color-accent-soft` | fundo da etiqueta de editoria e das tags | `#E3F1E8` | `#1B3326` |
| `--color-border` | bordas de cartões, grafismo do meio-campo | `#D3DCD6` | `#26342C` |
| `--color-band` | faixa: cabeçalho, topo da matéria, rodapé | `#0C2B1C` | `#0E2418` |
| `--color-band-text` | nome do portal e h1 sobre a faixa | `#F2F4F1` | `#F2F4F1` |
| `--color-band-muted` | editorias da nav, linha fina sobre a faixa | `#CFE3D6` | `#CFE3D6` |
| `--color-band-muted-2` | secundário sobre a faixa (rodapé, autoria) | `#A9C2B3` | `#A9C2B3` |
| `--color-band-line` | grafismo decorativo sobre a faixa (não é texto) | `#2A4A38` | `#2A4A38` |
| `--color-highlight` | lima: marcador da editoria ativa, "Mista", barra dos intertítulos, selo. **Nunca como texto sobre fundo claro.** | `#D4F05A` | `#D4F05A` |
| `--color-focus` | contorno de foco (3px, offset 2px) | `#D9480F` | `#FF8A4C` |
| `--color-badge-bg` / `--color-badge-text` | selo "Exemplo" | `#D4F05A` / `#0F1B15` | `#D4F05A` / `#0F1B15` |
| `--color-notice-bg` / `--color-notice-text` / `--color-notice-border` | aviso "Conteúdo fictício de demonstração" | `#FFF1D6` / `#5A3B00` / `#E0A21B` | `#2E2310` / `#F6D58E` / `#B7841A` |

O foco é laranja-apito: único token que passa de 3:1 ao mesmo tempo no fundo claro, no cartão branco e na faixa verde escura (no claro), sem se confundir com o verde dos links nem com o lima.

**Selo x aviso:** o selo é uma etiqueta lima curta, em caixa-alta condensada, com um pequeno círculo (cards e topo da matéria). O aviso é uma caixa âmbar com borda, ícone de alerta e a frase completa "Conteúdo fictício de demonstração." Cor, forma e tamanho diferentes.

## Contraste (WCAG 2.x, calculado)

Fórmula: luminância relativa com canais linearizados (`c ≤ 0,04045 ? c/12,92 : ((c+0,055)/1,055)^2,4`), `L = 0,2126R + 0,7152G + 0,0722B`, razão `(L1+0,05)/(L2+0,05)`. Script: `test-results/design/contraste.mjs` (dados em `paletas.json`).

### Claro

| Par | Texto | Fundo | Razão | Mínimo | OK |
|---|---|---|---|---|---|
| Corpo / fundo | `#0F1B15` | `#F2F4F1` | 15,98:1 | 4,5:1 | sim |
| Corpo / superfície | `#0F1B15` | `#FFFFFF` | 17,68:1 | 4,5:1 | sim |
| Secundário / fundo | `#4B5B52` | `#F2F4F1` | 6,51:1 | 4,5:1 | sim |
| Secundário / superfície | `#4B5B52` | `#FFFFFF` | 7,20:1 | 4,5:1 | sim |
| Link e destaque / fundo | `#0A6A3A` | `#F2F4F1` | 6,05:1 | 4,5:1 | sim |
| Link e destaque / superfície | `#0A6A3A` | `#FFFFFF` | 6,70:1 | 4,5:1 | sim |
| Etiqueta de editoria e tags | `#0A6A3A` | `#E3F1E8` | 5,74:1 | 4,5:1 | sim |
| Cabeçalho: nome e h1 / faixa | `#F2F4F1` | `#0C2B1C` | 13,78:1 | 4,5:1 | sim |
| Cabeçalho: editorias e linha fina / faixa | `#CFE3D6` | `#0C2B1C` | 11,33:1 | 4,5:1 | sim |
| Cabeçalho: lima ("Mista", chapéu da matéria) / faixa | `#D4F05A` | `#0C2B1C` | 11,91:1 | 4,5:1 | sim |
| Rodapé: texto / faixa | `#F2F4F1` | `#0C2B1C` | 13,78:1 | 4,5:1 | sim |
| Rodapé: secundário / faixa | `#A9C2B3` | `#0C2B1C` | 8,02:1 | 4,5:1 | sim |
| Selo Exemplo (e "Pular para o conteúdo") | `#0F1B15` | `#D4F05A` | 13,82:1 | 4,5:1 | sim |
| Aviso fictício | `#5A3B00` | `#FFF1D6` | 9,13:1 | 4,5:1 | sim |
| Foco / fundo (UI) | `#D9480F` | `#F2F4F1` | 3,89:1 | 3:1 | sim |
| Foco / superfície (UI) | `#D9480F` | `#FFFFFF` | 4,30:1 | 3:1 | sim |
| Foco / faixa (UI) | `#D9480F` | `#0C2B1C` | 3,54:1 | 3:1 | sim |

### Escuro

| Par | Texto | Fundo | Razão | Mínimo | OK |
|---|---|---|---|---|---|
| Corpo / fundo | `#E4ECE6` | `#0B120E` | 15,75:1 | 4,5:1 | sim |
| Corpo / superfície | `#E4ECE6` | `#141F19` | 14,07:1 | 4,5:1 | sim |
| Secundário / fundo | `#9DB1A5` | `#0B120E` | 8,37:1 | 4,5:1 | sim |
| Secundário / superfície | `#9DB1A5` | `#141F19` | 7,47:1 | 4,5:1 | sim |
| Link e destaque / fundo | `#5CD08A` | `#0B120E` | 9,80:1 | 4,5:1 | sim |
| Link e destaque / superfície | `#5CD08A` | `#141F19` | 8,75:1 | 4,5:1 | sim |
| Etiqueta de editoria e tags | `#5CD08A` | `#1B3326` | 7,00:1 | 4,5:1 | sim |
| Cabeçalho: nome e h1 / faixa | `#F2F4F1` | `#0E2418` | 14,78:1 | 4,5:1 | sim |
| Cabeçalho: editorias e linha fina / faixa | `#CFE3D6` | `#0E2418` | 12,16:1 | 4,5:1 | sim |
| Cabeçalho: lima / faixa | `#D4F05A` | `#0E2418` | 12,78:1 | 4,5:1 | sim |
| Rodapé: texto / faixa | `#F2F4F1` | `#0E2418` | 14,78:1 | 4,5:1 | sim |
| Rodapé: secundário / faixa | `#A9C2B3` | `#0E2418` | 8,61:1 | 4,5:1 | sim |
| Selo Exemplo (e "Pular para o conteúdo") | `#0F1B15` | `#D4F05A` | 13,82:1 | 4,5:1 | sim |
| Aviso fictício | `#F6D58E` | `#2E2310` | 10,87:1 | 4,5:1 | sim |
| Foco / fundo (UI) | `#FF8A4C` | `#0B120E` | 8,12:1 | 3:1 | sim |
| Foco / superfície (UI) | `#FF8A4C` | `#141F19` | 7,25:1 | 3:1 | sim |
| Foco / faixa (UI) | `#FF8A4C` | `#0E2418` | 7,00:1 | 3:1 | sim |

Pior caso de texto: etiqueta de editoria no claro, 5,74:1. Pior caso de foco: faixa no claro, 3,54:1 (passa, mas é o ponto para não mexer sem recalcular).

## Tipografia

| Token | Fonte (`next/font/google`) | Uso |
|---|---|---|
| `--font-display` | **Barlow Condensed** (estática: 500, 600, 700, 800 e 700 itálico) | nome do portal (800 caixa-alta), títulos (700), intertítulos (800 caixa-alta), números, nav, etiquetas |
| `--font-body` | **Inter** (variável, 400–700) | texto corrido, linha fina, metadados |

Fallback: `"Arial Narrow", "Roboto Condensed", system-ui, sans-serif` e `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`. No `next/font`: `Barlow_Condensed({ subsets: ['latin'], weight: ['500','600','700','800'], variable: '--font-display' })` e `Inter({ subsets: ['latin'], variable: '--font-body' })` (o arquiteto confere a API na doc do Next 16).

| Papel | Tamanho | Altura de linha | Peso |
|---|---|---|---|
| Nome do portal | `clamp(1.9rem, 1.4rem + 2.4vw, 2.75rem)` | 1 | 800, caixa-alta |
| h1 da matéria (sobre a faixa) | `clamp(2.4rem, 1.5rem + 4.4vw, 5rem)` | 1.02 | 700 |
| Título do destaque (capa) | `clamp(2.25rem, 1.5rem + 3.6vw, 4.5rem)` | 1.02 | 700 |
| h2 intertítulo | `clamp(1.7rem, 1.4rem + 1vw, 2.2rem)` | 1.02 | 800, caixa-alta, barra lima à esquerda |
| Título de seção da capa | `clamp(1.6rem, 1.3rem + 1vw, 2.1rem)` | 1.02 | 800, caixa-alta |
| Título de card | `clamp(1.45rem, 1.3rem + .5vw, 1.7rem)` | 1.02 | 700 |
| Números do placar | `clamp(2rem, 1.5rem + 2vw, 3rem)` | 1 | 800, `tabular-nums` |
| Linha fina | `clamp(1.05rem, 1rem + .4vw, 1.3rem)` | 1.5 | 400 |
| Corpo da matéria | `clamp(1.0625rem, 1rem + .25vw, 1.15rem)` (17→18,4px) | 1.7 | 400 |
| Nav / etiquetas | 1.05rem / .85rem, caixa-alta, `letter-spacing: .06em` | — | 600 / 700 |
| Metadados | .875rem | 1.6 | 400 |

## Espaçamento, raios, larguras

- Escala: `--space-1` .25rem · `--space-2` .5rem · `--space-3` .75rem · `--space-4` 1rem · `--space-5` 1.5rem · `--space-6` 2rem · `--space-7` 3rem · `--space-8` 4rem.
- Margem lateral: `--gutter: clamp(1rem, 4vw, 2.5rem)` (16px no mínimo).
- Raios: `--radius-s: 6px` (selo, foco, aviso) · `--radius-m: 12px` (cartões) · `--radius-pill: 999px` (etiquetas, tags).
- Largura máxima: `--page-max: 78rem`; coluna de leitura `--measure: 68ch`.
- Matéria ≥ 64rem: texto em 68ch + coluna de 18rem com o placar "Em números" (fixo ao rolar).
- Grade da capa: 1 coluna → 2 (≥ 40rem) → 3 (≥ 64rem).

## Navegação das 7 editorias em 320px: rolagem horizontal só na nav

No celular, a nav é uma faixa de uma linha, dentro do cabeçalho verde, que rola na horizontal (`overflow-x: auto` só no `<ul>`, com `scroll-snap`). Um degradê na borda direita mostra que há mais editorias, e a última recebe um respiro para sair de baixo dele. A partir de 48rem cabem todas e a rolagem some. Links com 44px de altura. Ao navegar com Tab, o navegador rola a faixa até o link focado (conferido em 320px até "Reportagem").

Por quê: é o padrão de app de esporte e de placar (uma faixa que corre), mantém o cabeçalho compacto e com cara de placar, e as sete editorias continuam alcançáveis por toque e teclado sem menu escondido nem JavaScript. A página em si não ganha rolagem horizontal (verificado: `scrollWidth` = 320). Melhoria sugerida ao dev: degradê também na borda esquerda depois de rolar.

## Outros

- Foco: `outline: 3px solid var(--color-focus); outline-offset: 2px`. Na nav, `outline-offset: -3px` para o contorno não ser cortado pela rolagem. Nos cards, o link do título cobre o card inteiro e o contorno vai no card (`:has(a:focus-visible)`).
- "Pular para o conteúdo": lima com texto escuro, visível só no foco.
- `prefers-reduced-motion`: sem transições (a direção não usa animação).
- Sem imagens: a identidade vem da faixa verde, do lima, do círculo e da linha do meio-campo em CSS e dos números grandes extraídos do texto da matéria.
- "Em números" usa só números que estão no texto da matéria; quando a matéria não tiver números, o bloco não aparece (decisão a confirmar com o arquiteto/PO nas histórias 3 e 4).
