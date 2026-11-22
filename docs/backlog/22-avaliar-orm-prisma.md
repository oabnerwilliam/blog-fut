# 22: Avaliar a camada de dados e a migração para o Prisma

**Status:** registrada
**Branch sugerida:** docs/22-avaliar-orm-prisma
**Tipo:** análise (spike). A entrega é um relatório e um ADR com recomendação. Nenhuma migração de produção acontece nesta história.
**Registrada em:** 2026-11-22, a partir da descrição do usuário no gerenciador pessoal dele.

## Pedido do usuário

> Analisar como o Claude fez a definição e migração de dados e se vale a pena migrar para o Prisma ORM.

## Como é hoje (main em `652f26a`)

- **Definição:** 6 migrações SQL escritas à mão em `supabase/migrations/`, aplicadas pelo CLI do Supabase (`supabase db reset` local e `migracoes.yml` com `db push` na `main`). Elas somam 17 funções (várias RPCs `security definer` com `search_path = ''`), 12 políticas de RLS, 5 triggers, `pg_net` e Vault para o webhook de cache.
- **Acesso:** `@supabase/supabase-js` (PostgREST) em 11 arquivos, com 7 RPCs (`criar_materia`, `salvar_revisao`, `publicar_revisao`, `enviar_materia_do_squad`, `buscar_artigos`, `eh_admin`, `configurar_revalidacao`).
- **Segurança:** o site e o painel acessam o banco com a chave anon e o **JWT de quem está logado**, então o RLS vale em toda leitura e gravação (ADR 0009, as duas camadas). Só os scripts usam a `service_role`.
- **Tipos:** não há tipos gerados do banco. As linhas são convertidas à mão (`as LinhaDaLista[]` e afins), validadas por zod em alguns pontos.
- **Testes:** `pnpm test:db` roda contra o Supabase local (RLS, RPCs, paridade SQL × JS e webhook).

## Critérios de aceite

1. **Raio-x da camada atual:** um relatório em `docs/analises/22-camada-de-dados.md` descreve o modelo (tabelas, relações, revisões só de inserção), as migrações, o acesso e a segurança. Ele lista os pontos fortes e os fracos com exemplos de arquivo e linha, entre eles a falta de tipos gerados, as conversões manuais, a lógica dividida entre SQL e TypeScript e a facilidade de testar.
2. **O que o Prisma mudaria, ponto a ponto:**
   - **RLS:** o Prisma conecta direto ao Postgres com um usuário de banco, sem o JWT, e passa por fora do RLS. Avaliar as saídas (`set_config('request.jwt.claims', …)` por transação, extensões do Prisma Client, um usuário sem `bypassrls`) e o que acontece com o ADR 0009.
   - **Migrações:** o `schema.prisma` não modela funções, triggers, políticas, `pg_net` nem Vault. Avaliar a convivência do Prisma Migrate com SQL bruto e com as 6 migrações existentes (baseline).
   - **Conexão em serverless:** pooling na Vercel (Supavisor, `directUrl`, driver adapters), cold start e o tamanho do bundle.
   - **Cache:** como fica o `"use cache"` com etiquetas e o webhook de invalidação.
   - **Testes:** o que muda no `test:db` e no CI.
3. **Alternativas comparadas:** numa tabela com critérios e notas, comparar (a) manter o `supabase-js` e gerar tipos com `supabase gen types`, (b) Prisma, (c) Drizzle e (d) Kysely ou SQL tipado, cada uma com custo de migração, segurança, tipos, DX e encaixe com a história 23.
4. **Encaixe com a história 23:** com um backend Nest separado (história 23), quem fala com o banco passa a ser a API e não o navegador. Avaliar como isso muda a balança: RLS como última camada × autorização na API.
5. **Prova de conceito descartável:** numa branch que não vai para a `main`, a leitura de uma tela (por exemplo, a lista do painel) com a opção recomendada, contra o Supabase local, mostrando os tipos, a query e como a segurança fica. O código não é mergeado. O relatório só cita a branch e o resultado.
6. **Recomendação e ADR 0011:** migrar, não migrar ou migrar só junto com a 23, com o custo estimado em histórias e os riscos. Se a recomendação for mudar, o ADR traz um plano em etapas, que vira histórias novas no backlog.
7. **Para quem está aprendendo:** o relatório explica os conceitos (ORM, query builder, RLS, pooling, migração baseline) em linguagem simples, com um exemplo lado a lado do mesmo acesso nas opções comparadas.

## Fora do escopo

- Qualquer mudança no banco de produção ou no código da `main`.
- A migração em si, que, se aprovada, vira histórias próprias a partir do ADR 0011.
