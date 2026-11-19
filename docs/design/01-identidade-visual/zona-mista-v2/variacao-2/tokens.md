# Zona Mista v2 · Variação 2: "Súmula" (tokens propostos)

**Conceito:** a Zona Mista como revista de futebol (Panenka, Mundial, The Ringer): serifa editorial grande para a voz, mono para os dados, como a súmula do árbitro. O estádio à noite vira uma faixa azul-noite no topo da capa e da matéria, com o âmbar do placar de LED como único brilho.

**Tom:** autoral, calmo, de revista. Papel cinza-quente no dia, azul-noite no escuro. Azul-caneta para links e editorias; âmbar só sobre a noite ou como massa no selo.

Mockups: [`capa.html`](capa.html) e [`materia.html`](materia.html). Botão "Tema" no canto inferior direito; `?theme=dark` ou `?theme=light` também funcionam.

## Cores

| Token | Uso | Claro | Escuro |
|---|---|---|---|
| `--bg` | fundo (papel) | `#EFEEE9` | `#0E1120` |
| `--ink` | texto, títulos, regras de seção | `#16181D` | `#ECEBE5` |
| `--muted` | linha fina, metadados, datas | `#585B63` | `#A3A7B6` |
| `--hair` | filetes de 1px (decorativo) | `#C9C7BF` | `#272B3F` |
| `--accent` | azul-caneta: editoria, links, contagens, editoria ativa, foco | `#2638C9` | `#9DAAFF` |
| `--led` | âmbar do placar: chapéu sobre a faixa noturna, fundo do selo. **Nunca como texto sobre o papel claro.** | `#FFB000` | `#FFB000` |
| `--night` | faixa noturna: destaque da capa, topo da matéria, rodapé | `#0E1120` | `#1A2142` |
| `--night-text` / `--night-muted` / `--night-hair` | texto, secundário e filete sobre a faixa | `#ECEBE5` / `#A3A7B6` / `#2C3148` | `#ECEBE5` / `#A3A7B6` / `#343C63` |
| `--badge-bg` / `--badge-text` | selo "Exemplo" | `#FFB000` / `#16181D` | `#FFB000` / `#16181D` |
| `--notice-bg` / `--notice-text` | aviso fictício (filetes de 2px na cor do texto) | `#FFE9B0` / `#16181D` | `#2B2410` / `#FFE2A0` |
| `--focus` | foco (3px, offset 3px); sobre a faixa noturna vira âmbar | `#2638C9` | `#9DAAFF` |

No escuro, a faixa noturna sobe para `#1A2142` para continuar se destacando do fundo `#0E1120`.

**Selo x aviso:** o selo é um carimbo âmbar curto, em mono caixa-alta, com o losango "◇" de ficção ("◇ EXEMPLO"); a editoria é texto mono azul, sem fundo. O aviso é uma faixa larga entre dois filetes de 2px, com o rótulo "◇ Aviso" numa coluna e a frase completa "Conteúdo fictício de demonstração. Clubes, pessoas e fatos…" na outra; fica logo depois da faixa noturna e antes do texto.

## Contraste (WCAG 2.x, calculado)

Script: `test-results/design/contraste-v2.mjs` (dados em `paletas-v2.json`, saída em `contraste-v2.out.md`).

### claro
| Par | Texto | Fundo | Razão | Mínimo | OK |
|---|---|---|---|---|---|
| Texto / fundo | `#16181D` | `#EFEEE9` | 15,29:1 | 4,5:1 | sim |
| Secundário / fundo | `#585B63` | `#EFEEE9` | 5,85:1 | 4,5:1 | sim |
| Destaque azul-caneta (links, editoria) / fundo | `#2638C9` | `#EFEEE9` | 7,26:1 | 4,5:1 | sim |
| Texto sobre âmbar (selo Exemplo) | `#16181D` | `#FFB000` | 9,69:1 | 4,5:1 | sim |
| Aviso fictício: texto / fundo | `#16181D` | `#FFE9B0` | 14,83:1 | 4,5:1 | sim |
| Faixa noturna: texto | `#ECEBE5` | `#0E1120` | 15,70:1 | 4,5:1 | sim |
| Faixa noturna: secundário | `#A3A7B6` | `#0E1120` | 7,82:1 | 4,5:1 | sim |
| Faixa noturna: âmbar | `#FFB000` | `#0E1120` | 10,24:1 | 4,5:1 | sim |
| Regra / fundo (UI) | `#16181D` | `#EFEEE9` | 15,29:1 | 3:1 | sim |
| Foco azul (UI) / fundo | `#2638C9` | `#EFEEE9` | 7,26:1 | 3:1 | sim |
| Foco âmbar na faixa noturna (UI) | `#FFB000` | `#0E1120` | 10,24:1 | 3:1 | sim |

### escuro
| Par | Texto | Fundo | Razão | Mínimo | OK |
|---|---|---|---|---|---|
| Texto / fundo | `#ECEBE5` | `#0E1120` | 15,70:1 | 4,5:1 | sim |
| Secundário / fundo | `#A3A7B6` | `#0E1120` | 7,82:1 | 4,5:1 | sim |
| Destaque azul-caneta / fundo | `#9DAAFF` | `#0E1120` | 8,60:1 | 4,5:1 | sim |
| Âmbar (números, capitular) / fundo | `#FFB000` | `#0E1120` | 10,24:1 | 4,5:1 | sim |
| Texto sobre âmbar (selo Exemplo) | `#16181D` | `#FFB000` | 9,69:1 | 4,5:1 | sim |
| Aviso fictício: texto / fundo | `#FFE2A0` | `#2B2410` | 12,21:1 | 4,5:1 | sim |
| Faixa noturna: texto | `#ECEBE5` | `#1A2142` | 13,12:1 | 4,5:1 | sim |
| Faixa noturna: secundário | `#A3A7B6` | `#1A2142` | 6,54:1 | 4,5:1 | sim |
| Faixa noturna: âmbar (chapéu) | `#FFB000` | `#1A2142` | 8,55:1 | 4,5:1 | sim |
| Regra / fundo (UI) | `#ECEBE5` | `#0E1120` | 15,70:1 | 3:1 | sim |
| Foco azul (UI) / fundo | `#9DAAFF` | `#0E1120` | 8,60:1 | 3:1 | sim |
| Foco âmbar na faixa (UI) | `#FFB000` | `#1A2142` | 8,55:1 | 3:1 | sim |

Pior caso de texto: secundário no claro, 5,85:1. Pior caso de UI: o foco azul no claro, 7,26:1. O âmbar `#FFB000` sobre o papel claro daria cerca de 1,6:1, por isso ele nunca aparece ali como texto (só como fundo do selo, com texto escuro, 9,69:1).

## Tipografia

| Token | Fonte (`next/font/google`) | Uso |
|---|---|---|
| `--font-display` | **Instrument Serif** (400, normal e itálico) | wordmark, títulos, intertítulos, nomes das editorias, datas grandes |
| `--font-text` | **Instrument Sans** (variável, `wght` 400–700, `wdth` 75–100) | texto corrido, linha fina, nav |
| `--font-mono` | **Geist Mono** (variável, `wght` 400–600) | chapéu, selo, datas, tempos de leitura, contagens, colofão |

`next/font`: `Instrument_Serif({ subsets: ['latin'], weight: '400', style: ['normal','italic'], variable: '--font-display' })`, `Instrument_Sans({ subsets: ['latin'], axes: ['wdth'], variable: '--font-text' })`, `Geist_Mono({ subsets: ['latin'], variable: '--font-mono' })` (o arquiteto confere a API na doc do Next 16).

**Wordmark tipográfico:** "Zona" em Instrument Serif romano + "Mista" em itálico, com espacejamento negativo (−.035em). Romano e itálico juntos são a "mistura" do nome. Sem ícone. No rodapé ele aparece em até 9rem sobre a faixa noturna.

| Papel | Tamanho | Altura de linha | Estilo |
|---|---|---|---|
| Título do destaque (capa) | `clamp(2.75rem, 1rem + 7vw, 8rem)`, até 17ch | .92 | serifa 400, `letter-spacing: -.03em` |
| h1 da matéria | `clamp(2.6rem, 1rem + 6.2vw, 7.25rem)`, até 18ch | .93 | serifa 400 |
| Título de destaque secundário | `clamp(2.1rem, 1.2rem + 3.2vw, 4rem)` | .98 | serifa 400 |
| Título em linha da súmula | `clamp(1.45rem, 1.25rem + .7vw, 1.9rem)` | 1.06 | serifa 400 |
| Títulos de seção ("Últimas", "Editorias") e h2 da matéria | `clamp(1.75rem…2.6rem)` | 1–1.02 | serifa **itálico**, filete de 1px |
| Editorias como frase | `clamp(2.1rem, 1.2rem + 4vw, 5.25rem)`, romano e itálico alternados, contagem em mono sobrescrita | 1.08 | serifa |
| Linha fina | `clamp(1.0625rem…1.375rem)` | 1.45–1.5 | sans 400–500 |
| Corpo | `clamp(1.0625rem, 1rem + .25vw, 1.15rem)` (17→18,4px) | 1.68 | sans 400 |
| Abertura (1º parágrafo) | `clamp(1.25rem, 1.1rem + .6vw, 1.5rem)`, 1ª linha em versalete (`font-variant-caps: all-small-caps`) | 1.5 | sans |
| Chapéu, selo, datas, metadados | .6875rem mono caixa-alta, `letter-spacing: .08em` | 1.4 | mono 500–600, `tabular-nums slashed-zero` |

Microtipografia: `tabular-nums` + zero cortado no mono; versalete na primeira linha da abertura; losango "◆" azul no fim do texto (`p:last-child::after`); `text-wrap: balance` em títulos; numeração 01–07 em mono antes de cada editoria da nav (contador CSS).

## Espaçamento, linhas, larguras

- Sem cartões e raio 0. Seções abrem com o título em itálico seguido de um filete que corre até a contagem em mono (`grid auto 1fr auto`).
- Ritmo: faixa noturna em largura total → um destaque secundário grande (8/12 título, 4/12 linha fina) → "súmula" de linhas (data · editoria + selo · título · linha fina · tempo) → editorias como frase gigante → crônica em três colunas com o dia em serifa grande.
- Margem lateral `--gutter: clamp(1rem, 4vw, 3rem)`. Largura máxima `--page-max: 84rem`. Coluna de leitura `--measure: 66ch`, deslocada para 25% da largura no desktop (≥64rem), assimétrica em relação ao título.

## Navegação das 7 editorias em 320px

**Quebra de linha**: as sete visíveis, sem rolagem escondida, em 3 linhas no 320px e 2 no 375px, cada link com 40px de altura e o número em mono antes ("01 Análise"). A partir de 64rem ficam numa linha distribuída. Conferido com Tab até "Reportagem" em 320px; `scrollWidth` = 320 (`test-results/design/01-v2/v2-nav-320-foco-reportagem.png`). Abaixo de 30rem a linha de cima do cabeçalho mostra só a data.

## Outros

- Foco: `outline: 3px solid var(--focus); outline-offset: 3px`; na faixa noturna e no rodapé o contorno é âmbar. Cards/linhas: o link cobre o item e o contorno vai no item (`:has(a:focus-visible)`).
- "Pular para o conteúdo": âmbar com texto escuro, visível só no foco.
- `prefers-reduced-motion`: sem transições (a variação não usa animação).
- Sem imagens: a identidade vem da faixa noturna, da serifa grande e do contraste serifa × mono.
- Sem bloco "Em números" (decisão do usuário). As contagens das editorias são só "matérias publicadas", que o site já sabe.
