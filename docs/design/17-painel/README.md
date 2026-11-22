# 17 Painel com histórico: notas do mockup

Telas: `materias.html` (`?estado=vazio`), `editar.html` (`?estado=em-dia`, `?estado=erro`) e `historico.html` (padrão: comparação 3 → 5; `?estado=revisao`: revisão 2 aberta; `?estado=restaurada`: depois de restaurar). Parâmetros só do mockup: `?theme=light|dark`, `?shot`. Os mockups são gerados por `test-results/design/17/gerar17.mjs`, que copia o CSS de base do mockup 16 (topo, nav, botões, ficha, erro, `role="status"`, rodapé).
Identidade da v1 (O2), mesma linguagem da 16. **Nenhum token novo** e nenhum par de cor novo.

## Decisões

- **Nav do admin**: Painel · Matérias · Acessos. Em `/admin/materias` o item tem `aria-current="page"`. Na edição e no histórico ele continua marcado, mas com `aria-current="true"`, e o visual é o mesmo.
- **Título exibido no admin**: é o da revisão **em edição**, na lista, no `h1` da edição e no histórico. O site mostra o da publicada, e a diferença é sinalizada pelo marcador de alterações não publicadas.
- **Status da matéria**: forma e palavra, como a Situação da 16. São ● Publicado e ○ Rascunho.
- **Marcadores sem fundo**: mono 600 de 10px com filete de 1px, como o "VOCÊ" da 16.
  - Com filete **tracejado**, o marcador indica o que ainda não está no site: "◐ Alterações não publicadas" e "◐ Em edição".
  - Com filete **contínuo**, indica o que está no site: "● Publicada".
  - A revisão 1 de uma matéria do squad leva "◇ Texto do squad".
  - O único objeto com fundo continua sendo o selo ◇ Exemplo, que aparece nas fictícias da lista.

### Lista (`/admin/materias`)

- Os filtros ficam num `<form method="get">` com três `<select>` de rótulo visível (Status, Editoria, Fonte) e o botão Filtrar. Os filtros vão na URL. "Limpar filtros" só aparece quando há algum filtro aplicado.
- Abaixo dos filtros vem a contagem "Mostrando N de 9 matérias", em `role="status"`. No estado vazio, ela repete os filtros usados.
- Cada linha tem:
  - o chapéu (editoria + selo Exemplo);
  - o título como `h2`, com link para a edição;
  - a meta (status · fonte; data; marcador);
  - os links "Histórico" e "Ver no site". "Ver no site" só aparece nas publicadas, e os dois têm o título em `sr-only`.
- Layout: a partir de 52rem (container query), a linha tem 3 colunas (`1fr 16rem 8rem`). Abaixo disso, tudo fica empilhado.
- A data mostra "publicada em" ou, num rascunho, "despublicada · era de".
- **Vazio**: o padrão da 16, com a frase em serifa itálica e uma explicação que traz o link "limpe todos".

### Edição (`/admin/materias/[id]`)

- No topo: "← Matérias", o chapéu ("Editar matéria" + editoria), o `h1` com o título (em `--text-section`, sem itálico) e a linha de estado ("● Publicado · revisão 3 no site · revisão 5 em edição").
- O retorno das actions fica numa região `role="status"`, igual à da 16 ("Revisão 5 salva. O site continua mostrando a revisão 3…").
- **Coluna lateral "Publicação"**: fica primeiro no DOM, então no celular aparece acima do formulário. A partir de 64rem ela vai para a direita, com `sticky`. Ela reúne:
  - o **aviso de alterações não publicadas**: filetes **tracejados de 2px** em `--color-rule-strong`, sem fundo, com "◐ Alterações não publicadas" e a frase com o número da revisão, o autor e a data. O tracejado o separa do erro (filete contínuo de 2px) e do aviso de fictício (âmbar). Quando a revisão em edição é a publicada, o aviso dá lugar a "● Em dia.";
  - uma ficha `<dl>` **só de leitura** com o slug, "Publicada em", a fonte e a origem, seguida da nota "O slug e a data de publicação não mudam pelo painel.". São texto, não `input readonly`: não recebem Tab nem parecem editáveis;
  - os botões **Publicar alterações** (cheio) e **Despublicar** (secundário, porque se desfaz publicando de novo), cada um no próprio `<form>` e com uma dica em `aria-describedby`. Sem nada para publicar, o botão some e aparece "Nada a publicar.". O Publicar publica a última revisão **salva**, e a dica avisa isso;
  - o link "Histórico · 5 revisões →".
- **Campos**:
  - Rótulos visíveis sempre em cima, sem placeholder no lugar do rótulo. O "(opcional)" vai em `--color-ink-muted`.
  - Os campos são `--color-rule-strong` 1px, com raio 0 e sem fundo. Altura mínima de 44px. O `select` tem uma seta desenhada em CSS com `currentColor`.
  - A ordem é: título, título para buscadores, linha fina, editoria, tags, descrição para buscadores, palavras-chave (uma por linha), autor, "Conteúdo fictício" (checkbox com a explicação) e corpo.
  - O corpo é um `textarea` em mono, com 24rem de altura mínima. A dica explica que ele é Markdown e que o histórico compara linha a linha.
  - Tags: as escolhidas ficam numa `<ul>`, cada uma com um botão ✕ "Remover <slug>". Para acrescentar, há um `input` com `datalist` das tags existentes e o botão Adicionar. A dica explica o slug novo e como o rótulo é humanizado.
- **Erro de validação** (`?estado=erro`), que vem do servidor:
  - No topo do formulário aparece um bloco `role="alert"`, o mesmo do erro de entrar da 16 (filetes de 2px, sem fundo). Ele diz "✕ Não salvou" e lista links que levam a cada campo. O foco vai para esse bloco.
  - Cada campo inválido ganha `aria-invalid="true"`, um filete de **2px** e uma mensagem "✕ frase" em `--color-ink` 600, ligada por `aria-describedby`. Nunca só cor.
- O **Salvar** é cheio e grande, no fim do formulário, com a dica "Cria a revisão 6. O site não muda até você publicar.".

### Histórico (`/admin/materias/[id]/historico`)

- `h1` "Histórico", com o título da matéria na linha fina e um resumo em mono ("5 revisões · publicada: 3 · em edição: 5 · nenhuma revisão é apagada").
- Layout: a partir de 64rem são duas colunas (lista com 18 a 22rem e painel). Abaixo disso, a lista vem antes do painel.
- **Revisões**: uma `<ol reversed>`, da mais nova para a mais antiga. Cada item mostra:
  - o número em mono 24px (o leitor de tela ouve "Revisão 5");
  - o autor e a origem (do squad, painel ou importação);
  - a data e a hora;
  - os marcadores;
  - os links "Abrir" e "Comparar com a publicada", este fora da publicada.

  A revisão aberta ganha um filete de 2px em `--color-accent` à esquerda. Ela deve receber `aria-current="true"` no link.
- **Comparar duas revisões**: um `<form method="get">` com os `<select>` De e Para e o botão Comparar. As URLs sugeridas são `?ver=N` e `?de=A&para=B`.
- **Comparação**:
  - O `h2` é "Revisão 3 → revisão 5", seguido de uma linha com quem salvou cada uma e de uma legenda (`aria-hidden`, porque o leitor de tela já recebe o prefixo de cada linha).
  - A seção "Campos" mostra os campos alterados num `<dl>`, cada um com o par −/+.
  - A seção "Corpo" é uma `<ol>` de linhas:
    - **Removida**: o símbolo "−", um filete de 2px em `--color-rule-strong` e o texto em `--color-ink-muted` **riscado** com 1px (`<del>`).
    - **Adicionada**: o símbolo "+" em `--color-accent`, um filete de 2px em `--color-accent` e o texto em `--color-ink` (`<ins>`).
    - **Igual**: o texto em `--color-ink-muted`, sem símbolo.
    - **Trechos iguais longos**: viram uma linha "⋯ N linhas iguais (a–b)". Ficam 2 linhas de contexto em volta de cada mudança.
  - **Leitor de tela**: cada `<li>` começa com um `sr-only` "Removida, linha 5 da revisão 3:", "Adicionada, linha 5 da revisão 5:" ou "Igual, linha 7:". O símbolo e o número visíveis ficam `aria-hidden`, e a linha em branco é lida como "linha em branco". `<del>` e `<ins>` sozinhos não bastam, porque a maioria dos leitores de tela não os anuncia.
  - Numeração: as removidas usam o número da revisão "de", e as demais, o da revisão "para". Uma nota abaixo do diff explica isso.
  - Abaixo da comparação fica o botão secundário "Restaurar a revisão N", com a revisão "de".
- **Revisão aberta**:
  - Tem o `h2` "Revisão 2", a meta, os links "Comparar com a anterior" e "Comparar com a publicada", e o botão cheio **Restaurar esta versão**, com a dica "Cria a revisão 6 com o conteúdo da 2… Nada é apagado".
  - Depois vêm a ficha `<dl>` com todos os campos e o corpo em Markdown cru, em mono e com `pre-wrap`.
  - A revisão em edição não tem o botão Restaurar.
- **Depois de restaurar**: o `role="status"` diz "Revisão 2 restaurada como revisão 6. O site continua na revisão 3 até você publicar na edição.", e a revisão 6 aparece no topo, marcada "◐ Em edição".

## Tokens usados

As cores usadas são `--color-bg`, `--color-ink`, `--color-ink-muted`, `--color-rule`, `--color-rule-strong`, `--color-accent`, `--color-badge-bg`, `--color-badge-ink`, `--color-night`, `--color-night-ink` (iniciais do avatar), `--color-focus` e `--color-amber` (link de pular).
A tipografia usa `--font-display`, `--font-text` e `--font-mono`, com os tamanhos `--text-label`, `--text-nav`, `--text-body`, `--text-dek`, `--text-row-title`, `--text-section` e `--text-feature`.
As medidas são `--space-section`, `--layout-gutter`, `--layout-max`, `--layout-measure`, `--rule-width`, `--rule-width-strong`, `--focus-width`, `--focus-offset` e `--tap-min`.
Algumas medidas são literais, como na 16: campos com 44px de altura mínima (`min-height: 2.75rem`), número da revisão com 1.5rem e marcador com .625rem.

## Contraste (script `test-results/design/17/contraste.mjs`)

Não há pares novos: todos já estão em `tokens.md` §2 ou no README da 16. O que muda é o uso deles.

| Uso | Par | Claro | Escuro | Mínimo |
|---|---|---|---|---|
| Texto da linha adicionada, rótulos, mensagens de erro | `--color-ink` / `--color-bg` | 15,29 | 15,70 | 4,5 |
| Símbolo "+" e filete da adicionada, revisão aberta | `--color-accent` / `--color-bg` | 7,26 | 8,60 | 4,5 (texto) / 3 (UI) |
| Texto removido (riscado), linhas iguais, dicas | `--color-ink-muted` / `--color-bg` | 5,85 | 7,82 | 4,5 |
| Filete da removida, marcador tracejado, borda dos campos, aviso tracejado | `--color-rule-strong` / `--color-bg` | 15,29 | 15,70 | 3 |
| Selo Exemplo na lista | `--color-badge-ink` / `--color-badge-bg` | 9,69 | 9,69 | 4,5 |

O filete `--color-rule` (decorativo) separa as linhas, mas nunca é a única pista. O tipo de cada linha do diff é dado pelo símbolo, pelo risco e pelo prefixo `sr-only`.

## Conferido (`test-results/design/17/shots.mjs`)

- As 3 telas e os 8 estados foram conferidos em 320, 375 e 1280px, nos temas claro e escuro, com estes resultados:
  - sem rolagem horizontal;
  - um único `h1` visível;
  - axe sem violações (a barra do mockup ficou de fora).
- Com a fonte a 200% em 320px, as 3 telas ficam sem rolagem horizontal. Os botões de frase ("Publicar alterações", "Restaurar…") e os marcadores quebram linha.
- A ordem de Tab na lista é: Pular → Tema → Zona Mista Admin → Sair → Painel → Matérias → Acessos → Status → Editoria → Fonte → Filtrar → primeira matéria.
