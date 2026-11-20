# 10: Trocar npm por pnpm

**Status:** pronta para desenvolvimento
**Branch:** chore/10-pnpm
**Tipo:** infraestrutura, sem UI
**Escrita por:** orquestrador, a pedido do usuário (2026-11-20)

## História
Como squad-blog, quero usar o pnpm como gerenciador de pacotes, com um único lockfile, para ter instalações mais rápidas e dependências mais estritas.

## Critérios de aceite
1. O `package-lock.json` foi removido e existe um `pnpm-lock.yaml`, gerado com `pnpm install` (pnpm 10.33.0).
2. O `package.json` declara `"packageManager": "pnpm@10.33.0"` e mantém as mesmas versões **exatas** das dependências. Nenhuma versão muda.
3. O pnpm 10 bloqueia scripts de instalação por padrão. Os pacotes que precisam deles (por exemplo `sharp`, `unrs-resolver` e `@tailwindcss/oxide`, se houver) são liberados explicitamente:
   - em `pnpm.onlyBuiltDependencies` ou em `pnpm-workspace.yaml`, conforme a documentação do pnpm 10;
   - o `pnpm install` termina sem o aviso de "Ignored build scripts".
4. Se o modo estrito do pnpm revelar alguma dependência fantasma (importada no código, mas não declarada), ela é declarada com versão exata. O código não ganha `shamefully-hoist`.
5. O `playwright.config.ts` usa `pnpm build && pnpm exec next start -p ${PORT}` no `webServer`.
6. Os documentos **vivos** trocam `npm`/`npx` por `pnpm`/`pnpm exec` (ou `pnpm dlx`, quando for o caso):
   - `CLAUDE.md`;
   - `README.md`;
   - `.claude/agents/*.md`.

   O `package-lock.json` citado no agente `dev` vira `pnpm-lock.yaml`. Os registros históricos (`docs/adr/`, `docs/backlog/`, `docs/superpowers/`) **não** são alterados.
7. O `.gitignore` não ignora o `pnpm-lock.yaml`. Se existir um `.npmrc`, ele é revisto.
8. Os cinco portões passam com pnpm:
   - `pnpm lint`;
   - `pnpm typecheck`;
   - `pnpm test`;
   - `pnpm test:e2e`;
   - `pnpm build`.

## Notas técnicas
- Faça a instalação limpa: apague o `node_modules` e rode `pnpm import` (que converte o lock do npm e mantém as versões resolvidas) ou `pnpm install`. Prefira o `pnpm import` para não mudar as versões transitivas.
- Fora do escopo: CI, que ainda não existe, e qualquer atualização de dependência.
