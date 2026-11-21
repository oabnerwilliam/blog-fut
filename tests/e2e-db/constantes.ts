/** Porta e segredo do servidor do `pnpm test:e2e:db` (valores só de teste, sem uso real). */
export const PORTA_DO_E2E_DB = 3102;
export const SEGREDO_DO_E2E_DB = "segredo-do-e2e-de-banco-0123456789abcdef";

/**
 * Como o Postgres (no Docker) chega a um servidor do host. No Docker Desktop (Windows e
 * macOS), `host.docker.internal` existe sempre. No Linux, o Supabase CLI cria os
 * containers com `host.docker.internal:host-gateway`. Se um runner não resolver esse
 * nome, defina `HOST_DO_SITE_NO_DOCKER` com o IP do gateway da rede do Supabase (ver
 * docs/operacao/supabase-local.md).
 */
export const HOST_DO_SITE_NO_DOCKER =
  process.env.HOST_DO_SITE_NO_DOCKER?.trim() || "host.docker.internal";
