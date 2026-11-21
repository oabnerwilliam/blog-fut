import { defineConfig, devices } from "@playwright/test";

/**
 * E2e do risco 4 do plano v2 (U11): o site com `CONTENT_SOURCE=supabase` apontando para
 * um endereço sem banco (`http://127.0.0.1:9`). O build precisa passar, e as páginas que
 * leem o banco mostram o `error.tsx`.
 *
 * Config separado da suíte da v1, com o próprio servidor e a própria pasta de build
 * (`BUILD_DE_TESTE=sem-banco` → `.next-testes/sem-banco`, ver next.config.ts): o `.next`
 * dos portões continua sendo o build com `files`. Não precisa de Docker. Roda no fim do
 * `pnpm test:e2e`.
 */
const PORT = 3101;

/** Nada escuta na porta 9 (discard): toda leitura do Supabase falha com "fetch failed". */
const AMBIENTE_SEM_BANCO = {
  BUILD_DE_TESTE: "sem-banco",
  CONTENT_SOURCE: "supabase",
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:9",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "chave-de-teste-sem-banco",
};

export default defineConfig({
  testDir: "tests/e2e-sem-banco",
  outputDir: "test-results/e2e-sem-banco",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "pt-BR",
  },
  projects: [{ name: "sem-banco", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // O `env` do Playwright passa as variáveis ao comando no Windows e no Linux (sem
    // cross-env). Elas vencem o `.env.local`: o Next não sobrescreve o que já existe.
    command: `pnpm exec next build && pnpm exec next start -p ${PORT}`,
    env: AMBIENTE_SEM_BANCO,
    url: `http://localhost:${PORT}/robots.txt`,
    reuseExistingServer: false,
    timeout: 240_000,
  },
});
