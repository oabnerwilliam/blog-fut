# Zona Mista v2 · Variação 1: "Refletor" (tokens propostos)

**Conceito:** a Zona Mista vista pelo refletor: preto e branco duros, como um jogo à noite sob luz branca, e uma única cor, o laranja do sinalizador aceso na arquibancada. O título manda na página: grotesca condensada pesada em tamanho de pôster, texto longo em serifa de jornal.

**Tom:** confiante, seco, de caderno de esportes (The Athletic, Kicker). A cor aparece pouco, e sempre com uma função: editoria, editoria ativa, capitular, numeração das seções.

Mockups: [`capa.html`](capa.html) e [`materia.html`](materia.html). Botão "Tema" no canto inferior direito; `?theme=dark` ou `?theme=light` também funcionam.

## Cores

| Token | Uso | Claro | Escuro |
|---|---|---|---|
| `--bg` | fundo da página (não há "cartões": tudo é página + linhas) | `#F6F6F3` | `#0B0C0E` |
| `--ink` | texto, títulos, regras fortes (2px e 6px), foco | `#111214` | `#F1F0EA` |
| `--muted` | linha fina dos cards, metadados | `#575A5F` | `#A0A39F` |
| `--hair` | filete de 1px entre itens (decorativo, não é texto nem UI essencial) | `#CFCFC9` | `#2B2D31` |
| `--flare-text` | sinalizador como texto: editoria, capitular, numerais das seções, marcador da editoria ativa | `#B23A0E` | `#FF6B33` |
| `--flare` | sinalizador como massa (fita do aviso, quadrado de fim de texto). Só com texto escuro por cima. | `#FF5B1F` | `#FF5B1F` |
| `--foot-bg` / `--foot-text` / `--foot-muted` / `--foot-flare` | rodapé (invertido no claro) | `#111214` / `#F6F6F3` / `#A6A8A4` / `#FF5B1F` | `#16171A` / `#F1F0EA` / `#A0A39F` / `#FF6B33` |
| `--badge-bg` / `--badge-text` | selo "Exemplo" | `#111214` / `#F6F6F3` | `#F1F0EA` / `#0B0C0E` |
| `--notice-bg` / `--notice-text` | aviso "Conteúdo fictício de demonstração" | `#FFE3D6` / `#111214` | `#3A1A0C` / `#F1F0EA` |
| `--focus` | contorno de foco (3px, offset 3px) | `#111214` | `#F1F0EA` |

Foco = a própria tinta (17:1). No rodapé o foco passa a ser o sinalizador, porque o fundo ali é a tinta.

**Selo x aviso:** o selo é uma tarja curta de tinta invertida, quinas retas, caixa-alta, com um quadradinho hachurado à esquerda (marca de "ficção"). A editoria ao lado é texto solto laranja, então os dois nunca se confundem. O aviso é uma faixa larga com borda superior em fita zebrada tinta/laranja, rótulo "Conteúdo fictício de demonstração" e a frase completa; fica entre o título e o texto.

## Contraste (WCAG 2.x, calculado)

Script: `test-results/design/contraste-v2.mjs` (dados em `paletas-v2.json`, saída em `contraste-v2.out.md`). Fórmula de luminância relativa WCAG 2.x com canais linearizados.

### claro
| Par | Texto | Fundo | Razão | Mínimo | OK |
|---|---|---|---|---|---|
| Texto / fundo | `#111214` | `#F6F6F3` | 17,31:1 | 4,5:1 | sim |
| Secundário / fundo | `#575A5F` | `#F6F6F3` | 6,39:1 | 4,5:1 | sim |
| Destaque (texto: editoria, links) / fundo | `#B23A0E` | `#F6F6F3` | 5,53:1 | 4,5:1 | sim |
| Texto sobre bloco sinalizador | `#111214` | `#FF5B1F` | 6,04:1 | 4,5:1 | sim |
| Selo Exemplo (claro sobre tinta) | `#F6F6F3` | `#111214` | 17,31:1 | 4,5:1 | sim |
| Aviso fictício: texto / faixa | `#111214` | `#FFE3D6` | 15,36:1 | 4,5:1 | sim |
| Rodapé invertido: texto | `#F6F6F3` | `#111214` | 17,31:1 | 4,5:1 | sim |
| Rodapé invertido: secundário | `#A6A8A4` | `#111214` | 7,82:1 | 4,5:1 | sim |
| Rodapé invertido: sinalizador | `#FF5B1F` | `#111214` | 6,04:1 | 4,5:1 | sim |
| Regra forte (UI) / fundo | `#111214` | `#F6F6F3` | 17,31:1 | 3:1 | sim |
| Foco (UI) / fundo | `#111214` | `#F6F6F3` | 17,31:1 | 3:1 | sim |
| Foco no rodapé invertido (UI) | `#FF5B1F` | `#111214` | 6,04:1 | 3:1 | sim |
| Marcador da editoria ativa na nav (UI) | `#B23A0E` | `#F6F6F3` | 5,53:1 | 3:1 | sim |

### escuro
| Par | Texto | Fundo | Razão | Mínimo | OK |
|---|---|---|---|---|---|
| Texto / fundo | `#F1F0EA` | `#0B0C0E` | 17,14:1 | 4,5:1 | sim |
| Secundário / fundo | `#A0A39F` | `#0B0C0E` | 7,67:1 | 4,5:1 | sim |
| Destaque (texto) / fundo | `#FF6B33` | `#0B0C0E` | 6,90:1 | 4,5:1 | sim |
| Texto sobre bloco sinalizador | `#111214` | `#FF5B1F` | 6,04:1 | 4,5:1 | sim |
| Selo Exemplo (tinta sobre claro) | `#0B0C0E` | `#F1F0EA` | 17,14:1 | 4,5:1 | sim |
| Aviso fictício: texto / faixa | `#F1F0EA` | `#3A1A0C` | 13,80:1 | 4,5:1 | sim |
| Rodapé: texto / superfície | `#F1F0EA` | `#16171A` | 15,70:1 | 4,5:1 | sim |
| Rodapé: secundário / superfície | `#A0A39F` | `#16171A` | 7,03:1 | 4,5:1 | sim |
| Rodapé: sinalizador / superfície | `#FF6B33` | `#16171A` | 6,32:1 | 4,5:1 | sim |
| Regra forte (UI) / fundo | `#F1F0EA` | `#0B0C0E` | 17,14:1 | 3:1 | sim |
| Foco (UI) / fundo | `#F1F0EA` | `#0B0C0E` | 17,14:1 | 3:1 | sim |
| Foco no rodapé (UI) | `#FF6B33` | `#16171A` | 6,32:1 | 3:1 | sim |
| Marcador da editoria ativa na nav (UI) | `#FF6B33` | `#0B0C0E` | 6,90:1 | 3:1 | sim |


Pior caso de texto: editoria/links no claro, 5,53:1. Pior caso de UI: marcador da editoria ativa no claro, 5,53:1 (o laranja de massa `#FF5B1F` daria 2,87:1 sobre o fundo claro, por isso o marcador usa `--flare-text`).

## Tipografia

| Token | Fonte (`next/font/google`) | Uso |
|---|---|---|
| `--font-display` | **Archivo** (variável, eixos `wght` 100–900 e `wdth` 62–125) | wordmark, títulos, chapéus, nav, metadados, numerais |
| `--font-text` | **Newsreader** (variável, `opsz` 6–72, `wght` 400–700, itálico) | linha fina, texto corrido, títulos da lista de crônicas (itálico) |

`next/font`: `Archivo({ subsets: ['latin'], axes: ['wdth'], variable: '--font-display' })` e `Newsreader({ subsets: ['latin'], style: ['normal','italic'], axes: ['opsz'], variable: '--font-text' })` (o arquiteto confere a API na doc do Next 16). A largura se controla com `font-stretch` (62% a 125%).

**Wordmark tipográfico:** "ZONA" em Archivo 900 a 62% de largura + "MISTA" em Archivo 300 a 125%. As duas metades são a mesma fonte nos extremos opostos de peso e largura: a "mistura" é o próprio logo. Sem ícone, sem quadrado com letra. No rodapé ele aparece em tamanho de pôster (até 12,5rem).

| Papel | Tamanho | Altura de linha | Peso / largura |
|---|---|---|---|
| Título do destaque (capa) | `clamp(2.6rem, 1rem + 6.4vw, 7rem)`; ≥64rem `clamp(4rem, 1rem + 6vw, 7.5rem)` | .9 | 800 / 72%, `letter-spacing: -.022em` |
| h1 da matéria | `clamp(2.5rem, 1rem + 5.8vw, 6.5rem)`, até 19ch | .9 | 800 / 72% |
| Título grande de card | `clamp(1.9rem, 1.2rem + 2.6vw, 3.4rem)` | .95 | 800 / 74% |
| Título médio / curto | `clamp(1.375rem, 1.2rem + .6vw, 1.75rem)` / 1.25rem | 1.04 | 700 / 82–88% |
| h2 intertítulo | `clamp(1.5rem, 1.25rem + 1vw, 2.125rem)` | 1.02 | 700 / 80% |
| Numeral da seção (01–06) | .875rem, pendurado fora da coluna no desktop | 1 | 800, laranja, `tabular-nums` |
| Linha fina | `clamp(1.1875rem, 1rem + .9vw, 1.75rem)` (matéria) | 1.35 | Newsreader 400 |
| Corpo | `clamp(1.0625rem, 1rem + .3vw, 1.1875rem)` (17→19px) | 1.62 | Newsreader 400, `oldstyle-nums` |
| Capitular | `initial-letter: 3` (fallback `float` 4.1em) | — | Archivo 900 / 62%, laranja |
| Chapéu, nav, metadados | .75rem / .8125rem, caixa-alta, `letter-spacing: .09–.14em` | 1.2–1.5 | 500–800 |
| Números de índice (editorias, datas) | 2rem → 4.25rem | 1 | 800 / 62%, `tabular-nums` |

Microtipografia: `font-kerning: normal`; `tabular-nums` em datas, contagens e tempos de leitura; `oldstyle-nums` no corpo; `text-wrap: balance` em títulos e `pretty` em parágrafos; aspas curvas nos títulos de exemplo; quadrado laranja no fim do texto (`p:last-child::after`), sem mexer no conteúdo.

## Espaçamento, linhas, larguras

- Sem cartões: separação por filete de 1px (`--hair`), regra de 2px de tinta no topo de cada seção e de 6px no topo da página. Raio 0 em tudo.
- Ritmo deliberadamente desigual: destaque com `padding` de até 5rem; "Últimas" em 1 grande (7/12) + 2 médias (5/12, filete vertical) + 3 curtas (4/12 cada); índice das editorias em 7 colunas.
- Margem lateral: `--gutter: clamp(1rem, 4vw, 3rem)`. Largura máxima `--page-max: 84rem`. Coluna de leitura `--measure: 68ch`.
- Matéria ≥64rem: grade `13rem | 68ch | 1fr`. Na primeira coluna, "Nesta matéria" (sumário fixo ao rolar, gerado dos h2); linha fina e metadados alinhados à coluna do texto, deixando o título sozinho à esquerda.

## Navegação das 7 editorias em 320px

Rolagem horizontal só na faixa da nav (`overflow-x: auto` no `<ul>`), com degradê na borda direita, uma linha, links de 44px de altura. Some a partir de 56rem. Conferido com Tab em 320px até "Reportagem": o navegador rola a faixa até o link focado, e a página fica com `scrollWidth` = 320 (`test-results/design/01-v2/v1-nav-320-foco-reportagem.png`).

## Outros

- Foco: `outline: 3px solid var(--focus); outline-offset: 3px`; nos cards o link cobre o card e o contorno vai no card (`:has(a:focus-visible)`); na nav `outline-offset: -3px`.
- "Pular para o conteúdo": bloco de tinta, visível só no foco.
- `prefers-reduced-motion`: sem transições (a variação não usa animação).
- Sem imagens: a identidade vem do contraste de escala (título-pôster x metadados miúdos), do wordmark e dos números tipográficos.
- Sem bloco "Em números" (decisão do usuário). O índice "Editorias" mostra só a contagem de matérias publicadas por editoria, que o site já sabe.
