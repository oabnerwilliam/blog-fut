# 18: editor de texto (criar matéria no painel)

**Status:** pronta para design e desenvolvimento
**Branch:** feat/18-editor
**Tipo:** uma tela nova no `/admin`, server actions e um ajuste no JSON-LD.
**Escrita por:** orquestrador, em 2026-11-22, na sessão autônoma da v2.
**Base:** plano `docs/superpowers/plans/2026-11-21-blog-fut-v2.md` (História 18), spec §7.7 e O1, ADRs 0004 (markdown sanitizado) e 0009. Toda página do painel chama `exigirAdminLigado()`, confere a sessão de novo e não lê config no prerender. O CI e o Preview fazem o build sem as variáveis do Supabase.

## Design (designer, sem aprovação do usuário, O2)
Mockup em `docs/design/18-editor/nova.html`, nos temas claro e escuro, em 375 e 1280. Reaproveite o formulário da edição da história 17 (`docs/design/17-painel/editar.html`).
- **No desktop**, o `textarea` do corpo e a prévia ficam lado a lado. **No mobile (375)**, ficam em abas "Escrever" e "Prévia" (padrão de abas acessível: `role="tablist"`, setas e `aria-selected`).
- O slug é editável na criação, sugerido a partir do título, com o aviso "o slug não muda depois de criado".
- O autor vem preenchido com o nome de quem está logado.
- O botão é "Criar rascunho". Depois de criar, a pessoa vai para a edição da matéria (história 17), onde publica.
- A lista de matérias e a nav ganham o link "Nova matéria".

## Critérios de aceite

1. **`gerarSlug(titulo)`**, função pura em `src/lib/admin/`: kebab-case, sem acento, sem pontuação, sem hífen repetido nem nas pontas, com no máximo 80 caracteres e sem cortar no meio de um hífen. O resultado passa no `SLUG_REGEX`. O teste de unidade cobre acentos, "ç", espaços repetidos, pontuação, emoji, números, título só com pontuação (resultado vazio vira erro claro na criação) e título longo.
2. **Migração `<timestamp>_criar_materia.sql`**, não destrutiva: `public.criar_materia(campos jsonb) returns uuid`, `security definer`, `search_path = ''`, com a mesma checagem de admin da 17 (`auth.role() is distinct from 'service_role' and not eh_admin()` → 42501). A função:
   - insere em `articles` com `fonte = 'painel'`, `origem = null`, `status = 'rascunho'`, `revisao_em_edicao = 1` e `revisao_publicada = null`;
   - insere a revisão 1 com `origem_da_revisao = 'painel'` e `autor_id = auth.uid()`;
   - recusa slug existente com um `hint` próprio (`slug_ja_existe`) e não grava nada;
   - valida no banco o que a `salvar_revisao` valida.
   O `publicado_em` da criação é a data de hoje no fuso `America/Sao_Paulo`, e a primeira publicação mantém essa data (regra da 15).
3. **`criarMateria(campos)`** em `src/lib/admin/materias.ts`: `exigirAdmin()`, depois zod (os `CamposEditoriais` mais o `slug` validado pelo `SLUG_REGEX`), depois a RPC. Devolve `{ ok: true, id, slug }` ou `{ ok: false, erro, mensagem, errosDosCampos? }`, com a mensagem "Já existe uma matéria com o slug <slug>." para slug duplicado. Não invalida o cache, porque é um rascunho.
4. **`previsualizar(md)`**: server action que exige admin e devolve o HTML do **mesmo** `renderMarkdown` sanitizado do site (ADR 0004). Tem um limite de tamanho, igual ao do `corpo_md` da 17. No cliente, a prévia é atualizada com debounce de 400 ms e só a última resposta vale (uma resposta antiga não sobrescreve uma nova). A prévia é injetada com `dangerouslySetInnerHTML` **só** com o HTML que vem dessa action. Registre isso num comentário que cite o ADR 0004.
5. **Tela `/admin/materias/nova`**, conforme o design: título, linha fina, slug sugerido e editável, editoria da lista fechada, tags (escolher entre as existentes ou digitar um slug novo), título SEO, meta description, palavras-chave, autor (com o nome do Google, editável), ficção (marcada como "fictícia" nunca é o padrão), corpo e prévia. Rótulos visíveis, erros por campo com foco no bloco de erro (o mesmo padrão da 17) e funcionamento só por teclado. Reaproveite os componentes da 17 sempre que der.
6. **JSON-LD:** `Article` e `ArticleSummary` ganham `fonte: "squad" | "painel" | "importacao"`.
   - O `FileArticleRepository` deriva o campo: `squad` quando há `origem`, `importacao` quando não há.
   - O `SupabaseArticleRepository` lê a coluna.
   - A suíte de contrato cobre o campo.
   - O `jsonLdDaMateria` usa `author: { "@type": "Person", name: artigo.autor }` quando a fonte é `painel` e continua com a `Organization` nas outras.
   - Teste de unidade nos dois casos.
7. **Testes de banco:** `criarMateria` com slug duplicado dá erro e nada é gravado; um pendente não cria (nem pela action nem pela RPC direta); `previsualizar` com `<script>`, `onerror` e `javascript:` devolve HTML sem eles; a matéria criada fica como rascunho e não aparece para o `anon`.
8. **e2e de banco:** um admin cria uma matéria pelo editor (a prévia mostra o markdown renderizado), cai na edição, publica, e a matéria aparece na capa e no sitemap (se não for fictícia) com JSON-LD `Person`, em até 5 s. Axe nos temas claro e escuro, 320px sem rolagem horizontal e as abas funcionando por teclado no mobile.
9. **Portões:** os cinco da v1, mais `pnpm test:db`, o build sem as variáveis do Supabase e o CI do PR. As referências visuais da v1 não mudam.

## Fora do escopo
- Upload de imagem e biblioteca de editor (O1).
- Mudar o slug depois de criado.
