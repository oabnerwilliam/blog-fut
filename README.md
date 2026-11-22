# Blog Fut

Portal de matérias de futebol. Os textos vêm do **squad-fut**, uma redação de agentes do Claude que pauta, apura, escreve, checa, edita e revisa cada matéria. O site é construído e mantido pelo **squad-blog**, um time de agentes de desenvolvimento descrito em [`CLAUDE.md`](CLAUDE.md): PO, designer, arquiteto, dev, QA, code reviewer, homologador e versionador.

> Fase atual: **local, com conteúdo em arquivos** (`content/materias/*.md`). Toda leitura de dados passa por uma interface de repositório, o que deixa o projeto pronto para migrar para o Supabase e ir para o ar.

## Rodando

Requer Node 22+.

```bash
pnpm install
pnpm exec playwright install chromium   # só na primeira vez, para os testes e2e
pnpm dev                                # http://localhost:3000
```

## Portões de qualidade

```bash
pnpm lint          # ESLint
pnpm typecheck     # next typegen + tsc
pnpm test          # Vitest (unidade/integração)
pnpm test:e2e      # Playwright (sobe build + start na porta 3100)
pnpm build         # build de produção
pnpm test:db       # Supabase local no Docker: sobe, reseta e roda tests/db (docs/operacao/supabase-local.md)
```

## Variáveis de ambiente

Nenhuma é obrigatória com `files`. Um valor fora da lista é erro, nunca cai no padrão em silêncio.

| Variável           | Valores aceitos       | Padrão                  | O que faz                                                                                                                                                                                                                                       |
| ------------------ | --------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CONTENT_SOURCE`   | `files` ou `supabase` | `files`                 | Fonte das matérias. `files` lê `content/materias/*.md` e `content/tags.json`. `supabase` lê do banco com a chave anon e exige `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` (ADR 0008). Outro valor (`FILES`, vazio) lança erro. |
| `MOSTRAR_EXEMPLOS` | `true` ou `false`     | `true`                  | Com `false`, as matérias fictícias (`ficticio: true`) somem de todas as listas, buscas e taxonomias. **Vale no build**: as páginas são estáticas, então mudar o valor exige um build novo.                                                      |
| `SITE_URL`         | URL http(s) absoluta  | `http://localhost:3000` | URL pública do portal. Vira o `metadataBase` (canonical e Open Graph) e a base das URLs do JSON-LD. Um valor que não seja URL http(s) absoluta faz o build falhar com `SITE_URL inválido`. **Vale no build.**                                   |

Não commite arquivos `.env*` (o repositório é público).

## Documentação

- Design: [`docs/superpowers/specs/2026-11-19-blog-fut-design.md`](docs/superpowers/specs/2026-11-19-blog-fut-design.md)
- Plano da v1: [`docs/superpowers/plans/2026-11-19-blog-fut-v1.md`](docs/superpowers/plans/2026-11-19-blog-fut-v1.md)
- Histórias: [`docs/backlog/`](docs/backlog/) · Design: [`docs/design/`](docs/design/) · Decisões: [`docs/adr/`](docs/adr/)

## Fluxo de conteúdo

1. O squad-fut produz a matéria e o diagramador grava `content/entrada/<slug>.md` (fora do git).
2. O versionador do squad-blog roda `pnpm materia:enviar <slug>`. A matéria vai para o Supabase como **rascunho**, com o texto original como revisão 1, e o arquivo é movido para `content/entrada/enviadas/`.
3. Quando o usuário pedir, `pnpm materia:publicar <slug>` põe a matéria no ar. O banco avisa o site, que atualiza em segundos. O passo a passo está em [`docs/operacao/materias.md`](docs/operacao/materias.md).
