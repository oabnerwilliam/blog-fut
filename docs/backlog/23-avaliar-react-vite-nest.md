# 23: Avaliar a migração de Next para React/Vite + Nest em monorepo

**Status:** registrada
**Branch sugerida:** docs/23-avaliar-react-vite-nest
**Tipo:** análise e plano. A entrega é um relatório, uma prova de conceito descartável e um ADR com a decisão e o plano em etapas. A migração em si, se aprovada, vira várias histórias.
**Registrada em:** 2026-11-22, a partir da descrição do usuário no gerenciador pessoal dele.

## Pedido do usuário

> O Next.js é muito bom por muitos motivos, como o controle de SSR, Route Handlers, Router integrado, etc. Porém, também existem muitos contras nele.
>
> O fato de o back e o front serem "unificados" gera algumas confusões de responsabilidade, e um back-end separado pode ser melhor visualizado e mais eficiente e compreensível.
>
> Por exemplo: Imaginemos um front React/Vite, que faz requisições para back-end com React Query. O back-end, por sua vez, recebe as requests, processa tudo com Prisma ORM interpretando os dados do banco Supabase, e retorna o resultado.
> Prós: Separação de responsabilidades, compreensão e legibilidade de código
> Contras: o back-end tem que ser hospedado separadamente, o fluxo é mais longo.
>
> Além disso tudo, o Next trava a hospedagem do sistema na Vercel, sendo que, dependendo da ocasião, a utilização do Cloudflare Pages pode ser melhor, mais bem integrado, e mais barato (open source de verdade), além de expor todas as rotas de back.

## Decisões do usuário (2026-11-22)

- **Formato:** análise e plano primeiro, como a 22. A migração só começa depois do ADR aprovado.
- **SEO do site público:** a análise decide a forma, comparando as opções do critério 3.
- **A 22 e a 23 andam juntas:** Prisma e Nest se decidem em conjunto. A sugestão é fazer a 22 primeiro, ou as duas na mesma rodada de análise.

## Pontos levantados no registro (a conferir na análise)

- **SEO e prévia de link:** hoje a capa e as matérias saem prontas do servidor, com metadados, JSON-LD, sitemap e 404 real. Um SPA Vite puro renderiza no navegador. O WhatsApp e parte dos robôs não executam JS, então não veriam título nem imagem (T02).
- **Hospedagem:** o Next também roda fora da Vercel (servidor Node próprio) e na Cloudflare pelo OpenNext (`@opennextjs/cloudflare`, nos Workers). Conferir o estado atual: a Cloudflare tem orientado projetos novos para Workers em vez de Pages.
- **Nest na borda:** o Nest espera um servidor Node de longa duração e não roda bem em Workers. O Prisma em Workers exige driver adapter. É provável que a API precise de outra hospedagem.
- **Login entre origens:** com o front e a API em domínios diferentes, a sessão do admin exige CORS, cookies `SameSite` e cuidado com CSRF. Hoje o Next cuida disso nas server actions.
- **Cache e webhook:** hoje o banco avisa `/api/revalidar` e o Next invalida por etiqueta. Num front separado, a CDN e o cache precisam de outra estratégia.
- **Testes:** 1026 testes de unidade, 331 e2e e o `test:db` precisam ser migrados ou refeitos.

## Critérios de aceite

1. **Raio-x das responsabilidades de hoje:** um relatório em `docs/analises/23-arquitetura.md` mapeia o que o Next faz no projeto (rotas estáticas e dinâmicas, Proxy, server actions, route handlers, `"use cache"` com etiquetas, metadados e SEO, login, cron) e mostra onde a mistura de front e back confunde as responsabilidades, com exemplos de arquivo. Esta é a dor central do pedido.
2. **Arquitetura proposta:** um diagrama (Mermaid) do monorepo (por exemplo, pnpm workspaces ou Turborepo, com `apps/web`, `apps/api` e `packages/` com os tipos e o schema compartilhados), mostrando o front com React Query, a API Nest com Prisma (ou o que a 22 recomendar) e o Supabase (banco e Auth), e onde ficam a autorização, a validação e o cache.
3. **Site público sem perder SEO:** uma comparação com critérios de SEO, prévia de link, custo, complexidade e encaixe com React Query. As opções são (a) React Router v7 em modo framework, com SSR, (b) TanStack Start, (c) Astro no site público e SPA Vite no admin, (d) SPA Vite com pré-renderização das matérias e (e) manter o Next só no site público, via OpenNext na Cloudflare ou na Vercel.
4. **Hospedagem e custo:** onde rodam o front, a API, o cron e o webhook, comparando Cloudflare (Workers e Pages), Vercel e um host Node para o Nest (Fly, Render, Railway). A estimativa de custo mensal usa o tráfego de hoje e um tráfego 10 vezes maior, com fontes oficiais de preço e a data da consulta.
5. **Segurança:** como ficam a sessão do Google entre o front e a API, o CSRF, o CORS, a autorização na API e o RLS como última camada (conectar com a 22 e o ADR 0009). Nenhuma rota de back fica exposta sem autorização: "expor as rotas de back" quer dizer uma API documentada (por exemplo, OpenAPI no Nest), não aberta.
6. **Prova de conceito descartável:** numa branch fora da `main`, um monorepo mínimo com uma tela do painel (a lista de matérias) em React/Vite com React Query consumindo um endpoint Nest contra o Supabase local, com login, e uma matéria pública renderizada pela opção do critério 3. O relatório registra o que funcionou, o que travou e quanto tempo levou.
7. **Custo da migração:** quanto do código atual é reaproveitado (os componentes React, o `renderMarkdown`, os schemas zod, as regras de `src/lib/`) e o que é refeito. Também a estratégia de testes e de corte (big bang ou estrangulamento gradual, rota por rota) e a estimativa em histórias.
8. **Recomendação e ADR 0012:** migrar tudo, migrar só o admin e a API, ou não migrar, com prós e contras ligados ao pedido (responsabilidades, legibilidade, hospedagem e custo). Se aprovada, as histórias de migração entram no backlog em etapas pequenas, cada uma entregando algo no ar.
9. **Para quem está aprendendo:** o relatório explica em linguagem simples SSR × SPA, monorepo, React Query, Nest (módulos, controllers, providers), CORS e cookies entre origens, com um exemplo de uma mesma tela nos dois modelos.

## Fora do escopo

- Qualquer mudança na `main`, no deploy ou na produção.
- A escolha de ORM, que é da 22. A 23 usa a recomendação da 22 ou deixa a escolha explícita como dependência.
