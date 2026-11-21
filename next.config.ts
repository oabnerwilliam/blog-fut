import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // O conteúdo é lido em tempo de requisição (crawlers, slugs fora do build): vai junto no deploy (ADR 0005).
  outputFileTracingIncludes: {
    "/*": ["./content/materias/**/*", "./content/tags.json"],
  },
  // Os testes e as fixtures de conteúdo não vão no deploy das rotas. O trace do proxy, que o
  // Turbopack gera à parte, não passa por este filtro e ainda leva as fixtures.
  outputFileTracingExcludes: {
    "/*": ["./tests/**/*"],
  },
};

export default nextConfig;
