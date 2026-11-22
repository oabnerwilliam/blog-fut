# T03: README do repositório

**Status:** registrada
**Branch sugerida:** chore/T03-readme
**Registrada em:** 2026-11-22, a pedido do usuário.

## Problema

O `README.md` (50 linhas) está desatualizado desde a v2: ainda diz "fase atual: local, com conteúdo em arquivos". Ele também não mostra o site, a arquitetura nem o que o projeto tem de interessante (os dois times de agentes, o fluxo da matéria do squad até o ar).

## Critérios de aceite

1. **Abertura:** o que é o Blog Fut em duas ou três frases, o link de produção (`https://blog-fut-tau.vercel.app`) e badges do CI (`portoes.yml`) e da stack (Next.js 16, TypeScript, Supabase, Vercel).
2. **Imagens:** screenshots da capa nos temas claro e escuro, de preferência lado a lado, e de uma matéria no celular, em `docs/readme/`. Elas são geradas por um script ou spec do Playwright, para poderem ser refeitas, e nenhuma mostra dado pessoal (o painel aparece só sem e-mail e sem avatar real, ou fica de fora).
3. **Como funciona:** um diagrama (Mermaid, que o GitHub renderiza) do caminho da matéria: squad-fut → caixa de entrada → `materia:enviar` (rascunho no banco) → painel do admin → publicação → webhook → cache do site.
4. **Os squads:** uma tabela curta com os agentes do squad-blog e o papel de cada um (do `CLAUDE.md`) e um parágrafo sobre o squad-fut.
5. **Para desenvolver:** requisitos, `pnpm install`, `pnpm dev`, as fontes de conteúdo (`CONTENT_SOURCE`), os portões e o `test:db`, com links para `docs/operacao/` em vez de repetir o conteúdo.
6. **Segurança:** nenhum segredo, e-mail ou dado pessoal no README nem nas imagens. O repositório é público.
