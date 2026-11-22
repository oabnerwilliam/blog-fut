# 16 Login e acessos do admin: notas do mockup

Telas: `entrar.html` (`?estado=erro`), `pedido-enviado.html`, `acesso-nao-autorizado.html` (`?estado=revogado`) e `acessos.html` (`?estado=vazio`). Parâmetros só do mockup: `?theme=light|dark`, `?shot` (esconde a barra do mockup). O tema também alterna pelo botão de tema do topo, igual ao da história 07.
Identidade da v1 (decisão O2). **Nenhum token novo**: todos os pares abaixo já existem em `tokens.md`, alguns só invertidos.

## Decisões

- **Topo do admin** (`AdminHeader`, no lugar do `SiteHeader`): linha utilitária ("Área restrita da redação" + `BotaoDeTema`), depois a faixa com o nome do portal e quem está logado, fechada por um filete forte de ponta a ponta.
  - O nome fica menor que o da capa (`--text-section`) e vem seguido do marcador **ADMIN**, em mono 600 com um filete vertical de 1px. Ele **não tem fundo**, porque o único objeto com fundo do portal continua sendo o selo Exemplo.
  - O nome é um link para `/admin`. Os dois textos visuais têm `aria-hidden`, e o nome acessível vem de um `sr-only` "Zona Mista Admin, painel". Não use `aria-label`: com ele, o axe acusa `label-content-name-mismatch`, porque o texto visível "ZonaMista" não tem espaço.
  - Quem está logado: avatar de 32px, o nome (com "Conectado como" em `sr-only`) e o botão **Sair**, num `<form>` com POST. Abaixo de 48rem, esse grupo desce para a linha de baixo, com o Sair à direita (`margin-left: auto` no `<form>`).
  - Em `/admin/entrar` não há ninguém logado, então o topo mostra só o nome. Em "pedido enviado" e "não autorizado" aparecem o nome e o Sair, para a pessoa poder trocar de conta, mas a nav não aparece.
- **Nav do admin** (só para aprovado): "Painel" e "Acessos", com o estilo da nav pública sem os números. O item ativo usa `aria-current="page"`, sublinhado de 2px em `--color-accent`. A história 17 acrescenta "Matérias".
- **Rodapé do admin**: um colofão no papel (filete forte, "© 2026 Zona Mista · Admin" e "Ir para o portal →"), sem a faixa noturna. O cabeçalho público continua sem link de login.
- **Botões**:
  - O secundário segue o Buscar: filete de 1px em `--color-rule-strong`, mono 600 em caixa-alta, sem fundo, altura de 40px (`--tap-min`). Ele vale para Recusar, Revogar, Reabrir e Sair.
  - O primário (Entrar com Google e Aceitar) é cheio: fundo `--color-ink` e texto `--color-bg`. No hover, o fundo vai para `--color-accent`.
  - Não existe cor de "perigo". Revogar é secundário e se desfaz com Reabrir.
  - O "Entrar com Google" não tem o logo colorido do Google, porque o logo exigiria cores literais.
  - Quando o mesmo botão se repete na lista, o nome acessível ganha o nome da pessoa em `sr-only` ("Aceitar Joana Prado"). Ele começa pelo texto visível, como pede o WCAG 2.5.3.
- **Situação**: sempre forma e palavra, nunca só cor. São ○ Pendente, ● Aprovado(a), ✕ Recusado e — Revogado(a).
- **/admin/acessos**:
  - Cabeçalho: chapéu, o `h1` "Acessos", a linha fina e um resumo em mono ("2 pendentes · 3 aprovados · 2 recusados ou revogados").
  - Retorno das ações: uma região `role="status"` que fica sempre no DOM e é preenchida depois da action ("Pedido de Rafael Lima aceito…"), com um filete de 2px em `--color-accent`.
  - Três `<section>` com `h2` em serifa itálica, um fio e a contagem em mono (o padrão do título de seção da capa).
  - As pessoas ficam numa `<ul>` com linhas de súmula. Cada linha tem o avatar, o nome com o e-mail, a meta (situação, data e quem decidiu) e as ações. A meta mostra "por comando" quando `decidido_por` é nulo (o primeiro admin).
  - Layout: com a lista a partir de 52rem (container query), cada pessoa ocupa uma linha só, com as ações à direita numa coluna de 13rem. Abaixo disso, as ações descem para baixo da meta. Com a fonte ampliada em 320px, o avatar fica em cima.
  - Ações por grupo: pendente tem Aceitar (cheio) e Recusar; aprovado tem Revogar; recusado ou revogado tem Reabrir.
  - **A própria linha** leva o marcador "VOCÊ" (filete de 1px, sem fundo) e, no lugar das ações, o texto "Sua conta · sem ações".
  - **Estado vazio** (`?estado=vazio`): a contagem fica 00, e aparece a frase "Nenhum pedido pendente." em serifa itálica, com uma explicação em `--color-ink-muted`.
- **Entrar**:
  - O `h1` é "Entrar na redação", seguido da linha fina, do botão grande e de três passos numerados 01–03, que explicam o pedido.
  - O erro do callback é um bloco `role="alert"` com filetes de 2px em `--color-rule-strong` e **sem fundo**. Assim ele não se confunde com o aviso de conteúdo fictício, que é âmbar.
- **Pedido enviado / Não autorizado**: o `h1`, a linha fina e uma ficha `<dl>` em linhas de súmula (conta, data e situação). Em seguida vem o que fazer: recarregar, ou usar o Sair para trocar de conta, ou falar com quem cuida do portal.
- Layout: a coluna de leitura (`--layout-measure`) fica deslocada 25% a partir de 64rem nas três telas de acesso. `/admin/acessos` usa a largura toda.

## Avatar

- O avatar é quadrado (raio 0): 40px na lista e na ficha, 32px no topo. A foto vem da `avatar_url` do Google, com `object-fit: cover`.
- **Com foto:** `<img alt="">`. O nome está sempre escrito ao lado, então a imagem é decorativa. Um `alt` com o nome faria o leitor de tela dizer o nome duas vezes.
- **Sem foto (ou com erro ao carregar):** as iniciais ficam sobre `--color-night`, em `--color-night-ink`, mono 600, num `<span aria-hidden="true">`. O texto alternativo é o próprio nome escrito ao lado.
  - Regra das iniciais: a primeira letra da primeira e da última palavra do `nome`, em maiúsculas ("Carlos Henrique Duarte" vira "CD"; "Rafael" vira "R").
  - Sem nome, usa a primeira letra do e-mail. Sem nome e sem e-mail, usa "?".
  - Se um dia o avatar aparecer sem o nome ao lado, ele deixa de ser decorativo e passa a levar `role="img" aria-label="<nome>"` (ou `alt="<nome>"` na foto).
- No mockup, as "fotos" são SVGs embutidos que simulam uma foto de perfil, e as cores literais delas existem só no mockup.

## Tokens usados

As cores usadas são `--color-bg`, `--color-ink`, `--color-ink-muted`, `--color-rule`, `--color-rule-strong`, `--color-accent`, `--color-night`, `--color-night-ink`, `--color-focus` e `--color-amber` (só no link de pular).
A tipografia usa `--font-display`, `--font-text` e `--font-mono`, com os tamanhos `--text-label`, `--text-nav`, `--text-body`, `--text-dek`, `--text-row-title`, `--text-section` e `--text-feature`.
As medidas são `--space-section`, `--layout-gutter`, `--layout-max`, `--layout-measure`, `--rule-width`, `--rule-width-strong`, `--focus-width`, `--focus-offset` e `--tap-min`.

## Contraste (pares novos nesta história; script `test-results/design/16/contraste.mjs`)

| Par | Claro | Escuro | Mínimo |
|---|---|---|---|
| Botão cheio: `--color-bg` sobre `--color-ink` | 15,29 | 15,70 | 4,5 |
| Botão cheio no hover: `--color-bg` sobre `--color-accent` | 7,26 | 8,60 | 4,5 |
| Iniciais: `--color-night-ink` sobre `--color-night` | 15,70 | 13,12 | 4,5 |
| Filete do botão secundário: `--color-rule-strong` / `--color-bg` (UI) | 15,29 | 15,70 | 3 |
| Botão secundário no hover (texto e filete): `--color-accent` / `--color-bg` | 7,26 | 8,60 | 4,5 |
| Foco (contorno a 3px do botão, sobre o papel): `--color-focus` / `--color-bg` | 7,26 | 8,60 | 3 |

Os demais textos (`--color-ink` e `--color-ink-muted` sobre `--color-bg`) já estão em `tokens.md` §2. O pior caso é 5,85:1.

## Conferido (`test-results/design/16/shots.mjs`)

- As 4 telas e os estados delas foram conferidos em 320, 375 e 1280px, nos temas claro e escuro:
  - sem rolagem horizontal;
  - um único `h1` visível;
  - axe sem violações (a barra do mockup ficou de fora).
- Em `acessos.html`, com a fonte a 200% em 320px, também não há rolagem horizontal.
- A ordem de Tab em `acessos.html` é: Pular → Tema → Zona Mista Admin → Sair → Painel → Acessos → Aceitar Joana Prado → Recusar Joana Prado → …
