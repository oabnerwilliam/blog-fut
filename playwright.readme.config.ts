import { defineConfig, devices } from "@playwright/test";

/**
 * Capturas do README (tarefa T03). Não faz parte dos portões: rode com `pnpm readme:imagens`
 * quando o visual mudar e commite as imagens de `docs/readme/`.
 *
 * Não rode junto com o `pnpm test:e2e` nem com o `pnpm dev`: todos usam o mesmo `.next`.
 *
 * O site sobe com o conteúdo de arquivos (`content/materias/`) e o admin desligado, então as
 * imagens nunca mostram dado do banco nem dado pessoal.
 */
const PORT = 3200;

export default defineConfig({
  testDir: "tests/readme",
  outputDir: "test-results/readme",
  fullyParallel: true,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "pt-BR",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm build && pnpm exec next start -p ${PORT}`,
    // O `env` vence o `.env.local`: mesmo com o Supabase configurado na máquina, as
    // capturas usam só as fixtures do repositório.
    env: {
      CONTENT_SOURCE: "files",
      ADMIN_HABILITADO: "false",
      MOSTRAR_EXEMPLOS: "true",
    },
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
