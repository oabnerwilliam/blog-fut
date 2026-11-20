# 07 Modo escuro: notas do mockup (botão de tema)

Mockup: `tema.html`. O botão funciona (ciclo sistema → claro → escuro e `localStorage["tema"]`). Parâmetros só do mockup: `?theme=sistema|light|dark`, `?sistema=dark` (simula sistema escuro), `?nojs`, `?shot`. Base: o cabeçalho da história 06 sem mudança, exceto a linha de cima. **Nenhum token novo.**

## 1. Posição: na linha de cima, à direita do slogan (todas as larguras)

```
<div class="mast__line label">          era <p>: um <button> dentro de <p> é válido, mas a linha deixa de ser "um parágrafo"
  <span>Futebol depois do apito</span>
  <BotaoDeTema />
</div>
```

Por quê: a linha de cima tem a direita vazia em todas as larguras (o lugar onde o mockup original punha a data). É a linha utilitária do jornal, e o botão é uma preferência, não navegação. Na linha do wordmark ele competiria com o campo de busca, e no mobile exigiria mais uma linha. Ficando no mesmo lugar no mobile e no desktop, o leitor não precisa procurar.

Mudanças na linha (`SiteHeader`):
- `flex flex-wrap items-center justify-between gap-x-4 gap-y-2` (o `gap-y` de .5rem compensa a margem negativa do botão quando ele desce de linha).
- O slogan: `flex-[1_1_9rem] min-w-0`. **Em 320px o slogan quebra em 2 linhas** ("Futebol depois do / apito") e o botão fica ao lado. Com a fonte a 200%, o botão desce para uma linha própria, à direita (`ml-auto`).
- Altura: a linha passa de ~26px para ~35px (desktop e 375px) e para ~42px em 320px. **As referências do `visual.spec.ts` que mostram o cabeçalho mudam por isso**, e nada abaixo do cabeçalho muda.

## 2. Ordem de Tab

Pular → **botão de tema** → nome (wordmark) → campo de busca → botão Buscar → 7 editorias → conteúdo.

A ordem segue a ordem visual (o botão está acima do wordmark), então ele entra no DOM antes do wordmark. O `teclado.spec.ts` ganha 1 parada entre "Pular" e o nome. Conferido no mockup em 320px: o 2º Tab cai no botão, e Enter três vezes percorre claro → escuro → sistema.

## 3. Estilo do botão

O estilo `.label`, sem borda e sem fundo. Não usei a borda do Buscar: uma caixa de 40px com filete na linha fina faria a linha competir com o campo logo abaixo, e no mobile seriam dois controles com caixa empilhados.

- `<button type="button">` com `relative inline-flex items-center gap-[.5em] shrink-0 whitespace-nowrap`, `min-h-(--tap-min) min-w-(--tap-min)`, `px-2` e **`-my-2 -mr-2 ml-auto`**. A margem negativa deixa a área de toque com 40px de altura, mas a linha cresce só ~9px, sem encostar no filete. Por causa do `-mr-2`, o texto fica alinhado à margem direita e a área de toque avança 8px no gutter (que tem no mínimo 16px).
- Tipografia `.label` (`font-mono`, `--text-label`, maiúsculas, `tracking .08em`), `bg-transparent border-0 rounded-none cursor-pointer`.
- Conteúdo: `[losango] Tema: <valor>`. "Tema:" fica em `--color-ink-muted`, e o valor em `--color-ink` com peso 600.
- **Losango** (`aria-hidden`, decorativo, ecoa o ◇ do selo e o ◆ do rodapé): `size-[.62em] rotate-45 border-(length:--rule-width) border-current` em `--color-ink`. Sem preenchimento no claro (◇), cheio no escuro (◆) e com a metade esquerda cheia no sistema (`background: linear-gradient(to top right, currentColor 50%, transparent 50%)`). Raio 0, como todo o resto.
- Hover: o texto, o valor e o losango vão para `--color-accent`, e o valor ganha um sublinhado de 1px (`underline-offset .2em`). Não há transição, então não há nada a desligar no `prefers-reduced-motion`.
- **Foco:** o global (`--focus-width`, `--color-focus`) com **`outline-offset: 0`**, como na nav. Com o offset de 3px, o contorno sairia pelo topo da página.
- Sem JS: `html:not([data-js]) .tema { display: none }` (em Tailwind, um variant arbitrário como `[html:not([data-js])_&]:hidden`). Nesse caso a linha fica como hoje.

### Texto visível sem trocar na hidratação (recomendação)

O servidor não sabe o tema guardado. Se o texto vier do estado do React, a página abre com "Tema: sistema" e troca para "escuro" na hidratação. No mockup, o **texto e o losango saem do atributo do `<html>`**, que o script inline já aplicou antes do paint:

```html
<span class="tema__valor">            <!-- inline-grid; os três na mesma célula (grid-area 1/1) -->
  <span data-rotulo="sistema">sistema</span><span data-rotulo="light">claro</span><span data-rotulo="dark">escuro</span>
</span>
```
`[data-rotulo]{visibility:hidden}` e `html:not([data-theme]) [data-rotulo=sistema]`, `html[data-theme=light] [data-rotulo=light]` e `html[data-theme=dark] [data-rotulo=dark]` ficam `visible`. Com os três empilhados, o botão tem sempre a largura de "sistema" (128px) e não empurra o slogan a cada clique. Como `visibility: hidden` também esconde o texto dos leitores de tela, o `innerText` e a árvore de acessibilidade só mostram o rótulo atual.

O **`aria-label`** continua vindo do React ("Tema: sistema. Mudar para claro"). Ele começa pelo texto visível, como pede o WCAG 2.5.3 (rótulo no nome). Antes da hidratação ele pode estar defasado, mas é invisível e o botão ainda não funciona nesse momento.

## 4. Contraste (valores de tokens.md §2)

| Par | Claro | Escuro | Mínimo |
|---|---|---|---|
| Valor do tema (`--color-ink` / `--color-bg`) | 15,29 | 15,70 | 4,5 |
| "Tema:" e slogan (`--color-ink-muted` / `--color-bg`) | 5,85 | 7,82 | 4,5 |
| Hover (`--color-accent` / `--color-bg`) | 7,26 | 8,60 | 4,5 |
| Losango (`--color-ink` / `--color-bg`, gráfico) | 15,29 | 15,70 | 3 |
| Contorno de foco (`--color-focus` / `--color-bg`, UI) | 7,26 | 8,60 | 3 |

O botão não tem borda. O que o identifica como controle é o texto, e todo o texto passa de 4,5:1.

## 5. Conferido no mockup (Playwright, `test-results/design/07-modo-escuro/`, script `shots.mjs`)

- 320, 375 e 1280px, com o sistema claro e com o escuro, nos três estados: `scrollWidth` igual à viewport, botão com 128×40px, e o `aria-label` e o texto certos em cada passo.
- Ordem de Tab em 320px: Pular > tema > ZonaMista > campo > Buscar > 7 editorias. Enter ×3: light → dark → sem atributo.
- Sem JS (`javaScriptEnabled: false`): o botão não fica visível.
- 320px com a fonte a 200%: o botão desce de linha, sem sobreposição e sem rolagem.
