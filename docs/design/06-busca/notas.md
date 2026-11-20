# 06 Busca: notas do mockup

Mockup: `busca.html` (`?estado=vazia|sem-resultado|com-resultado`, `?theme=light|dark`, `?shot` esconde a barra do mockup). Segue a identidade aprovada. **Nenhum token novo.**

## 1. Campo no cabeçalho

O formulário entra **no mesmo DOM em todas as larguras**, dentro de uma coluna lateral (`mast__side`) que fica logo depois do wordmark e agrupa o slogan longo e o campo:

```
<div class="mast__main">            flex, flex-wrap: wrap, align-items: flex-end, gap .75rem 1rem
  <a wordmark>
  <div class="mast__side">          grid, gap .6rem, padding-bottom .55rem
    <p slogan longo>                 hidden abaixo de 48rem (como hoje)
    <form role="search" action="/busca" method="get" aria-label="Buscar no portal">
      <label class="sr-only" for="q-cabecalho">Buscar matérias</label>
      <input id="q-cabecalho" type="search" name="q" placeholder="Clube, jogador, tema" maxlength="100" autocomplete="off" enterkeyhint="search">
      <button type="submit">Buscar</button>
```

- **Mobile (< 48rem):** `mast__side` com `flex: 1 1 100%`. O campo ganha **linha própria, na largura toda**, entre o wordmark e a nav. Escolhi isto em vez de um link "Buscar" porque o e2e (critério 11) digita no campo do cabeçalho em 320px, e porque a linha própria cabe sem aperto: em 320px sobram 288px, com o botão em ~70px e o campo em ~218px. O custo é de +~50px de altura no cabeçalho.
- **Desktop (≥ 48rem, `md:`):** `mast__side` com `flex: 0 1 22rem; justify-items: end`. Fica à direita do wordmark, com o slogan em cima e o campo embaixo, alinhado à base do wordmark.
- O campo do cabeçalho sai **sempre vazio** (decisão da história).
- `maxlength="100"` só ajuda o leitor; o corte de verdade é o `lerTermo`.

## 2. Ordem de Tab

Pular → nome (wordmark) → **campo de busca → botão Buscar** → 7 editorias → conteúdo.
O `teclado.spec.ts` ganha 2 paradas entre o nome e "Análise". Conferido no mockup em 320px: o 3º Tab cai em `#q-cabecalho`.

Na página `/busca`, depois da nav vêm o campo da página e o botão (formulário próprio), e depois os resultados ou os links das editorias.

## 3. Estilo do campo (`.campo`, igual no cabeçalho e na página)

- Contêiner `flex`, `width: 100%; min-width: 0`.
- `input`: `flex: 1 1 auto; min-width: 0; min-height: var(--tap-min); padding: 0 .75rem; border: var(--rule-width) solid var(--color-rule-strong); border-radius: 0; background: transparent; color: var(--color-ink); font: 400 1rem/1.2 var(--font-text); appearance: none`. **Fonte com no mínimo 1rem**: abaixo disso, o iOS dá zoom ao focar.
- `::placeholder`: `color: var(--color-ink-muted); opacity: 1`. O placeholder não substitui o rótulo.
- `button`: `min-height: var(--tap-min); margin-left: calc(-1 * var(--rule-width))` (as bordas se sobrepõem num filete só); `padding: 0 .9rem`; a mesma borda; fundo transparente; texto `--color-ink` no estilo `.label` com peso 600. Hover: `--color-accent`. Sem fundo cheio: o selo continua sendo o único objeto com fundo (tokens.md §5.4).
- Foco: o global (`outline: var(--focus-width) solid var(--color-focus); outline-offset: var(--focus-offset)`) + `position: relative; z-index: 1` no elemento focado, para o contorno passar por cima do vizinho.
- Na página, o `.busca-form .campo` cresce: `min-height: 3rem` no input e no botão, `font-size: var(--text-dek)` no input e `padding-inline: 1.1rem` no botão. O formulário tem `max-width: 40rem`.

## 4. Página `/busca`

Dentro de `.wrap`, de cima para baixo:
1. **Topo**, mesmo desenho do `CabecalhoDaListagem` (`pt-(--space-section)`, chapéu `.label text-accent` "Acervo", h1 `text-h1` + fio `after:` em `--color-rule-strong`), **sem a contagem no fio**. Dá para extrair o bloco do fio ou repetir as classes.
2. **Formulário** com `role="search"`, `aria-label="Buscar matérias no acervo"`, rótulo **visível** "O que você procura?" (`.label`, cor `--color-ink`), input preenchido e botão "Buscar". Fica fora do Suspense.
3. Conforme o estado:
   - **Com resultado:** `<p>` com `mt-5`, `text-body`, `--color-ink-muted`: `<span class="mono" (ink)>3</span> resultados para “<span class="termo">são ciríaco</span>”`. O `.termo` usa `--color-ink`, peso 600 e `overflow-wrap: anywhere`, porque um termo de 100 caracteres sem espaço não pode vazar em 320px. Depois vem `ListaDeMaterias` (`nivelDoTitulo="h2"`) com `mt-6`. O selo "Exemplo" já sai do `ChapeuDaCapa`.
   - **Sem resultado:** `<p>` com `mt-6`, `max-w-[24ch]`, `font-display text-row-title leading-[1.06] tracking-[-0.012em]`: Nenhuma matéria encontrada para “<termo>”. Aqui o termo vai em **itálico peso 400**: a Instrument Serif só tem 400, e um negrito seria falso. Depois vem a sugestão.
   - **Vazia:** só a sugestão, sem mensagem de erro.
   - **Sugestão** (vazio e sem resultado): `<p>` com `mt-3`, `max-w-(--layout-measure)`, `text-body`, `leading-[1.6]`, `--color-ink-muted`: "Procure pelo nome de um clube, de um jogador ou de uma competição. Se preferir, comece por uma editoria." Logo depois, **o `EditoriasDaCapa` reaproveitado sem mudança** (h2 "Editorias", "matérias publicadas", frase grande com contagem). Ele recebe `listEditorias()` (só editorias com matéria) e fica fora do `.wrap` do topo, como na capa.
4. O termo vem sempre como texto do React (nunca `dangerouslySetInnerHTML`), entre aspas curvas “ ”.
5. Fallback do Suspense: nada visível (ou só um espaço com a altura da linha de status). Nunca uma mensagem de estado.

## 5. Reaproveitar (já existem)

`.wrap`, `.label`, `.mono`, `.sr-only`, foco global de `globals.css`; `EditoriasNav` sem mudança; `ListaDeMaterias`; `ChapeuDaCapa` (com o selo); `EditoriasDaCapa` + `TituloDeSecao`; as classes do topo do `CabecalhoDaListagem`. Utilitários: `border-rule-strong`, `text-ink`, `text-ink-muted`, `text-accent`, `min-h-(--tap-min)`, `text-dek`, `text-body`, `text-row-title`, `text-h1`, `md:`.

## 6. Contraste (valores de tokens.md §2)

| Par | Claro | Escuro | Mínimo |
|---|---|---|---|
| Texto digitado e botão (`--color-ink` / `--color-bg`) | 15,29 | 15,70 | 4,5 |
| Placeholder, status e sugestão (`--color-ink-muted` / `--color-bg`) | 5,85 | 7,82 | 4,5 |
| Botão no hover (`--color-accent` / `--color-bg`) | 7,26 | 8,60 | 4,5 |
| Borda do campo e do botão (`--color-rule-strong` / `--color-bg`, UI) | 15,29 | 15,70 | 3 |
| Contorno de foco (`--color-focus` / `--color-bg`, UI) | 7,26 | 8,60 | 3 |
| Selo (`--color-badge-ink` / `--color-badge-bg`) | 9,69 | 9,69 | 4,5 |

A borda do campo usa `--color-rule-strong`, e não `--color-rule`, porque `--color-rule` é decorativo (≈1,4:1) e não serve como limite de controle.

## 7. Conferido no mockup (Playwright, `test-results/design/06-busca/`)

- 320, 375 e 1280px, claro e escuro, nos três estados: sem rolagem horizontal e um único `h1`.
- 320px com a fonte a 200%: sem rolagem. A lista usa a mesma container query `@max-[10rem]` do `ListaDeMaterias`.
- `prefers-reduced-motion`: o design não tem animação.
