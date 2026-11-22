# 21: Navegação e requisições do painel (Suspense, loading e route handlers)

**Status:** registrada
**Branch sugerida:** feat/21-navegacao-e-requisicoes
**Tipo:** desempenho e usabilidade do painel do admin. Esqueletos de carregamento são UI nova, então o designer entra.
**Registrada em:** 2026-11-22, a partir da descrição do usuário no gerenciador pessoal dele.

## Pedido do usuário

> Atualmente, a aplicação ruim de requests e promises em Server Components está causando lentidão extrema na navegação e interação na plataforma.
>
> Precisamos passar algumas requests para Route Handlers, a fim de organizar melhor elas.
>
> Precisamos também saber posicionar melhor as requests na árvore de componentes, usando Suspense para carregamento, aprimorando a usabilidade.

## Diagnóstico (main em `652f26a`)

- **Nenhum `loading.tsx` no projeto.** Pela doc do Next 16 (`01-getting-started/04-linking-and-navigating.md`), uma rota dinâmica sem `loading.tsx` não é pré-carregada, e a pessoa espera a resposta inteira do servidor sem nenhum retorno na tela. Todas as rotas do painel são dinâmicas (cookies e sessão).
- **Tudo esperado no topo.** As páginas de `src/app/admin/(painel)/` fazem `await` da sessão e depois dos dados, em sequência, antes de desenhar qualquer coisa. O único `<Suspense>` do painel fica no layout e cobre a tela inteira.
- **Server Component chamando server action.** A `/admin/materias` chama `listarMateriasDoPainel` (uma action de `materias.ts`) e, por isso, repete o `exigirAdmin()` e as chamadas de rede dele dentro da renderização.
- **Leituras em sequência que poderiam ser paralelas**, por exemplo `criarClienteDoServidor` seguido das leituras na edição e no histórico. Cada caso precisa ser conferido.
- **A prévia do editor é uma server action.** As actions rodam em fila no Next 16 ("Sequential dispatch"), então uma prévia lenta atrasa o "Criar rascunho" e o "Salvar".
- A distância até o banco já foi corrigida na história 20 (função em `gru1`). Por isso a história começa medindo.

## Decisões do usuário (2026-11-22)

- **Route handlers só onde o cliente busca.** Server Components continuam lendo direto pela camada de dados. A doc do Next desaconselha chamar route handlers de Server Components, porque isso acrescenta uma requisição (`02-guides/production-checklist.md`, "Route Handlers"). Os route handlers entram para leituras feitas por Client Components.
- **Escopo: o painel do admin primeiro.** O site público é quase todo estático e em cache. Ele só entra se a medição apontar problema, e aí vira outra história.

## Critérios de aceite

1. **Medição antes:** em produção, nas telas `/admin/materias`, `/admin/materias/[id]`, `/admin/materias/[id]/historico`, `/admin/materias/nova` e `/admin/acessos`, medir o tempo até o primeiro retorno visual e o tempo até o conteúdo completo, numa navegação por clique e num carregamento direto. Registrar numa tabela no PR.
2. **Carregamento imediato na navegação:** cada rota do painel tem `loading.tsx` ou um `<Suspense>` com esqueleto. Ao clicar num link do painel, o esqueleto aparece sem esperar o servidor, porque o pré-carregamento parcial passa a valer. Antes, consultar `loading.md`, `linking-and-navigating.md` e a doc de Cache Components, e citar a seção usada.
3. **Shell fora do Suspense:** o que não depende de dados (o `h1`, o chapéu, a linha fina, a navegação, os botões fixos) sai na hora. Os dados ficam em componentes `async` dentro de `<Suspense>`, perto de onde são usados. Há um único `h1` por página também durante o carregamento, e a região que carrega é anunciada (`aria-busy` ou o padrão que o designer definir).
4. **Server Components não chamam server actions:** a `/admin/materias` e qualquer outra página leem pela camada de dados (`src/lib/admin/painel.ts` e afins). Um teste ou regra de lint impede uma página do painel de importar de um arquivo `"use server"`, a não ser para passar a action a um formulário ou botão.
5. **Leituras independentes em paralelo:** com `Promise.all` ou com componentes irmãos em `<Suspense>`. A lista do que foi paralelizado fica no PR.
6. **Prévia por route handler:** a prévia do editor deixa de ser server action e passa a ser um route handler (por exemplo, `POST /api/admin/previa`), chamado pelo cliente com `fetch` e `AbortController`, que cancela a prévia anterior a cada nova digitação. Ele confere só o token (decisão da T04), devolve o mesmo HTML sanitizado do `renderMarkdown` (ADR 0004), responde 401 sem sessão e 404 com o admin desligado. Os testes de XSS e de corrida (`tests/e2e-db/editor-riscos.spec.ts`) continuam valendo para o caminho novo.
7. **Esqueletos na identidade:** o designer faz os esqueletos das cinco telas, nos temas claro e escuro, a 320px, 375px e no desktop, sem tokens novos se der. Sem rolagem horizontal e com o axe limpo.
8. **Medição depois:** a mesma tabela do critério 1, depois da mudança, no PR.
9. **ADR 0010:** registrar onde ficam as leituras: Server Components pela camada de dados, Client Components por route handlers e mutações por server actions, com o porquê e os links para a doc.
10. **Sem regressão:** o build sem as variáveis do Supabase continua verde (o `connection()` continua antes da leitura da config), a regra do ADR 0009 (toda página confere a sessão) continua valendo, as referências visuais da v1 não mudam, e os cinco portões e o `pnpm test:db` passam.

## Fora do escopo

- O site público: busca, listagens e matérias. Só entra se a medição do critério 1, repetida no site, apontar problema, e aí vira história própria.
- A centralização da conferência de admin (`acaoDoAdmin`, `getClaims`, o `eh_admin` repetido), que é a tarefa **T04**. As duas mexem em `src/lib/admin/` e `src/lib/auth/`: a sugestão é fazer a T04 antes, para a 21 já usar o ponto de entrada único no route handler da prévia.
- Uma API REST completa para um front separado, que é assunto da história 23 (migração para React/Vite + Nest).
