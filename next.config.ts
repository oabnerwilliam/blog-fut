import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // O conteúdo é lido em tempo de requisição (crawlers, slugs fora do build): vai junto no deploy (ADR 0005).
  outputFileTracingIncludes: {
    "/*": ["./content/materias/**/*", "./content/tags.json"],
  },
};

export default nextConfig;
