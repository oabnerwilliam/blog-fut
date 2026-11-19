> **Decidido em 2026-11-19:** Zona Mista v2, variação 2 "Súmula". Veja `decisao.md` e os tokens oficiais em `docs/design/tokens.md`. Esta página e as pastas abaixo ficam como histórico.

# História 01: identidade visual, duas direções

O usuário escolhe uma. Depois da escolha, os tokens da direção aprovada passam para `docs/design/tokens.md` e a decisão (data e ajustes) é registrada em `docs/design/01-identidade-visual/decisao.md`.

| | **A: Folha Seca** | **B: Zona Mista** |
|---|---|---|
| Conceito | Jornal de papel lido sem pressa: papel creme, tinta preta, vermelho de manchete, serifas de caderno de domingo. | Faixa de placar do estádio à noite: verde-gramado escuro, lima de placar eletrônico, grotesca condensada e números grandes. |
| Nome | "Folha seca", o chute de Didi que cai devagar e no lugar certo. | "Zona mista", o corredor onde a imprensa encontra os jogadores depois do jogo. |
| Paleta (claro) | papel `#F5EFE3`, tinta `#1B1814`, vermelho `#A3201A`, foco azul `#1F55C4` | fundo `#F2F4F1`, faixa `#0C2B1C`, verde `#0A6A3A`, lima `#D4F05A`, foco laranja `#D9480F` |
| Paleta (escuro) | `#15120E` / `#ECE5D8` / coral `#F2836F` | `#0B120E` / `#E4ECE6` / verde `#5CD08A` (faixa e lima mantidos) |
| Fontes | Fraunces (títulos) + Source Serif 4 (texto) | Barlow Condensed (títulos) + Inter (texto) |
| Nav das 7 editorias em 320px | **Quebra de linha**: todas visíveis, centralizadas, em 2–3 linhas, como o índice de cadernos de um jornal. | **Rolagem horizontal só na nav**: faixa de uma linha com degradê na borda, como um placar que corre. |
| Selo "Exemplo" / aviso fictício | etiqueta ocre tracejada / faixa azulada com ícone "i" | etiqueta lima / caixa âmbar com ícone de alerta |
| Melhor para | leitura longa, tom autoral, análise e crônica | tom de portal esportivo, escaneável, números em evidência |
| Contraste mínimo de texto | 6,58:1 | 5,74:1 |

Arquivos:
- `direcao-a/capa.html`, `direcao-a/materia.html`, `direcao-a/tokens.md`
- `direcao-b/capa.html`, `direcao-b/materia.html`, `direcao-b/tokens.md`

Os mockups abrem direto no navegador. O botão no canto inferior direito alterna claro/escuro (ou use `?theme=dark` / `?theme=light` na URL). A matéria usa trechos literais do `final.md` do PSG; os cards com selo "Exemplo" usam clubes inventados. As fontes vêm do Google Fonts por `<link>` só nos mockups; na implementação entram por `next/font`.

Screenshots (375px e 1280px, claro e escuro): `test-results/design/01/`.
