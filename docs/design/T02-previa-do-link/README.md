# T02: prévia do link (imagem Open Graph, 1200 × 630)

Tarefa: `docs/tarefas/T02-previa-do-link.md`. Pedido do usuário: "quero prévias bonitas para compartilhar no WhatsApp e no LinkedIn". Três direções, todas dentro da identidade aprovada (Zona Mista · Súmula, `docs/design/tokens.md`). **O usuário escolhe uma.**

## Arquivos

| Arquivo | O que mostra |
|---|---|
| `index.html` | As três direções lado a lado: (a) título curto, (b) título longo, (c) fictícia, (d) imagem padrão; simulação no WhatsApp (bolha de ~300 px), no LinkedIn (card de ~552 px) e na miniatura quadrada de 96 px. O botão "Página escura" troca a página e o modo claro/escuro dos apps simulados. As artes não mudam |
| `direcao-a-faixa-noturna.html` | Direção A em tamanho real + régua do título |
| `direcao-b-sumula.html` | Direção B em tamanho real + régua do título |
| `direcao-c-placar.html` | Direção C em tamanho real + régua do título |

Screenshots de conferência: `test-results/design/T02/` (cada arte em 1200 × 630, seções do índice em claro e escuro).

Cada arte é um `<div>` de 1200 × 630 com estilo **inline**, escrito como o JSX do `ImageResponse` vai ser: todo contêiner com `display: flex`, medidas em px, sem grid, `filter`, `mask` nem `clip-path`. A moldura que reduz as artes no índice usa `transform`, mas ela é da página, não da arte.

Conteúdo dos exemplos:
- (a) "Hakimi, o lateral que virou artilheiro" (38 caracteres), Perfil.
- (b) "O mercado enxuto do PSG deu certo até aqui, mas as lesões de Kvaratskhelia, Dembélé e Marquinhos testam o elenco curto" (118). É um título de teste, mais longo que o real (67), para forçar a faixa de 81 a 120 caracteres.
- (c) "Como o Atlético Ventania aprendeu a defender com a bola" (55), fictícia.
- (d) imagem padrão do portal.

## As três direções

### A · Faixa noturna
**Conceito.** A faixa noturna do topo da matéria levada para fora do site: azul-noite com um refletor discreto no canto, título grande em marfim e o âmbar do placar como único brilho. Quem clica sai de uma imagem escura e chega na mesma faixa escura no topo da página.
**Paleta e fontes.** `#0E1120` → `#1A2142` (gradiente radial no canto superior direito), marfim `#ECEBE5`, cinza `#A3A7B6`, âmbar `#FFB000`. Instrument Serif no título e no wordmark, Geist Mono nos dados, Instrument Sans só nas editorias da imagem padrão.

Estrutura (matéria): padding `50 72 46`. Linha de cima com o wordmark (52 px) à esquerda e "01 ANÁLISE" (mono 24, número em cinza, editoria em âmbar 600) à direita, filete de 1 px `#2C3148` embaixo. O título fica ancorado embaixo, com um traço âmbar de 72 × 6 px acima dele. Rodapé com filete, "FUTEBOL DEPOIS DO APITO ◆" à esquerda e a data `19.11.2026` à direita (mono 20, cinza).
Fictícia: o selo "◇ EXEMPLO" (mono 600, 30 px, âmbar com texto `#16181D`) entra ao lado da editoria, e o rodapé troca o slogan por "◇ CONTEÚDO FICTÍCIO DE DEMONSTRAÇÃO" em marfim.
Padrão: wordmark de 196 px, "FUTEBOL DEPOIS DO APITO" em âmbar com o traço, e as 7 editorias numeradas no rodapé.

- **Prós:** é a mais legível em tamanho pequeno, com a maior caixa de título (1056 px) e as maiores fontes. O fundo escuro se destaca nos feeds brancos do WhatsApp claro e do LinkedIn. Tem continuidade direta com o topo da matéria e é a mais simples de implementar.
- **Contras:** é a menos surpreendente das três. No WhatsApp escuro, ela aparece como bloco escuro dentro da bolha verde, ainda nítida, mas com menos impacto. O gradiente deixa o PNG um pouco mais pesado, e vale conferir o limite de 300 KB (deve ficar bem abaixo).

### B · Súmula de papel
**Conceito.** A primeira dobra do site impressa: papel cinza-quente, wordmark sobre filete preto, editoria em azul-caneta e a faixa noturna reduzida a uma tira de rodapé com o âmbar. É a mais "revista".
**Paleta e fontes.** Papel `#EFEEE9`, tinta `#16181D`, cinza `#585B63`, azul-caneta `#2638C9`, tira `#0E1120` com âmbar `#FFB000` e marfim. Instrument Serif, Geist Mono e Instrument Sans.

Estrutura (matéria): padding `40 64 32`. Wordmark (52 px) e data, depois um filete de 2 px em tinta. Abaixo vem a linha "01 ANÁLISE" (mono 24, editoria em azul 600) e o título centralizado no espaço que sobra. Por fim, a tira noturna de 64 px: "◆ ANÁLISE, CRÔNICA E REPORTAGEM APURADAS PELO SQUAD-FUT" e "*Depois do apito*" em serifa itálica.
Fictícia: o selo (26 px) entra ao lado da editoria, e a tira de rodapé vira o aviso do site: fundo `#FFE9B0`, filete de 3 px em tinta, "◇ AVISO · Conteúdo fictício de demonstração".
Padrão: wordmark de 208 px em tinta, as 7 editorias como na nav do site e a tira noturna.

- **Prós:** é a mais fiel ao site (papel, filetes, azul-caneta, nav numerada). Tem leitura elegante no LinkedIn e no WhatsApp escuro, onde o papel claro salta da bolha verde-escura. O aviso fictício reaproveita o componente real.
- **Contras:** no WhatsApp claro e no feed branco do LinkedIn, o papel claro se mistura com o fundo do app e a prévia perde presença. A tira de rodapé fica pequena demais para ser lida no celular (vira só uma faixa escura). A caixa de título é a mais baixa (346 px), por isso é a direção com menos folga.

### C · Placar
**Conceito.** Um placar de estádio: painel noturno à esquerda com o número da editoria em âmbar gigante, como no telão, e o título no papel ao lado. O número 01–07 da nav vira a marca visual de cada matéria.
**Paleta e fontes.** Painel `#0E1120` com o número em âmbar `#FFB000` (Geist Mono 600, 216 px), papel `#EFEEE9` com tinta `#16181D`, azul-caneta `#2638C9` na lista da imagem padrão. Instrument Serif no título.

Estrutura (matéria): painel de 400 px com o wordmark (46 px), o número da editoria e o rótulo dela (mono 28), e a data no pé. O papel tem padding `48 60 52`, a linha "FUTEBOL DEPOIS DO APITO ◆" sobre um filete de 2 px e o título ancorado embaixo.
Fictícia: o selo (28 px) fica no painel, sob a editoria, e a linha de cima do papel vira o aviso amarelo "◇ Conteúdo fictício de demonstração".
Padrão: "Zona" em marfim e "*Mista*" em âmbar empilhados (168 px) no painel de 470 px, e as 7 editorias como uma escalação (número azul + nome, filetes entre as linhas).

- **Prós:** é a mais memorável e a mais "futebol". O número em âmbar aparece mesmo a 24% e cria uma série reconhecível (todo "01" é Análise). A imagem padrão em forma de escalação é a mais bonita das três.
- **Contras:** o título tem só 700 px de largura e sai menor: 62 px contra 68 px no título longo e 96 px contra 112 px no curto. Quem não conhece a nav do site não sabe o que "05" significa. É a mais complexa de implementar (dois painéis, regra própria).

## Recomendação: **A · Faixa noturna**

A prévia é lida em 300 px de largura, e é nisso que a A ganha: tem o maior título nas quatro faixas de comprimento e o maior contraste com o feed claro dos dois apps. Ela continua visualmente no topo da matéria, então o clique não causa estranheza, e é a mais barata e segura de implementar no Satori.
Se o usuário quiser mais personalidade, a C é a alternativa. Uma opção intermediária, se ele pedir: trazer para a A o número da editoria em âmbar grande no lugar do traço de 72 px. Isso não está desenhado aqui, para não misturar as direções.

## Régua do título (as direções desenham isto; o dev implementa)

O comprimento é `titulo.length` (o `titulo` da matéria, com espaços; o `titulo_seo` vai no `og:title`, não na arte). O estilo é Instrument Serif 400, `lineHeight: 1`, `letterSpacing` de −0,02 em (valor em px na tabela) e `textWrap: "balance"`.

**A e B** (caixa de 1056 a 1072 px de largura; 344 px de altura útil na A, 346 px na B):

| Caracteres | Fonte | letterSpacing | Linhas no máximo |
|---|---|---|---|
| 1 a 45 | 112 px | −2,2 px | 3 |
| 46 a 80 | 86 px | −1,7 px | 4 |
| 81 a 120 | 68 px | −1,4 px | 5 |
| 121 a 160 | 56 px | −1,1 px | 5 |
| acima de 160 | 48 px | −1 px | 6, com `lineClamp: 6` |

**C** (caixa de 700 px de largura; 448 px de altura útil):

| Caracteres | Fonte | letterSpacing | Linhas no máximo |
|---|---|---|---|
| 1 a 45 | 96 px | −1,9 px | 4 |
| 46 a 80 | 76 px | −1,5 px | 5 |
| 81 a 120 | 62 px | −1,2 px | 6 |
| 121 a 160 | 52 px | −1 px | 7 |
| acima de 160 | 44 px | −0,9 px | 8, com `lineClamp: 8` |

Como foi medido: no Chromium, com a Instrument Serif real, testei títulos de 30 a 200 caracteres, inclusive um "pior caso" só com palavras largas (Kvaratskhelia, Mönchengladbach, WWW). Na A e na B, nenhum passou de 4 linhas em nenhuma faixa. Na C, o pior caso artificial (palavras largas) chegou ao limite de 5 linhas na faixa de 46 a 80 caracteres, ainda dentro da altura útil; títulos reais ficaram com 1 ou 2 linhas de folga. "Linhas no máximo" deixa **uma linha de folga** sobre o pior caso medido, porque a quebra do Satori pode diferir um pouco da do navegador. Em todas as faixas, `fonte × linhas no máximo` cabe na altura útil (por exemplo, na A: 3 × 112 = 336, 4 × 86 = 344, 5 × 68 = 340), ou seja, mesmo no limite o título não corta. O `lineClamp` acima de 160 caracteres é só uma rede de segurança: o maior título do acervo hoje tem 117 caracteres (a entrevista com Odálio Brandão), e o `schema` não limita o tamanho.
Títulos do acervo: de 31 a 74 caracteres ficam em 112 ou 86 px na A e na B; o do PSG (67) usa 86 px em 2 linhas; o da entrevista (117) usa 68 px em 3 linhas. Veja a régua no fim de cada página de direção.

## Notas para implementar no `ImageResponse` (Satori)

- **Fontes (TTF estáticas em `assets/fontes/`, lidas só por `src/lib/og/fontes.ts`):** Instrument Serif 400 normal e itálico (título, wordmark, "*Depois do apito*"); Instrument Sans 600 (editorias na imagem padrão) e 700 (aviso fictício); Geist Mono 500 e 600 (dados, editoria, selo, número da C). A 400 do mono e da sans não aparece nas artes: carregue só o que for usado, para a função ficar leve.
- **Losangos ◇ e ◆ em SVG inline**, não em texto: o Geist Mono não tem esses glifos, e o Satori não busca uma fonte substituta. Use `<svg viewBox="0 0 16 16"><path d="M8 1.5 L14.5 8 L8 14.5 L1.5 8 Z"/></svg>`: o vazado tem `fill="none"` e traço de 2, o cheio tem só `fill`.
- **Wordmark:** dois `<span>` num flex com `alignItems: "baseline"`: "Zona" e "Mista" (`fontStyle: "italic"`, `marginLeft` de 0,1 do tamanho). Não use espaço em texto entre eles.
- **Caixa-alta:** `textTransform: "uppercase"` funciona no Satori. O texto-fonte fica "Análise", "Exemplo".
- **Data:** `publicado_em` no formato `DD.MM.AAAA`. O zero cortado do Geist Mono já vem no desenho da fonte e combina com o `slashed-zero` do site.
- **Gradiente da A:** `backgroundImage: "radial-gradient(circle at 92% 0%, #1A2142 0%, #0E1120 60%)"` sobre `backgroundColor: "#0E1120"`.
- **`textWrap: "balance"`** é suportado nas versões recentes do Satori. Se não for na versão instalada, tire: a régua não depende dele, porque o balanceamento não aumenta o número de linhas.
- **Âncora do título:** na A e na C, o título fica no pé da área (`justifyContent: "flex-end"`); na B, centralizado. Assim, títulos curtos deixam respiro em cima, não embaixo.
- Cores literais nas artes: o `ImageResponse` não lê CSS. Importe os valores de um único módulo (por exemplo, `src/lib/og/cores.ts`) com os mesmos hex do `tokens.md`.

## Contraste (WCAG 2.x, calculado)

A arte é fixa, então cada par vale para sempre. Na A, o texto do canto superior direito fica sobre o ponto mais claro do gradiente (`#1A2142`), por isso os dois extremos estão na tabela.

| Par | Texto | Fundo | Razão | Mínimo | Onde |
|---|---|---|---|---|---|
| marfim / noite | `#ECEBE5` | `#0E1120` | 15,70:1 | 4,5:1 | título A, wordmark A/C, rótulo da editoria C |
| marfim / noite clara | `#ECEBE5` | `#1A2142` | 13,12:1 | 4,5:1 | A, ponto mais claro do gradiente |
| cinza / noite | `#A3A7B6` | `#0E1120` | 7,82:1 | 4,5:1 | slogan, data, número da editoria A/C |
| cinza / noite clara | `#A3A7B6` | `#1A2142` | 6,54:1 | 4,5:1 | A, "01" no canto |
| âmbar / noite | `#FFB000` | `#0E1120` | 10,24:1 | 4,5:1 | editoria A, número da C, slogan da padrão A |
| âmbar / noite clara | `#FFB000` | `#1A2142` | 8,55:1 | 4,5:1 | A, editoria no canto |
| tinta / âmbar (selo) | `#16181D` | `#FFB000` | 9,69:1 | 4,5:1 | selo "◇ EXEMPLO" |
| tinta / papel | `#16181D` | `#EFEEE9` | 15,29:1 | 4,5:1 | título B/C, editorias |
| cinza / papel | `#585B63` | `#EFEEE9` | 5,85:1 | 4,5:1 | data B, rótulos da linha de cima B/C |
| azul-caneta / papel | `#2638C9` | `#EFEEE9` | 7,26:1 | 4,5:1 | editoria B, números da padrão C |
| tinta / aviso | `#16181D` | `#FFE9B0` | 14,83:1 | 4,5:1 | aviso fictício B/C |

O pior texto é o cinza sobre o papel, com 5,85:1. Os filetes `#C9C7BF` (papel) e `#2C3148` (noite) dão 1,46:1 e são decorativos, como no site. Nenhum par proibido do `tokens.md` aparece: não há âmbar como texto sobre o papel nem cinza claro sobre o papel.
Ressalva: contraste não é tamanho. Reduzida a 24% no WhatsApp, uma fonte de 20 a 24 px vira 5 ou 6 px. Por isso, nas três direções, a informação crítica (título e, na fictícia, o bloco âmbar do selo) está grande, e os rótulos em mono são complemento.

## Limites conhecidos

- **Miniatura quadrada:** quando o WhatsApp mostra a prévia pequena, ele recorta o centro da imagem, e nenhuma das três direções sobrevive inteira ao recorte (veja a última seção do `index.html`). Isso é inerente ao formato 1,91:1. Se virar problema, o caminho é uma segunda imagem quadrada, fora do escopo desta tarefa.
- O título e a descrição em texto abaixo da imagem vêm de `og:title` e `og:description`, que já existem (`src/lib/seo.ts`). As simulações usam o `titulo_seo` como `og:title`, como o site faz hoje.
- As simulações do WhatsApp e do LinkedIn são aproximadas (cores e medidas dos apps em 2026), servem para julgar a legibilidade, não o pixel exato.

## Decisão do usuário (2026-11-23)

Escolhida a **direção A · Faixa noturna** (`direcao-a-faixa-noturna.html`). As direções B e C ficam como registro.
