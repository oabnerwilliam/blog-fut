# Blog Fut

Portal de matérias de futebol. Os textos vêm do **squad-fut**, uma redação de agentes do Claude que pauta, apura, escreve, checa, edita e revisa cada matéria. O site é construído e mantido pelo **squad-blog**, um time de agentes de desenvolvimento descrito em [`CLAUDE.md`](CLAUDE.md): PO, designer, arquiteto, dev, QA, code reviewer, homologador e versionador.

> Fase atual: **local, com conteúdo em arquivos** (`content/materias/*.md`). Toda leitura de dados passa por uma interface de repositório, o que deixa o projeto pronto para migrar para o Supabase e ir para o ar.

## Rodando

Requer Node 22+.

```bash
npm install
npx playwright install chromium   # só na primeira vez, para os testes e2e
npm run dev                       # http://localhost:3000
```

## Portões de qualidade

```bash
npm run lint        # ESLint
npm run typecheck   # next typegen + tsc
npm test            # Vitest (unidade/integração)
npm run test:e2e    # Playwright (sobe build + start na porta 3100)
npm run build       # build de produção
```

## Variáveis de ambiente

Nenhuma é obrigatória. Um valor fora da lista é erro, nunca cai no padrão em silêncio.

| Variável           | Valores aceitos      | Padrão                  | O que faz                                                                                                                                                                                                     |
| ------------------ | -------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CONTENT_SOURCE`   | `files`              | `files`                 | Fonte das matérias. `files` lê `content/materias/*.md` e `content/tags.json`. Qualquer outro valor (inclusive `supabase`, `FILES` ou vazio) lança erro: o Supabase ainda não existe.                          |
| `MOSTRAR_EXEMPLOS` | `true` ou `false`    | `true`                  | Com `false`, as matérias fictícias (`ficticio: true`) somem de todas as listas, buscas e taxonomias. **Vale no build**: as páginas são estáticas, então mudar o valor exige um build novo.                    |
| `SITE_URL`         | URL http(s) absoluta | `http://localhost:3000` | URL pública do portal. Vira o `metadataBase` (canonical e Open Graph) e a base das URLs do JSON-LD. Um valor que não seja URL http(s) absoluta faz o build falhar com `SITE_URL inválido`. **Vale no build.** |

Não commite arquivos `.env*` (o repositório é público).

## Documentação

- Design: [`docs/superpowers/specs/2026-11-19-blog-fut-design.md`](docs/superpowers/specs/2026-11-19-blog-fut-design.md)
- Plano da v1: [`docs/superpowers/plans/2026-11-19-blog-fut-v1.md`](docs/superpowers/plans/2026-11-19-blog-fut-v1.md)
- Histórias: [`docs/backlog/`](docs/backlog/) · Design: [`docs/design/`](docs/design/) · Decisões: [`docs/adr/`](docs/adr/)

## Fluxo de conteúdo

1. O squad-fut produz a matéria e o diagramador grava `content/entrada/<slug>.md` (fora do git).
2. O versionador do squad-blog publica a matéria por um PR `content/<slug>`, que move o arquivo para `content/materias/`.
3. Depois do code review e da homologação, a matéria entra na `main`.
