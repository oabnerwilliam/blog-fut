import { defineConfig, devices } from "@playwright/test";
import { PORTA_DO_E2E_DB, SEGREDO_DO_E2E_DB } from "./tests/e2e-db/constantes";
import { lerSupabaseLocal } from "./tests/e2e-db/supabase-local";

/**
 * E2e de banco (`pnpm test:e2e:db`, dentro do `pnpm test:db`): o site com
 * `CONTENT_SOURCE=supabase` contra o Supabase local. Cobre o risco 3 do plano v2: uma
 * gravação no banco chega ao site em segundos, pelo webhook (pg_net → /api/revalidar).
 *
 * - Pasta de build própria (`BUILD_DE_TESTE=db` → `.next-testes/db`): o `.next` dos
 *   portões continua sendo o build com `files`.
 * - `TTL_DO_INDICE_MS_TESTE=1000`: o índice do Proxy recarrega a cada 1 s, e não a cada
 *   60 s. **Só aqui.** Nunca configure essa variável na Vercel.
 * - O Postgres roda no Docker e chama o site por `host.docker.internal:<porta>`. No
 *   Linux (CI), o Supabase CLI já cria os containers com
 *   `host.docker.internal:host-gateway` (ver docs/operacao/supabase-local.md).
 * - O teardown devolve o banco ao `content/` real e apaga a configuração do Vault.
 */
const supabase = lerSupabaseLocal();

export default defineConfig({
  testDir: "tests/e2e-db",
  outputDir: "test-results/e2e-db",
  // Um teste por vez: todos gravam no mesmo banco.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [["list"]],
  globalTeardown: "./tests/e2e-db/global-teardown.ts",
  use: {
    baseURL: `http://localhost:${PORTA_DO_E2E_DB}`,
    locale: "pt-BR",
  },
  projects: [{ name: "db", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // O `env` vence o `.env.local` (o Next não sobrescreve o que já existe).
    command: `pnpm exec next build && pnpm exec next start -p ${PORTA_DO_E2E_DB}`,
    env: {
      BUILD_DE_TESTE: "db",
      CONTENT_SOURCE: "supabase",
      NEXT_PUBLIC_SUPABASE_URL: supabase.url,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: supabase.anonKey,
      REVALIDATE_SECRET: SEGREDO_DO_E2E_DB,
      TTL_DO_INDICE_MS_TESTE: "1000",
    },
    url: `http://localhost:${PORTA_DO_E2E_DB}/robots.txt`,
    reuseExistingServer: false,
    timeout: 240_000,
  },
});
