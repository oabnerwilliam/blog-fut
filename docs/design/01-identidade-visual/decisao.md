# Decisão: identidade visual do portal

**História:** `docs/backlog/01-identidade-visual.md` (critério 4)
**Data da aprovação:** 2026-11-19
**Aprovada pelo usuário:** Zona Mista v2, **variação 2 "Súmula"**
**Tokens oficiais:** `docs/design/tokens.md` (fonte única; os `tokens.md` das pastas de direção são históricos)

## Direção aprovada

**Zona Mista · Súmula.** A Zona Mista lida como revista de futebol: Instrument Serif grande para a voz, Geist Mono para os dados (como a súmula do árbitro), Instrument Sans para o texto corrido. O estádio à noite aparece como uma faixa azul-noite (destaque da capa, topo da matéria, rodapé), e o âmbar do placar de LED é o único brilho. Papel cinza-quente `#EFEEE9` no claro e azul-noite `#0E1120` no escuro, azul-caneta para links e editorias. Sem cartões, raio 0, páginas separadas por filetes.

- Nome do portal: **Zona Mista**, wordmark tipográfico "Zona" (romano) + "*Mista*" (itálico).
- Nav das 7 editorias: numerada 01–07, quebra em 3 linhas no 320px, sem rolagem.
- Selo "◇ EXEMPLO" (carimbo âmbar em mono) e aviso fictício (faixa entre filetes de 2px, rótulo "◇ Aviso").

## Histórico

### 1ª rodada: duas direções (`direcao-a/`, `direcao-b/`)
| Direção | Resultado |
|---|---|
| A "Folha Seca" (jornal de papel, Fraunces + Source Serif 4) | Descartada. O usuário preferiu a B. |
| B "Zona Mista" (placar de estádio, verde + lima, Barlow Condensed + Inter) | **Escolhida como base**, com ressalva. |

Comentário literal do usuário sobre a B: *"eu até gostei desse design, mas eu quero algo mais moderno, menos 'IA' (ironicamente kkkkkk)"*.

Pedidos que saíram dessa rodada:
- deixar a Zona Mista mais moderna e menos com cara de template (cartões com borda e raio, pílulas, ícone "Z", grafismo de meio-campo, verde + lima neon);
- **tirar o bloco "Em números"** por ora.

### 2ª rodada: duas variações da Zona Mista (`zona-mista-v2/`)
| Variação | Resultado |
|---|---|
| 1 "Refletor" (preto e branco + laranja sinalizador, Archivo + Newsreader) | Descartada. O usuário preferiu a 2. |
| 2 "Súmula" (papel + azul-noite + âmbar, Instrument Serif + Instrument Sans + Geist Mono) | **Aprovada.** |

**Ajustes pedidos na 2ª rodada:** nenhum. A Súmula foi aprovada como está no mockup. O bloco "Em números" continua fora.

Todas as direções e variações descartadas ficam nas pastas como histórico. Não devem ser usadas como referência de implementação.

## Referências para dev e homologador

- **Mockups de referência (os únicos válidos):**
  - `docs/design/01-identidade-visual/zona-mista-v2/variacao-2/capa.html`
  - `docs/design/01-identidade-visual/zona-mista-v2/variacao-2/materia.html`

  Abrem direto no navegador. Botão "Tema" ou `?theme=dark` / `?theme=light`.
- **Screenshots de referência:** `test-results/design/01-v2/v2-*.png` (capa e matéria em 375px e 1280px, claro e escuro; `v2-nav-320-foco-reportagem.png`; `v2-spec-ficticia-claro.png` e `-escuro.png`).
- Na história 1 o homologador compara **cabeçalho, rodapé, link de pular e foco** com a capa da variação 2 (critério 19). O conteúdo do meio da capa (faixa de destaque, súmula, editorias como frase, trio de crônicas) e a matéria são das histórias 3 e 4; a capa provisória só precisa usar os tokens.
- Tokens, fontes e especificação dos componentes de base: `docs/design/tokens.md`.
