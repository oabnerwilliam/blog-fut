import type { NextConfig } from "next";

/**
 * Builds dos e2e alternativos (história 14): `sem-banco` (Supabase fora do ar) e `db`
 * (Supabase local). Cada um vai para uma pasta própria, para não apagar o `.next` dos
 * portões, que é o build com `files`. O tsconfig deles já lista os tipos dessas pastas,
 * e o Next não precisa reescrever o `tsconfig.json`. Fora dos testes, nada muda.
 */
const BUILDS_DE_TESTE = ["sem-banco", "db"] as const;
const buildDeTeste = process.env.BUILD_DE_TESTE;
if (
  buildDeTeste !== undefined &&
  !(BUILDS_DE_TESTE as readonly string[]).includes(buildDeTeste)
) {
  throw new Error(
    `BUILD_DE_TESTE inválido: "${buildDeTeste}". Valores aceitos: ${BUILDS_DE_TESTE.join(", ")}.`,
  );
}

const nextConfig: NextConfig = {
  ...(buildDeTeste && {
    distDir: `.next-testes/${buildDeTeste}`,
    typescript: { tsconfigPath: "tsconfig.testes.json" },
  }),
  cacheComponents: true,
  partialPrefetching: true,
  // O conteúdo é lido em tempo de requisição (crawlers, slugs fora do build): vai junto no deploy (ADR 0005).
  outputFileTracingIncludes: {
    "/*": ["./content/materias/**/*", "./content/tags.json"],
    // As fontes das prévias do link (T02), lidas só por src/lib/og/fontes.ts: vão só nas rotas de imagem.
    "**/opengraph-image*": ["./assets/fontes/*.ttf"],
  },
  // Os testes e as fixtures de conteúdo não vão no deploy das rotas. O trace do proxy, que o
  // Turbopack gera à parte, não passa por este filtro e ainda leva as fixtures.
  outputFileTracingExcludes: {
    "/*": ["./tests/**/*"],
  },
};

export default nextConfig;
