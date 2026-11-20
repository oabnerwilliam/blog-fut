# 11: Migrar o estilo de CSS Modules para Tailwind CSS v4

**Status:** pronta para desenvolvimento
**Branch:** refactor/11-tailwind
**Tipo:** refatoração visual. **O visual não pode mudar.** Não passa pelo designer.
**Escrita por:** orquestrador, a pedido do usuário (2026-11-20)

## História
Como squad-blog, quero estilizar as telas com Tailwind CSS v4 em vez de CSS Modules, para criar as próximas telas (capa, editorias, tags, busca) mais rápido. Os tokens continuam sendo a fonte única de cor e tipografia.

## Decisões do usuário (2026-11-20)
- **Tailwind v4 + `@theme` + uma camada mínima.** Os tokens continuam em `src/styles/tokens.css`, e o `@theme` os expõe como utilitários (`bg-bg`, `text-ink`, `font-display`, `text-h1`…). O que não cabe bem em classe fica num `@layer components` pequeno: o contador da nav numerada, a prosa do corpo da matéria e os seletores de tema.
- **Regressão visual por screenshots de referência.** As referências são geradas **antes** da troca e comparadas no fim.

## Critérios de aceite

### A. Referência visual (primeiro passo, ANTES de mexer no estilo)
1. Existe `tests/e2e/visual.spec.ts`, que usa `expect(page).toHaveScreenshot()` em página inteira nos seguintes casos:
   - **Páginas:** capa `/`, uma matéria fictícia (`/materias/como-o-atletico-ventania-defende-com-a-bola`) e a 404 (`/materias/nao-existe`).
   - **Larguras:** 320px e 1280px.
   - **Temas:** `colorScheme` light e dark.
   - Mais um caso com **foco visível** num link da nav, para conferir o contorno.

   Animações e o cursor ficam desligados (`animations: "disabled"`, `caret: "hide"`). A tolerância é pequena e fica explícita no código, com `maxDiffPixelRatio` de no máximo 0,01.
2. As imagens de referência são geradas com `--update-snapshots` sobre o código **ainda em CSS Modules** e entregues numa etapa de commit própria (a primeira), antes de qualquer mudança de estilo.

### B. Tailwind
3. Instalar `tailwindcss` e `@tailwindcss/postcss` com versão exata (a v4 estável mais recente; confira com `pnpm view`). Criar o `postcss.config.mjs` conforme a documentação do Next 16 (`node_modules/next/dist/docs/`) e a do Tailwind v4. Se o pnpm pedir, liberar o script de instalação do `@tailwindcss/oxide` (ou do que for necessário), como na história 10.
4. **Tokens como fonte única.**
   - `src/styles/tokens.css` continua sendo o **único** arquivo com cor literal.
   - O tema do Tailwind expõe os tokens como utilitários e **desliga as paletas e as fontes padrão** (`--color-*: initial` e equivalentes). Assim, `bg-red-500` ou `font-sans` padrão não geram CSS.
   - O tema escuro continua igual: `prefers-color-scheme` mais `[data-theme="dark"]`/`[data-theme="light"]`, como hoje.
5. **Nenhum arquivo `*.module.css`** fica em `src/`. Componentes e páginas usam classes utilitárias no JSX. O que sobra de CSS próprio fica em `src/app/globals.css`, ou num arquivo importado por ele, dentro de `@layer base` ou `@layer components`, e só usa `var(--…)`.
6. **Proibido usar cor arbitrária nas classes.** O teste `tests/unit/cores-literais.test.ts` é estendido e falha se algum `.tsx` ou `.ts` de `src/` tiver um valor arbitrário de cor numa classe:
   - hex: `bg-[#…]`, `text-[#…]`, `border-[#…]`…;
   - `rgb(`/`hsl(`/`oklch(` dentro de `[...]`;
   - um nome de cor padrão do Tailwind, como `-red-500` ou `-slate-`.

   Continua valendo que nenhum CSS fora de `tokens.css` tem cor literal.
7. O Prettier ordena as classes. Isso é opcional: se for usado o `prettier-plugin-tailwindcss`, a versão é exata e o `pnpm lint` continua limpo.

### C. Sem regressão
8. `pnpm test:e2e` passa, incluindo o `visual.spec.ts` **contra as referências do passo A sem atualizá-las**. Toda diferença acima da tolerância é corrigida no código, e não regenerando a referência. Se uma diferença mínima e inevitável de renderização exigir aumentar a tolerância de um caso, isso é justificado no comentário do teste e no relatório.
9. Todos os testes existentes continuam passando sem que as asserções fiquem mais fracas:
   - axe;
   - 320px sem rolagem horizontal;
   - foco e teclado;
   - contraste;
   - fontes;
   - os da matéria.

   Seletores que dependiam de nomes de classe do CSS Modules podem ser trocados por papéis, rótulos ou `data-*`.
10. **ADR 0007** (`docs/adr/0007-tailwind-v4.md`) **substitui** o ADR 0001. Ele registra:
    - o motivo (pedido do usuário: velocidade nas telas novas);
    - como os tokens são expostos;
    - o que fica no `@layer components`;
    - a regra de cor arbitrária e como ela é verificada.

    O ADR 0001 passa a ter o status "substituído pelo ADR 0007". As notas de estilo do `.claude/agents/dev.md` e do `.claude/agents/designer.md` que citam CSS Modules são atualizadas, **só nessas linhas**.
11. Os cinco portões passam: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e` e `pnpm build`.

## Notas técnicas
- **Ordem de trabalho:**
  1. Criar o `visual.spec.ts` e gerar as referências com o CSS atual.
  2. Instalar e configurar o Tailwind.
  3. Migrar componente por componente: layout (SkipLink, SiteHeader, EditoriasNav, SiteFooter), capa provisória, 404, matéria (cabeçalho, selo, aviso, tags, página) e, por último, a prosa.
  4. Apagar cada `.module.css` logo depois de migrar o componente.
- Os nomes dos tokens já seguem os namespaces do Tailwind v4 (`--color-*`, `--text-*`, `--font-*`, `--space-*`). Antes de configurar, leia a documentação do Tailwind v4 sobre `@theme`, `@theme inline` e a referência a variáveis que mudam por tema, e evite referência circular (`--color-bg: var(--color-bg)`). A estratégia escolhida fica explicada no ADR 0007.
- Classes globais que hoje existem (`.wrap`, `.sr-only`, `.label`, `.mono`): use o utilitário nativo quando houver (`sr-only`). Os outros podem virar `@utility` ou ficar no `@layer components`.
- As imagens de referência têm o sufixo da plataforma (`-win32`). Isso é aceitável, porque ainda não existe CI.
- Fora do escopo: qualquer mudança visual intencional e telas novas.
