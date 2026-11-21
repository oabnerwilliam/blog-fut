# 15: squad-fut entrega no banco

**Status:** pronta para desenvolvimento
**Branch:** feat/15-squad-no-banco
**Tipo:** scripts, funções SQL e docs dos agentes. Sem UI.
**Escrita por:** orquestrador, em 2026-11-21, na sessão autônoma da v2.
**Base:** plano `docs/superpowers/plans/2026-11-21-blog-fut-v2.md` (História 15), spec §7.5 e U6, ADR 0008. O site já está no ar lendo do Supabase de produção (`docs/operacao/colocar-no-ar.md`).

## Critérios de aceite

1. **Migração `supabase/migrations/<timestamp>_squad_no_banco.sql`** com duas funções, ambas `security definer`, `search_path = ''`, `revoke execute` de `public`, `anon` e `authenticated` e `grant` só para a `service_role`:
   - `public.enviar_materia_do_squad(dados jsonb) returns uuid`: insere em `tags` as que faltam, com o rótulo humanizado que vem do script; insere a matéria em `articles` com `status = 'rascunho'`, `fonte = 'squad'`, `revisao_publicada = null` e `revisao_em_edicao = 1`; e insere a revisão nº 1 (`origem_da_revisao = 'squad'`, corpo literal, `autor_id` nulo). Tudo numa transação só, a da própria função. Slug existente → `raise exception` com um código próprio (por exemplo `errcode = 'P0001'` mais uma mensagem identificável), e nada é gravado;
   - `public.publicar_revisao(p_article_id uuid) returns void`: copia os campos editoriais da revisão `revisao_em_edicao` para `articles`, define `revisao_publicada = revisao_em_edicao` e `status = 'publicado'`. Não altera `publicado_em` se a matéria já foi publicada antes (spec §7.1: a primeira publicação não muda a data editorial). Matéria inexistente → exceção. Na 17, o painel reaproveita esta função, então ela precisa funcionar também quando chamada por um admin: ela é `security definer`, e a 16 vai abrir o `execute` para `authenticated` com um `if not public.eh_admin()` dentro. **Deixe um comentário** marcando esse ponto.
   - Antes de escrever o `publicar_revisao`, confirme na migração da 13 quais campos o snapshot da revisão guarda.
2. **Webhook só para o que é público** (sugestão do PR #17). Uma nova versão de `public.avisar_revalidacao()`, na mesma migração, só avisa quando `old.status = 'publicado'` ou `new.status = 'publicado'` (em `delete`, só o `old`). Gravar um rascunho não invalida o cache. Teste em `tests/db/`: inserir rascunho não chama o `net.http_post`; publicar chama; despublicar chama.
3. **`scripts/materia-enviar.ts` (`pnpm materia:enviar <slug> [--prod] [--sim]`)**:
   - lê `content/entrada/<slug>.md` e valida com o **mesmo** parser e schema da v1 (`parseArticleFile` e `carregarArtigosDoDisco`, via `src/lib/content/disco.ts` ou equivalente). Frontmatter inválido → sai com código 1 e uma mensagem que cita o arquivo, sem gravar nada;
   - matéria real (`ficticio: false`) sem `origem` → erro claro (a constraint do banco também recusa);
   - chama a RPC `enviar_materia_do_squad` com a `service_role` de `carregarAmbiente`;
   - com sucesso, move o arquivo para `content/entrada/enviadas/<slug>.md` (cria a pasta). Só move **depois** de o banco confirmar;
   - slug existente → código 1 e a mensagem exata "Já existe uma matéria com o slug <slug>. Edite pelo painel.", sem mover o arquivo;
   - imprime o destino (local ou "Destino: PRODUÇÃO (<host>)"), o slug, o título e o status `rascunho`.
4. **`scripts/materia-publicar.ts` (`pnpm materia:publicar <slug> [--prod] [--sim]`)**: busca o `id` pelo slug, chama `publicar_revisao` e imprime o resultado. Slug inexistente → código 1 com uma mensagem clara. Já publicada e sem revisão nova → avisa "nada a publicar" e sai com código 0.
5. **Corpo literal:** o hash SHA-256 do `corpo_md` gravado na revisão 1 é igual ao do corpo do arquivo com finais de linha LF, exatamente como o parser da v1 entrega. Teste com um corpo que tenha CRLF, espaços no fim de linha e acentos.
6. **`.gitignore`:** mantém `/content/entrada/*` e o `.gitkeep` e acrescenta explicitamente `/content/entrada/enviadas/`, com um comentário atualizado (o "publicar via PR" deixa de valer).
7. **Testes `tests/db/materia-enviar.test.ts`** (fixtures numa pasta temporária, nunca em `content/entrada/` real):
   - corpo literal (critério 5);
   - slug duplicado: recusa sem gravar nada, nem as tags novas;
   - frontmatter inválido: erro com o nome do arquivo e nada gravado;
   - rascunho fora do site: `anon` não lê a matéria por tabela, por `getBySlug` nem por busca;
   - publicar: depois de `materia:publicar`, `anon` lê a matéria e ela aparece no `SupabaseArticleRepository`;
   - o arquivo só é movido em caso de sucesso.
   - Para chamar os scripts nos testes, exporte funções puras (`enviarMateria(opcoes)` e `publicarMateria(opcoes)`) com o diretório da caixa de entrada injetável. A CLI só faz o parse dos argumentos.
8. **Trava de produção:** os dois comandos usam `carregarAmbiente`. Um teste de unidade confere que sem `--prod` o destino é o local, e que com `--prod`, fora de TTY e sem `--sim`, o comando aborta antes de tocar o banco.
9. **Agentes e docs:**
   - `.claude/agents/versionador.md` é reescrito: roda `pnpm materia:enviar <slug>` (com `--prod --sim` quando o orquestrador pedir a produção), relata o resultado e **só roda `materia:publicar` quando o usuário pedir**. Não cria mais branch `content/` nem abre PR de conteúdo, e deixa de rodar git ou gh de escrita;
   - no `CLAUDE.md` do projeto: a regra "Caixa de entrada", a linha do versionador na tabela do time e a regra "Git e gh de escrita" (o versionador sai dela). A regra "Texto do squad é imutável" fica como está até a 17;
   - squad-fut (fora do git: **edite só com Write/Edit e nunca rode git no squad-fut**): em `D:\ABNER\projetos-claude\squad-fut\CLAUDE.md` e `D:\ABNER\projetos-claude\squad-fut\.claude\agents\diagramador.md`, troque "o versionador abre o PR" por "o versionador envia ao banco como rascunho; publicar é decisão do usuário". Mude só essas frases.
10. **Docs de operação:** `docs/operacao/supabase-local.md` (ou um `docs/operacao/materias.md` novo) explica o fluxo: diagramador → `content/entrada/` → `materia:enviar` → rascunho → `materia:publicar`, com os exemplos local e `--prod --sim`.
11. **Portões:** os cinco da v1, mais `pnpm test:db`. O CI do PR precisa passar.

## Fora do escopo
- Painel e edição: histórias 16 e 17.
- Reenvio de matéria já existente: é decisão do painel.

## Depois do merge (orquestrador)
- O CI aplica a migração na produção. Confira com `gh run list --workflow migracoes.yml`.
- Não há matéria nova na caixa de entrada agora, então nada é enviado à produção.
