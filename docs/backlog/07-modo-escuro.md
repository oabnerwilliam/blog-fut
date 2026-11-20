# 07: Modo escuro (botão de tema)

**Status:** pronta para desenvolvimento
**Branch:** feat/07-modo-escuro
**Tipo:** UI nova pequena. Mockup e especificação em `docs/design/07-modo-escuro/` (`tema.html` e `notas.md`): o botão fica na linha de cima, à direita do slogan, e a ordem de Tab é pular → tema → nome → campo → Buscar → editorias. Os tokens dos dois temas já existem (`src/styles/tokens.css`, história 1).
**Escrita por:** orquestrador, a partir do plano da v1 (história 7), do "Foco de revisão" 5 e da spec. O usuário pediu desenvolvimento autônomo em 2026-11-20, então as decisões abaixo foram tomadas pelo orquestrador.

## História
Como leitor, quero escolher entre o tema claro, o escuro ou o do sistema. Quero que a escolha valha em todas as páginas e que a página nunca pisque no tema errado ao abrir.

## Decisões do orquestrador (2026-11-20)
- **Um botão só**, que alterna em ciclo: sistema → claro → escuro → sistema. O texto visível mostra o tema atual ("Tema: sistema", "Tema: claro" ou "Tema: escuro", conforme o mockup). O `aria-label` diz o atual e o próximo, por exemplo "Tema: sistema. Mudar para claro".
- **Persistência:** a chave `localStorage["tema"]` guarda `"light"` ou `"dark"`. "Sistema" apaga a chave. Toda leitura e escrita fica em `try/catch`. Sem storage, o botão continua funcionando na página atual.
- **Sem piscar:** um script inline e síncrono no `<head>` lê a chave e aplica `data-theme` no `<html>` antes do primeiro paint. Sem chave, não põe atributo nenhum, e o CSS já segue o sistema.
- **Sem JavaScript:** o tema segue o sistema e o botão não aparece. O script inline põe `data-js` no `<html>`, e o CSS só mostra o botão com esse atributo.
- O `<html>` recebe `suppressHydrationWarning`, porque o atributo muda antes do React hidratar.

## Critérios de aceite

### A. Regras (funções puras com teste de unidade)
1. `src/lib/tema.ts` exporta:
   - o tipo `Tema = "sistema" | "light" | "dark"`;
   - `proximoTema(atual)`, que segue o ciclo sistema → light → dark → sistema;
   - `lerTemaGuardado(storage)`, que devolve `"sistema"` para valor ausente, inválido ou storage que lança;
   - `guardarTema(storage, tema)`, que apaga a chave para `"sistema"` e engole erro do storage;
   - `rotuloDoTema(tema)` → "sistema", "claro" ou "escuro".

   O teste cobre o ciclo, um valor inválido ("azul") e um storage que lança em `getItem` e em `setItem`.
2. `SCRIPT_DO_TEMA`, no mesmo arquivo, é a string do script inline. Ela é curta, não tem dependência e faz o mesmo que `lerTemaGuardado` (o teste executa a string com um `document` e um `localStorage` falsos, incluindo o caso em que o `localStorage` lança) e põe `data-js`.

### B. Layout e botão
3. `src/app/layout.tsx` põe o script no `<head>` antes de qualquer CSS que pinte, conforme a doc do Next 16 (consulte `node_modules/next/dist/docs/` sobre `<script>` inline no root layout e `next/script` com `beforeInteractive`; escolha o que garante a execução antes do paint e justifique num comentário curto). Não aparece aviso de hidratação no console.
4. `src/components/layout/BotaoDeTema.tsx` (`"use client"`) fica no cabeçalho, onde o mockup indicar. É um `<button type="button">` com texto visível e `aria-label` (decisão acima), foco visível com o token de foco, área de toque ≥ `--tap-min` e contraste AA nos dois temas. Clicar aplica o próximo tema na hora (atributo `data-theme` ou nenhum, para sistema) e guarda. **O texto visível e o losango não vêm do estado do React.** Eles saem do `data-theme` do `<html>` por CSS: são três rótulos empilhados e só o atual fica visível (mockup). Assim não há troca de texto na hidratação. O `aria-label` vem do React e começa pelo texto visível (WCAG 2.5.3). Antes de hidratar, ele é lido do `<html>` no primeiro efeito.
5. Escolher "sistema" remove o `data-theme` e volta a seguir o `prefers-color-scheme`.
6. O botão não aparece sem JavaScript (`data-js` ausente). O cabeçalho continua sem rolagem horizontal em 320px.

### C. Testes e portões
7. `tests/e2e/tema.spec.ts` ganha:
   - **sem piscar:** com `colorScheme: "light"` e `localStorage.tema = "dark"` (via `addInitScript`), o `data-theme` já é `"dark"` no `DOMContentLoaded`, antes da hidratação. Registre o valor com um `addInitScript` que observa o `<html>` (MutationObserver ou leitura no primeiro `requestAnimationFrame`) e confira que nunca houve frame claro. O mesmo vale ao contrário, com sistema escuro e escolha clara;
   - **ciclo pelo teclado:** Tab até o botão, Enter três vezes, conferindo o `data-theme` e o `aria-label` em cada passo;
   - **persistência:** escolher "escuro" na capa, navegar para uma matéria e para uma editoria e conferir que continua escuro; recarregar também;
   - **storage bloqueado:** com `localStorage` lançando (via `addInitScript`), a página abre sem erro no console e o botão ainda alterna;
   - **sem JS:** com `javaScriptEnabled: false`, o botão não fica visível.
8. `teclado.spec.ts` inclui o botão na ordem de Tab, onde o mockup o colocar. As referências do `visual.spec.ts` que mostram o cabeçalho são regeneradas de propósito, conferindo que só o cabeçalho mudou. Axe sem violações no claro e no escuro com o botão. Os cinco portões passam.

## Notas técnicas
- `definirTema` em `tests/e2e/helpers.ts` continua valendo para os testes que forçam o tema.
- Fora do escopo: sincronizar entre abas (evento `storage`) e o tema da faixa noturna (ela não muda).
