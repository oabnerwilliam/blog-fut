# 18 Editor de texto: notas do mockup

Tela: `nova.html` (`/admin/materias/nova`), com os estados `?estado=erro` e `?estado=carregando`. Os parâmetros que existem só no mockup são `?theme=light|dark`, `?aba=previa` (abre a aba Prévia no celular) e `?shot`.
O mockup é gerado por `test-results/design/18/gerar18.mjs`, que copia o CSS de base do `editar.html` da 17 (que, por sua vez, vem da 16).
A tela segue a identidade da v1 (O2) e a linguagem da 16 e da 17. **Não há token novo nem par de cor novo.** A prévia usa `--text-lead` e `--text-h2`, que já existem em `tokens.md` §3, mas não estavam na cópia de tokens da 16.

## Decisões

- **Nav**: Painel · Matérias · **Nova matéria** · Acessos. Em `/admin/materias/nova`, "Nova matéria" recebe `aria-current="page"` e "Matérias" fica desmarcado. A lista (`/admin/materias`) ganha o mesmo link, como botão secundário ao lado dos filtros. O mockup não mostra a lista.
- **Topo**: "← Matérias", depois o chapéu "Matérias · ○ Sai como rascunho", o `h1` "Nova matéria" (`--text-section`, como o da edição) e a linha fina. É o único `h1`. O `h2` "Campos da nova matéria" fica em `sr-only`, e as seções visíveis usam `h2` em serifa itálica: Matéria, Buscadores e Corpo.
- **Campos**: são os mesmos componentes e a mesma aparência da 17, com rótulo sempre visível e "(opcional)" em `--color-ink-muted`. Até 64rem tudo fica numa coluna. A partir de 64rem, os campos se dividem em duas colunas (7fr/5fr): **Matéria** (título, slug, linha fina, editoria, tags, autor e fictício) e **Buscadores** (título SEO, descrição e palavras-chave). O slug vem logo depois do título, porque é calculado a partir dele.
- **Slug**:
  - O campo tem o prefixo visual `/materias/` em mono (`aria-hidden`), e o próprio slug também fica em mono.
  - A sugestão segue o título (`gerarSlug`) **até a pessoa editar o slug**. A partir daí, o slug não muda mais sozinho. O botão secundário "Usar o título" volta a aplicar a sugestão.
  - Abaixo do campo fica o aviso fixo "◐ **O slug não muda depois de criado.** Ele vira o endereço da matéria no site.", com um filete tracejado de 2px à esquerda (o tracejado indica o que ainda não existe no site, como na 17). O `input` aponta para o aviso por `aria-describedby`.
  - Se o título só tiver pontuação, o slug fica vazio e o erro do servidor é "O slug não pode ficar vazio".
- **Autor**: vem preenchido com o nome do Google ("Marina Couto") e pode ser editado. A dica diz "É a assinatura da matéria no site".
- **Tags**: o mesmo padrão da 17. Uma tag **nova**, que ainda não existe no banco, aparece com filete **tracejado** e leva " (tag nova)" em `sr-only`.
- **Fictício**: a caixa vem sempre desmarcada, e a dica abre com "Só para textos de demonstração".
- **Corpo (h2 "Corpo")**:
  - **A partir de 64rem**: o `textarea` e a prévia ficam lado a lado, em 1fr/1fr. O `textarea` tem 40rem de altura mínima. A prévia fica `sticky` e rola por dentro (`max-height: calc(100vh - 5rem)`), por isso tem `tabindex="0"` e `role="region"` rotulado por "Prévia".
  - **Abaixo de 64rem**: viram abas "Escrever" e "Prévia", que seguem o padrão APG.
    - O `role="tablist"` tem `aria-label="Corpo"`.
    - As abas são `button role="tab"` com `aria-selected` e `aria-controls`, e o `tabindex` é móvel (0 na aba ativa, -1 na outra).
    - As setas ←/→ circulam entre as abas, e Home/End vão para a primeira e a última. A ativação é automática.
    - Os painéis são `role="tabpanel"` com `aria-labelledby`, e o painel inativo recebe `hidden`.
    - A aba ativa aparece em `--color-accent`, em peso 600 e com um filete de 2px embaixo, como o item atual da nav. Nunca é só a cor.
  - **A troca é feita por JS** (`matchMedia('(min-width: 64rem)')`). No desktop, os papéis de aba são removidos e a tablist some. Sem JS, aparecem os dois painéis empilhados.
  - A dica do `textarea` resume o Markdown: `## ` para subtítulo, `- ` para lista, `> ` para citação e `[texto](endereço)` para link.
- **Prévia**:
  - Tem uma moldura **tracejada** de 1px em `--color-rule-strong`, que indica rascunho, algo que ainda não está no site.
  - Dentro dela fica um topo em miniatura na faixa noturna, como no `CabecalhoDaMateria`: a editoria em âmbar, o título em `--text-feature` e a linha fina com a ficha Por/Data/Leitura. A Data mostra "ao publicar". O título é um `<p>`, **não** um `h1`.
    - O topo é montado no cliente, só com **texto** dos campos.
  - Depois vem o corpo com a mesma `.prosa` do site, sem mudança. O app deve reaproveitar a classe `.prosa` e só ajustar o `margin-top` (1.5rem).
  - O HTML do corpo vem **só** da action `previsualizar` (ADR 0004).
  - Os `h2`/`h3` do Markdown continuam `h2`/`h3` dentro da região "Prévia". Isso é aceitável, porque é exatamente o que o leitor do site vai encontrar.
  - Com o corpo vazio, a prévia mostra "A prévia aparece aqui quando você escrever.", em serifa itálica `--color-ink-muted`.
- **Atualização da prévia** (`?estado=carregando`):
  - Acontece com um debounce de 400 ms, e só a última resposta vale.
  - Ao lado do rótulo "Prévia" fica um `<p role="status" aria-live="polite">`, em mono, com dois estados:
    - "Em dia com o texto";
    - "◌ Atualizando a prévia…", com filete tracejado.
  - Enquanto a resposta não chega, o HTML antigo continua visível, **sem opacidade reduzida** (isso preserva o contraste), e a região recebe `aria-busy="true"`.
  - Se a action falhar, a mensagem é "Não deu para atualizar a prévia. O texto não se perde.".
  - A região fica **dentro** do painel da prévia. No celular, quem está na aba Escrever não ouve um anúncio a cada pausa.
  - Não há animação, então o `prefers-reduced-motion` não tem nada a desligar.
- **Erro** (`?estado=erro`):
  - É o bloco `role="alert"` da 17, com o título "✕ Não criou" e links para cada campo. O foco vai para o bloco.
  - O slug duplicado mostra "Já existe uma matéria com o slug <slug>.", seguido de "Mude o slug, por exemplo acrescentando -2 no fim." O contorno do campo passa para 2px (`:has()` na caixa com o prefixo).
  - A linha fina vazia mostra "A linha fina não pode ficar vazia.".
  - Os campos inválidos recebem `aria-invalid` e `aria-describedby` com a mensagem.
  - O servidor devolve os valores enviados, e o corpo não se perde.
- **Criar rascunho**: é o botão cheio e grande no fim do formulário (`btn--frase`, que quebra linha com a fonte a 200%). A dica diz "Cria a matéria como ○ rascunho, fora do site, e abre a página de edição, onde você publica.".

## Contraste (script `test-results/design/18/contraste.mjs`)

Nenhum par é novo. Todos já estão em `tokens.md` §2 ou nos READMEs da 16 e da 17.

| Uso | Par | Claro | Escuro | Mínimo |
|---|---|---|---|---|
| Rótulos, texto do `textarea`, prosa, erros | `--color-ink` / `--color-bg` | 15,29 | 15,70 | 4,5 |
| Dicas, aba inativa, "Em dia com o texto", marcadores da lista | `--color-ink-muted` / `--color-bg` | 5,85 | 7,82 | 4,5 |
| Aba ativa e seu filete, links da prosa, filete da citação | `--color-accent` / `--color-bg` | 7,26 | 8,60 | 4,5 / 3 |
| Botão Criar rascunho | `--color-bg` / `--color-ink` | 15,29 | 15,70 | 4,5 |
| Título, linha fina e valores da ficha na prévia | `--color-night-ink` / `--color-night` | 15,70 | 13,12 | 4,5 |
| "Por", "Data" e "Leitura" na prévia | `--color-night-ink-muted` / `--color-night` | 7,82 | 6,54 | 4,5 |
| Editoria na prévia | `--color-amber` / `--color-night` | 10,24 | 8,55 | 4,5 |
| Moldura tracejada, aviso do slug, tag nova, campos | `--color-rule-strong` / `--color-bg` | 15,29 | 15,70 | 3 |

No escuro, `--color-night` sobre `--color-bg` dá só 1,20. Por isso o limite da prévia é a moldura tracejada (15,70), não a mudança de fundo.

## Conferido (`test-results/design/18/shots.mjs`)

- O padrão, o erro, o carregando e a aba Prévia (com e sem carregando) foram conferidos em 320, 375 e 1280px, nos temas claro e escuro, sem rolagem horizontal, com um único `h1` visível e com o axe sem violações (a barra do mockup ficou de fora).
- Com a fonte a 200% em 320px, não há rolagem horizontal: as abas e o "Criar rascunho" quebram linha.
- No teclado, em 375px, a seta → move o foco e a seleção para "Prévia", o painel Escrever recebe `hidden`, e Home volta para "Escrever". Em 1280px, os painéis ficam sem `role` e a tablist fica com `display: none`.
