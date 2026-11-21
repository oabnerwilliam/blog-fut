import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Convenção: `_` só para parâmetro de contrato ainda não usado; ver docs/adr/0003-prefixo-underscore-no-lint.md.
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "test-results/**",
    // Builds dos e2e alternativos (next.config.ts, BUILD_DE_TESTE).
    ".next-testes/**",
    "playwright-report/**",
  ]),
]);

export default eslintConfig;
