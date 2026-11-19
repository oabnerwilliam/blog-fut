# Zona Mista v2: duas variações refinadas

O usuário escolheu a direção B, Zona Mista, e pediu algo "mais moderno, menos 'IA'". Também decidiu tirar o bloco "Em números" por enquanto. As duas variações mantêm o nome, a noite de estádio e a energia de placar, e trocam a cara de template por um desenho editorial: a tipografia manda, a hierarquia é assimétrica e a página é separada por linhas, não por caixas.

| | **Variação 1: Refletor** | **Variação 2: Súmula** |
|---|---|---|
| Conceito | Jogo à noite sob o refletor: preto e branco duros, título condensado em tamanho de pôster, texto em serifa de jornal. Uma cor só, o laranja do sinalizador na arquibancada. | Revista de futebol: serifa grande para a voz, mono para os dados, como a súmula do árbitro. A noite vira uma faixa azul-noite no topo, com o âmbar do placar de LED como único brilho. |
| Referências | The Athletic, Kicker, Bleacher Report | Panenka, Mundial, The Ringer |
| Paleta (claro) | papel `#F6F6F3`, tinta `#111214`, sinalizador `#B23A0E` (texto) / `#FF5B1F` (massa) | papel `#EFEEE9`, tinta `#16181D`, azul-caneta `#2638C9`, noite `#0E1120`, âmbar `#FFB000` |
| Paleta (escuro) | `#0B0C0E` / `#F1F0EA` / sinalizador `#FF6B33` | `#0E1120` / `#ECEBE5` / azul `#9DAAFF`, faixa `#1A2142`, âmbar `#FFB000` |
| Fontes | Archivo (eixo de largura 62–125) + Newsreader | Instrument Serif + Instrument Sans + Geist Mono |
| Wordmark | "ZONA" 900 condensada + "MISTA" 300 expandida, a mesma fonte nos dois extremos | "Zona" romano + "*Mista*" itálico em serifa |
| Selo "Exemplo" | tarja de tinta invertida com quadradinho hachurado | carimbo âmbar em mono "◇ EXEMPLO" |
| Aviso fictício | faixa com borda de fita zebrada tinta/laranja | faixa entre filetes de 2px, rótulo "◇ Aviso" |
| Nav em 320px | uma linha que rola só na nav, com degradê | quebra em 3 linhas numeradas (01–07), sem rolagem |
| Matéria | sumário "Nesta matéria" à esquerda, numerais das seções pendurados na margem, capitular laranja | topo na faixa noturna, texto deslocado a 25%, abertura maior com 1ª linha em versalete |
| Contraste mínimo de texto | 5,53:1 | 5,85:1 |

## O que mudou em relação à v1 (direção B)

| Clichê da v1 | v2 |
|---|---|
| Grade uniforme de cartões com borda de 1px, cantos arredondados e fundo mais claro | Sem cartões e raio 0. Filetes finos e regras de 2px separam; os blocos têm tamanhos diferentes (1 grande + 2 médios + 3 curtos; linhas de súmula) |
| Etiquetas em pílula para tudo | A editoria é texto solto (laranja ou mono azul). O único "objeto" é o selo Exemplo, que agora se destaca por ser o único |
| Barrinha lima antes dos títulos de seção | Regra de 2px acima (V1) ou título em itálico seguido de filete (V2) |
| Ícone quadrado "Z" | Wordmark só tipográfico, com o contraste de peso e largura (V1) ou de romano e itálico (V2) |
| Círculo e linha do meio-campo decorativos | Nenhum grafismo de campo: o "esporte" vem da escala dos títulos, dos números tabulares e da noite |
| Verde-escuro + lima neon | Preto/branco + laranja sinalizador (V1); papel + azul-noite + âmbar de placar (V2) |
| Todos os elementos com o mesmo peso | Títulos de destaque de 7–8rem ao lado de metadados de 11–12px; espaço em branco proposital |
| Espaçamento homogêneo | Respiro grande no destaque e nas aberturas de seção, linhas apertadas nas listas |
| Bloco "Em números" | Removido. Números aparecem como tipografia em datas, tempos de leitura e contagem de matérias por editoria |

Arquivos: `variacao-1/` e `variacao-2/`, cada uma com `capa.html`, `materia.html` e `tokens.md` (com a tabela de contraste calculada). Os mockups abrem direto no navegador; o botão "Tema" alterna claro/escuro (`?theme=dark` também funciona). A matéria traz o texto completo e literal do `final.md` do PSG; os itens com selo usam clubes inventados. As fontes vêm do Google Fonts por `<link>` só nos mockups; na implementação entram por `next/font`.

Screenshots (375px e 1280px, claro e escuro, capa e matéria; foco na nav em 320px; topo de matéria fictícia): `test-results/design/01-v2/`. Scripts: `test-results/design/shots-v2.mjs`, `nav320-v2.mjs`, `contraste-v2.mjs`.
