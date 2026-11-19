# Direção A: Folha Seca (tokens propostos)

**Conceito:** o portal como um jornal de papel lido sem pressa: papel creme, tinta preta, um vermelho de manchete e tipografia serifada com cara de caderno de esportes de fim de semana. O nome vem da "folha seca" de Didi, o chute que cai devagar e no lugar certo, como um texto bem apurado.

**Tom:** sóbrio, literário, de leitura longa. Cor quase só na tinta vermelha (editoria, links, capitular).

Mockups: [`capa.html`](capa.html) e [`materia.html`](materia.html) (abrir direto no navegador; o botão no canto inferior direito alterna claro/escuro; `?theme=dark` também funciona).

## Cores

| Token | Uso | Claro | Escuro |
|---|---|---|---|
| `--color-bg` | fundo da página, cabeçalho e rodapé | `#F5EFE3` | `#15120E` |
| `--color-surface` | caixas (referência, cartões elevados) | `#FBF8F1` | `#1F1B16` |
| `--color-text` | texto principal, títulos, nome do portal, editorias da nav | `#1B1814` | `#ECE5D8` |
| `--color-text-muted` | texto secundário (datas, autoria, rodapé) | `#5C5347` | `#B0A593` |
| `--color-accent` | link, editoria (chapéu), capitular, numeração | `#A3201A` | `#F2836F` |
| `--color-border` | filetes finos entre cards | `#D8CDB8` | `#3A3229` |
| `--color-border-strong` | filetes duplos do cabeçalho/rodapé, contorno das tags | `#1B1814` | `#ECE5D8` |
| `--color-focus` | contorno de foco (3px, offset 3px) | `#1F55C4` | `#8DB2FF` |
| `--color-badge-bg` / `--color-badge-text` | selo "Exemplo" | `#F3DFAE` / `#6B4300` | `#3A2C0E` / `#F3D28A` |
| `--color-notice-bg` / `--color-notice-text` | aviso "Conteúdo fictício de demonstração" | `#E3EAF4` / `#1E3A5F` | `#18243A` / `#C9DAF5` |

O foco é azul de propósito: não se confunde com o vermelho dos links, nem com o hover.

**Selo x aviso:** o selo é uma etiqueta pequena em versalete, fundo ocre com borda tracejada, ao lado da editoria (cards e topo da matéria). O aviso é uma faixa azulada de largura total, com ícone "i", filete à esquerda e a frase "Conteúdo fictício de demonstração." seguida de explicação. Cores, forma e tamanho diferentes.

## Contraste (WCAG 2.x, calculado)

Fórmula: luminância relativa com canais linearizados (`c ≤ 0,04045 ? c/12,92 : ((c+0,055)/1,055)^2,4`), `L = 0,2126R + 0,7152G + 0,0722B`, razão `(L1+0,05)/(L2+0,05)`. Script: `test-results/design/contraste.mjs` (dados em `paletas.json`).

### Claro

| Par | Texto | Fundo | Razão | Mínimo | OK |
|---|---|---|---|---|---|
| Corpo / fundo | `#1B1814` | `#F5EFE3` | 15,44:1 | 4,5:1 | sim |
| Corpo / superfície | `#1B1814` | `#FBF8F1` | 16,67:1 | 4,5:1 | sim |
| Secundário / fundo | `#5C5347` | `#F5EFE3` | 6,59:1 | 4,5:1 | sim |
| Secundário / superfície | `#5C5347` | `#FBF8F1` | 7,11:1 | 4,5:1 | sim |
| Link e destaque / fundo | `#A3201A` | `#F5EFE3` | 6,60:1 | 4,5:1 | sim |
| Link e destaque / superfície | `#A3201A` | `#FBF8F1` | 7,12:1 | 4,5:1 | sim |
| Cabeçalho: nome e editorias / fundo | `#1B1814` | `#F5EFE3` | 15,44:1 | 4,5:1 | sim |
| Rodapé: texto / fundo | `#1B1814` | `#F5EFE3` | 15,44:1 | 4,5:1 | sim |
| Rodapé: secundário / fundo | `#5C5347` | `#F5EFE3` | 6,59:1 | 4,5:1 | sim |
| Selo Exemplo | `#6B4300` | `#F3DFAE` | 6,58:1 | 4,5:1 | sim |
| Aviso fictício | `#1E3A5F` | `#E3EAF4` | 9,50:1 | 4,5:1 | sim |
| Link "Pular para o conteúdo" (invertido) | `#F5EFE3` | `#1B1814` | 15,44:1 | 4,5:1 | sim |
| Foco / fundo (UI) | `#1F55C4` | `#F5EFE3` | 5,81:1 | 3:1 | sim |
| Foco / superfície (UI) | `#1F55C4` | `#FBF8F1` | 6,28:1 | 3:1 | sim |

### Escuro

| Par | Texto | Fundo | Razão | Mínimo | OK |
|---|---|---|---|---|---|
| Corpo / fundo | `#ECE5D8` | `#15120E` | 14,91:1 | 4,5:1 | sim |
| Corpo / superfície | `#ECE5D8` | `#1F1B16` | 13,67:1 | 4,5:1 | sim |
| Secundário / fundo | `#B0A593` | `#15120E` | 7,69:1 | 4,5:1 | sim |
| Secundário / superfície | `#B0A593` | `#1F1B16` | 7,05:1 | 4,5:1 | sim |
| Link e destaque / fundo | `#F2836F` | `#15120E` | 7,34:1 | 4,5:1 | sim |
| Link e destaque / superfície | `#F2836F` | `#1F1B16` | 6,73:1 | 4,5:1 | sim |
| Cabeçalho: nome e editorias / fundo | `#ECE5D8` | `#15120E` | 14,91:1 | 4,5:1 | sim |
| Rodapé: texto / fundo | `#ECE5D8` | `#15120E` | 14,91:1 | 4,5:1 | sim |
| Rodapé: secundário / fundo | `#B0A593` | `#15120E` | 7,69:1 | 4,5:1 | sim |
| Selo Exemplo | `#F3D28A` | `#3A2C0E` | 9,31:1 | 4,5:1 | sim |
| Aviso fictício | `#C9DAF5` | `#18243A` | 10,97:1 | 4,5:1 | sim |
| Link "Pular para o conteúdo" (invertido) | `#15120E` | `#ECE5D8` | 14,91:1 | 4,5:1 | sim |
| Foco / fundo (UI) | `#8DB2FF` | `#15120E` | 8,84:1 | 3:1 | sim |
| Foco / superfície (UI) | `#8DB2FF` | `#1F1B16` | 8,11:1 | 3:1 | sim |

Pior caso de texto: secundário/fundo claro e selo claro, ~6,6:1. Todos os pares de texto acima de 4,5:1; foco acima de 3:1.

## Tipografia

| Token | Fonte (`next/font/google`) | Uso |
|---|---|---|
| `--font-display` | **Fraunces** (variável, eixos `opsz` e `SOFT`; pesos 400–800, itálico) | nome do portal (800 itálico), títulos, intertítulos, numeração |
| `--font-body` | **Source Serif 4** (variável, eixo `opsz`; 400–700, itálico) | texto corrido, linha fina (itálico), editorias e metadados em versalete (`font-variant-caps: all-small-caps`) |

Fallback: `Georgia, "Times New Roman", serif`. No `next/font`: `Fraunces({ subsets: ['latin'], axes: ['opsz','SOFT'], style: ['normal','italic'], variable: '--font-display' })` e `Source_Serif_4({ subsets: ['latin'], axes: ['opsz'], style: ['normal','italic'], variable: '--font-body' })` (o arquiteto confere a API na doc do Next 16).

| Papel | Tamanho | Altura de linha | Peso |
|---|---|---|---|
| Nome do portal (capa) | `clamp(2.75rem, 9vw + .5rem, 6.5rem)` | .95 | 800 itálico |
| Nome do portal (demais páginas) | `clamp(2.4rem, 4vw + 1rem, 3.75rem)` | .95 | 800 itálico |
| h1 da matéria | `clamp(2.1rem, 1.3rem + 4vw, 4.5rem)` | 1.1 | 650 |
| Título do destaque (capa) | `clamp(2.1rem, 1.4rem + 3.6vw, 4.25rem)` | 1.1 | 650 |
| h2 intertítulo | `clamp(1.5rem, 1.3rem + .9vw, 2rem)` | 1.1 | 650, filete vermelho de 3rem acima |
| Título de card | `clamp(1.3rem, 1.15rem + .6vw, 1.6rem)` | 1.1 | 600 |
| Linha fina | `clamp(1.2rem, 1.05rem + .7vw, 1.5rem)` | 1.45 | 400 itálico |
| Corpo | `clamp(1.0625rem, 1rem + .25vw, 1.1875rem)` (17→19px) | 1.6 | 400 |
| Chapéu / editoria / nav | .95–1.06rem, versalete, `letter-spacing: .08em` | — | 600 |
| Metadados | .9rem | 1.6 | 400 |

## Espaçamento, raios, larguras

- Escala: `--space-1` .25rem · `--space-2` .5rem · `--space-3` .75rem · `--space-4` 1rem · `--space-5` 1.5rem · `--space-6` 2rem · `--space-7` 3rem · `--space-8` 4rem.
- Margem lateral: `--gutter: clamp(1rem, 4vw, 2.5rem)` (16px no mínimo).
- Raio: `--radius: 2px` (quase reto, papel); tags em pílula.
- Largura máxima da página: `--page-max: 76rem`; coluna de leitura `--measure: 68ch`.
- Matéria ≥ 72rem: coluna lateral de 13rem à esquerda (editoria, resumo, temas), texto em 68ch.
- Filetes: duplo (3px + 1px) no topo e na base do cabeçalho e no topo do rodapé; 1px entre cards; colunas da grade separadas por filete vertical.

## Navegação das 7 editorias em 320px: quebra de linha

As sete editorias ficam **sempre visíveis**, centralizadas, em versalete, e quebram em 2–3 linhas no celular (em 320px: Análise · Crônica · Notícia / Coluna · Perfil · Entrevista / Reportagem). Cada link tem 44px de altura de toque.

Por quê: combina com o cabeçalho de jornal, em que o índice de cadernos fica exposto sob o logotipo. Não esconde nada, não depende de JavaScript, a ordem do Tab é a ordem visual e o teste de 320px não tem nada para rolar. Custo: o cabeçalho fica ~90px mais alto no celular, aceitável num portal de leitura longa.

## Outros

- Foco: `outline: 3px solid var(--color-focus); outline-offset: 3px`.
- "Pular para o conteúdo": invertido (`--color-text` de fundo, `--color-bg` de texto), visível só no foco.
- `prefers-reduced-motion`: sem transições (a direção não usa animação).
- Sem imagens: a identidade vem da capitular vermelha, dos filetes duplos e da numeração em itálico.
