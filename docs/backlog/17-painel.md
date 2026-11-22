# 17: painel com histórico

**Status:** pronta para design e desenvolvimento
**Branch:** feat/17-painel
**Tipo:** telas novas no `/admin`, server actions e uma migração.
**Escrita por:** orquestrador, em 2026-11-21, na sessão autônoma da v2.
**Base:** plano `docs/superpowers/plans/2026-11-21-blog-fut-v2.md` (História 17 e risco 5 do Foco de revisão), spec §7.7, U7 e U9, e ADRs 0008 e 0009. A regra do ADR 0009 vale para todas as telas daqui: **toda página do painel confere a sessão de novo**, e toda página do `/admin` chama `exigirAdminLigado()` ou `connection()` antes de ler config ou sessão. O CI e o Preview fazem o build sem as variáveis do Supabase.

## Design (designer, sem aprovação do usuário, O2)
Mockups em `docs/design/17-painel/`, nos temas claro e escuro, em 375 e 1280:
- **Lista de matérias** (`/admin/materias`): filtros por status (rascunho ou publicado), editoria e fonte ("do squad", painel ou importação). Cada linha mostra o título, a editoria, o status, a fonte, a data e um aviso "alterações não publicadas" quando `revisao_em_edicao` é diferente de `revisao_publicada`. Tem estado vazio.
- **Edição** (`/admin/materias/[id]`): os campos editoriais; o slug e o `publicado_em` só para leitura; os botões "Salvar", "Publicar alterações" e "Despublicar"; o aviso de alterações não publicadas; e o link para o histórico.
- **Histórico** (`/admin/materias/[id]/historico`): a lista de revisões (número, origem, autor e data, com as marcas "publicada" e "em edição"), uma revisão aberta, a comparação de duas revisões com diff de linhas do corpo (adições e remoções marcadas com símbolo e cor, nunca só cor) e o botão "Restaurar esta versão".
- A nav do admin ganha "Matérias".

## Critérios de aceite

1. **Migração `<timestamp>_painel.sql`**, não destrutiva:
   - `publicar_revisao` passa a ser executável por `authenticated`, mas começa com `if auth.role() <> 'service_role' and not public.eh_admin() then raise exception ...`, como marca o comentário da história 15. Atualize o caso do `rls-admin.test.ts` que esperava a função fechada: agora só o aprovado publica, e pendente e recusado recebem erro;
   - `public.despublicar_materia(p_article_id uuid)`, com a mesma checagem, muda `status` para `rascunho` e mantém `revisao_publicada`;
   - `public.salvar_revisao(p_article_id uuid, campos jsonb) returns integer`, com a mesma checagem: insere a revisão `max(numero)+1` com `origem_da_revisao = 'painel'` e `autor_id = auth.uid()` e atualiza só `revisao_em_edicao`. Fica numa transação, e um segundo salvamento simultâneo não sobrescreve o número (o `unique` resolve; tente de novo uma vez ou devolva um erro claro);
   - as três são `security definer`, com `search_path = ''`.
2. **Tipos** em `src/lib/admin/tipos.ts`: `Fonte = "squad" | "painel" | "importacao"` e `CamposEditoriais`, derivado do schema zod da v1. Ficam os campos editoriais, **sem** `slug`, `fonte`, `origem` e `publicado_em`. O `publicado_em` sai porque a data editorial não muda depois da primeira publicação (spec §7.1; decisão do orquestrador, a partir da história 15). Tudo é validado no servidor antes de gravar.
3. **`src/lib/admin/materias.ts`** (`server-only`) com as actions:
   - `listarMateriasDoPainel(filtros)`;
   - `salvarRevisao(articleId, campos)`, que não toca nos campos públicos;
   - `publicarAlteracoes(articleId)`, que chama `publicar_revisao` e depois `updateTag` das etiquetas da história 14 (`materias`, `materia:<slug>`), conforme a doc do Next 16;
   - `despublicar(articleId)`, que também invalida;
   - `restaurarRevisao(articleId, numero)`, que cria uma revisão **nova** com o conteúdo da antiga e não apaga nada.
   Cada action confere a sessão e `eh_admin` no servidor (por exemplo, com um helper `exigirAdmin()` em `src/lib/admin`) e devolve `{ ok, erro, mensagem }` em pt-BR.
4. **Telas** conforme o design: lista, edição e histórico. Cada página confere a sessão de novo (ADR 0009). Um id inválido ou inexistente dá `notFound()`. As tags podem ser escolhidas entre as que existem ou digitadas como slug novo (validado pelo `SLUG_REGEX`); o rótulo de uma tag nova sai humanizado pelo repositório, e o painel não grava em `tags`.
5. **Diff de linhas** sem dependência nova: uma função pura `diffDeLinhas(a, b)` (LCS), com teste de unidade. Os casos: iguais, só adição, só remoção, troca no meio, corpo vazio, CRLF.
6. **Regra do squad:** no `CLAUDE.md` do projeto, "Texto do squad é imutável" passa a dizer o que diz a spec §7.7: *a revisão 1 de uma matéria do squad é o texto literal e nunca muda; edições posteriores são revisões novas, registradas com autor*.
7. **Testes de banco** `tests/db/painel.test.ts`, sobre o risco 5:
   - salvar não muda o que o `anon` lê;
   - publicar muda o que o `anon` lê;
   - restaurar cria a revisão N+1 e mantém as N anteriores;
   - `update` e `delete` em `article_revisions` falham até para o admin;
   - a revisão 1 de uma matéria do squad continua com o hash do original depois de 3 edições e 1 restauração;
   - um pendente chamando as actions (e as RPCs direto) não grava nada;
   - despublicar tira a matéria do `anon`.
8. **e2e de banco:**
   - um admin edita o título da matéria do PSG, salva e confere que o site ainda mostra o título antigo; depois publica e confere o título novo na capa e na página em até 5 s;
   - o histórico mostra as revisões, e a comparação marca as linhas trocadas;
   - axe nos temas claro e escuro, sem rolagem horizontal em 320px, em cada tela.
9. **Pendente do PR #16:** cobrir também com `authenticated` (pendente) o teste das RPCs internas, se ainda faltar algum caso.
10. **Portões:** os cinco da v1, mais `pnpm test:db`, o build sem as variáveis do Supabase e o CI do PR. As referências visuais da v1 não mudam.

## Fora do escopo
- Mudar o slug pelo painel.
- Criar matéria nova: história 18.
