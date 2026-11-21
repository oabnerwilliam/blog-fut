/**
 * Vault do webhook de invalidação (história 14; migração `*_webhook_revalidar.sql`).
 *
 * Grava `url_revalidar` (`<base>/api/revalidar`) e `segredo_revalidar`
 * (`REVALIDATE_SECRET`) pela função SQL `public.configurar_revalidacao`, que só a
 * `service_role` executa. O segredo nunca é impresso.
 *
 * No Supabase local, o Postgres roda no Docker: a base é
 * `http://host.docker.internal:<porta>`, e não `localhost` (que seria o próprio
 * container). Ver docs/operacao/supabase-local.md.
 */
import type { Ambiente, OpcoesDoAmbiente } from "./ambiente";

/** Só o que o comando usa do cliente Supabase: fica fácil de trocar no teste. */
export interface ClienteDoVault {
  rpc(
    nome: string,
    args: Record<string, string>,
  ): PromiseLike<{ error: { message: string } | null }>;
}

export interface ArgumentosDoVault {
  readonly prod: boolean;
  readonly sim: boolean;
  readonly url: string | undefined;
}

/** `--prod`, `--sim` e `--url <base>` (ou `--url=<base>`). Outra opção → erro. */
export function lerArgumentosDoVault(
  argv: readonly string[],
): ArgumentosDoVault {
  let prod = false;
  let sim = false;
  let url: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--prod") prod = true;
    else if (arg === "--sim") sim = true;
    else if (arg === "--url") {
      url = argv[++i];
      if (url === undefined) throw new Error("--url precisa de uma base.");
    } else if (arg.startsWith("--url=")) url = arg.slice("--url=".length);
    else throw new Error(`Opção desconhecida: ${arg}`);
  }
  return { prod, sim, url };
}

/** `https://blog.vercel.app` → `https://blog.vercel.app/api/revalidar`. Aceita só a origem. */
export function urlDoWebhook(base: string): string {
  let url: URL;
  try {
    url = new URL(base);
  } catch {
    throw new Error(
      `Base inválida ("${base}"): use só a origem, como https://<domínio>.`,
    );
  }
  const soOrigem =
    (url.pathname === "/" || url.pathname === "") &&
    url.search === "" &&
    url.hash === "";
  if (!/^https?:$/.test(url.protocol) || !soOrigem) {
    throw new Error(
      `Base inválida ("${base}"): use só a origem, como https://<domínio>.`,
    );
  }
  return `${url.origin}/api/revalidar`;
}

export async function configurarVault(
  cliente: ClienteDoVault,
  { base, segredo }: { base: string; segredo: string },
): Promise<string> {
  const url = urlDoWebhook(base);
  const { error } = await cliente.rpc("configurar_revalidacao", {
    p_url: url,
    p_segredo: segredo,
  });
  if (error) throw new Error(`Vault não configurado: ${error.message}`);
  return url;
}

export interface DependenciasDoVault {
  readonly carregarAmbiente: (opcoes: OpcoesDoAmbiente) => Promise<Ambiente>;
  readonly criarCliente: (ambiente: Ambiente) => ClienteDoVault;
  readonly escrever: (linha: string) => void;
}

export async function executarConfigurarVault(
  argv: readonly string[],
  { carregarAmbiente, criarCliente, escrever }: DependenciasDoVault,
): Promise<void> {
  const { prod, sim, url } = lerArgumentosDoVault(argv);
  // A trava do --prod (destino, confirmação, --sim) é a do carregarAmbiente.
  const ambiente = await carregarAmbiente({ prod, sim });

  const base = url ?? ambiente.variaveis.SITE_URL?.trim();
  if (!base) {
    throw new Error(
      "Sem SITE_URL no arquivo de ambiente. Passe a base com --url (no local: --url http://host.docker.internal:<porta>).",
    );
  }
  const segredo = ambiente.variaveis.REVALIDATE_SECRET?.trim();
  if (!segredo) {
    throw new Error(
      "Sem REVALIDATE_SECRET no arquivo de ambiente. Ele precisa ser igual ao do site.",
    );
  }

  const destino = await configurarVault(criarCliente(ambiente), {
    base,
    segredo,
  });
  escrever(`Vault de ${ambiente.host}: url_revalidar = ${destino}`);
  escrever("Vault: segredo_revalidar gravado (valor não exibido).");
}
