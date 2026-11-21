import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
  testDir: "tests/e2e",
  /*
   * As referências visuais da v1 (`visual.spec.ts-snapshots/`) só existem para win32: a
   * renderização de fontes muda entre sistemas. No CI (ubuntu-latest), o visual.spec é
   * pulado, e as referências continuam conferidas nos portões locais (decisão do
   * orquestrador na história 14; ADR 0008, §8).
   */
  testIgnore: process.env.CI ? ["**/visual.spec.ts"] : [],
  outputDir: "test-results/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "pt-BR",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm build && pnpm exec next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
