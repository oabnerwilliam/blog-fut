# 06: Busca

**Status:** pronta para desenvolvimento
**Branch:** feat/06-busca
**Tipo:** UI nova. Mockup e especificação em `docs/design/06-busca/` (`busca.html` e `notas.md`). O resultado reaproveita as linhas de Últimas (`ListaDeMaterias`).
**Escrita por:** orquestrador, a partir do plano da v1 (história 6), do "Foco de revisão" 1 e 4 e da spec (seção de busca). O usuário pediu desenvolvimento autônomo em 2026-11-20, então as decisões abaixo foram tomadas pelo orquestrador e ficam registradas aqui.

## História
Como leitor, quero buscar uma palavra (com ou sem acento, em maiúsculas ou minúsculas) e ver as matérias que a citam no título, na linha fina, nas tags ou no corpo.

## Decisões do orquestrador (2026-11-20)
- O campo do cabeçalho é um `<form role="search" action="/busca" method="get">` com `<input type="search" name="q">`. Funciona **sem JavaScript**. O cabeçalho continua sem ler `searchParams`, para as outras páginas não ficarem dinâmicas. Por isso o campo do cabeçalho sai sempre vazio.
- A página `/busca` tem o próprio formulário, já preenchido com o termo, logo abaixo do `h1`.
- Sem paginação na busca (o acervo é pequeno). A lista mostra todos os resultados na ordem do `search()` (mais nova primeiro).
- O termo é cortado em 100 caracteres antes de buscar e de exibir.
- `/busca` leva `robots: noindex, follow` e fica fora do sitemap.

## Critérios de aceite

### A. Regras (funções puras com teste de unidade)
1. `src/lib/busca.ts` exporta `lerTermo(valor)`, que recebe o `q` da query (`string | string[] | undefined`). Array → o primeiro item. Sem valor → `""`. O resultado é aparado e cortado em 100 caracteres (`TAMANHO_MAXIMO_DO_TERMO`). O teste cobre: ausente, `""`, `"   "`, array, 150 caracteres e espaços nas pontas.
2. `montarBusca(repositorio, termo)`, no mesmo arquivo, usa só o `ArticleRepository.search()`. Ela devolve `{ estado: "vazia" }` quando o termo não tem nenhum termo útil (vazio ou só espaços), `{ estado: "sem-resultado", termo }` quando a busca não acha nada e `{ estado: "com-resultado", termo, itens }` quando acha. O teste usa o repositório em memória (`tests/unit/helpers/repositorio-em-memoria.ts`).
3. Teste de unidade do "Foco de revisão" 1, contra o `FileRepository` com o conteúdo de exemplo (ou um fixture): `"sao paulo"`, `"SÃO PAULO"` e `"São Paulo"` devolvem a mesma lista. O conteúdo de exemplo não cita São Paulo, então o teste também cobre `"sao ciriaco"`, `"SÃO CIRÍACO"` e `"São Ciríaco"`, que devolvem as mesmas 3 matérias (mockup).

### B. Rota e metadados
4. `src/app/busca/page.tsx` obtém os dados só por `getRepository()` + `montarBusca`. Ler `searchParams` torna a página dinâmica: consulte `node_modules/next/dist/docs/` (Cache Components, `page.md`) e use `<Suspense>` como em `PaginaDeListagem`, sem erro de "dados fora de Suspense" no build. O `h1` "Busca" e o formulário ficam fora do Suspense. O fallback não pode piscar um estado errado (por exemplo, "nenhum resultado" antes do resultado).
5. Metadados (`src/lib/seo.ts`, função nova `metadadosDaBusca(termo)`): `title` "Busca" sem termo e `Busca: <termo>` com termo; `robots: { index: false, follow: true }`; `alternates.canonical` em `/busca`. Teste de unidade.

### C. Página
6. Há **um único `h1`** ("Busca"). O formulário da página tem rótulo visível ("O que você procura?" ou o que o mockup definir), o `input` vem preenchido com o termo e o botão diz "Buscar".
7. **Estado vazio** (`q` ausente, vazio ou só espaços): nenhuma mensagem de erro; um texto curto de sugestão e links para as editorias com matéria (de `listEditorias()`). Responde 200.
8. **Sem resultado**: a mensagem "Nenhuma matéria encontrada para “<termo>”." mais a mesma sugestão do estado vazio. O termo aparece como texto, nunca como HTML: `?q=<script>alert(1)</script>` mostra o texto literal e não executa nada (e2e).
9. **Com resultado**: a contagem ("2 resultados para “<termo>”", "1 resultado para …") numa região `aria-live="polite"` ou num `<p>` logo abaixo do formulário, e a lista com `ListaDeMaterias` (`nivelDoTitulo="h2"`). As fictícias aparecem com o selo "Exemplo".
10. **Campo no cabeçalho**, em todas as páginas, conforme o mockup: rótulo acessível ("Buscar matérias"), foco visível com o token de foco, e nada de rolagem horizontal em 320px. Enviar o formulário com Enter leva a `/busca?q=<termo>`.

### D. Testes e portões
11. Um e2e novo (`tests/e2e/busca.spec.ts`) em **320px e 1280px** confere:
    - digitar no campo do cabeçalho e apertar Enter leva a `/busca?q=…` com resultados;
    - `"sao paulo"`, `"SÃO PAULO"` e `"São Paulo"` (e as três grafias de "São Ciríaco", do critério 3) mostram os mesmos títulos;
    - estado vazio (`/busca`, `/busca?q=%20%20`) e sem resultado (`/busca?q=zzzzqqq`);
    - o critério 8 (texto literal, nenhum `dialog`);
    - um único `h1`, sem rolagem horizontal, axe sem violações no claro e no escuro.
12. O cabeçalho muda em todas as páginas, então as referências do `visual.spec.ts` (capa, matéria, 404, editoria) são **regeneradas** de propósito, e o `teclado.spec.ts` passa a incluir o campo de busca na ordem de Tab, onde o mockup o colocar. O `visual.spec.ts` ganha `/busca?q=<termo>` em 375px e 1280px, claro e escuro. Os cinco portões passam.

## Notas técnicas
- `search()` já normaliza (NFD, sem marcas, minúsculas pt-BR) e faz E lógico entre termos (`src/lib/content/search.ts`). Não recrie nada disso.
- O formulário é server component (HTML puro). Não precisa de `"use client"`.
- Fora do escopo: realce do termo no resultado, sugestões enquanto digita, paginação da busca, botão de tema (história 7).
