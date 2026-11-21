export type Ambiente = Readonly<Record<string, string | undefined>>;

export type FonteDoConteudo = "files" | "supabase";

/** URL e chave anon (publicável): o RLS do banco decide o que ela lê. */
export interface ConexaoSupabase {
  readonly url: string;
  readonly anonKey: string;
}

export type ContentConfig =
  | { readonly source: "files"; readonly mostrarExemplos: boolean }
  | {
      readonly source: "supabase";
      readonly mostrarExemplos: boolean;
      readonly supabase: ConexaoSupabase;
    };

const FONTES: readonly FonteDoConteudo[] = ["files", "supabase"];

function lerFonte(valor: string | undefined): FonteDoConteudo {
  if (valor === undefined) return "files";
  if ((FONTES as readonly string[]).includes(valor)) {
    return valor as FonteDoConteudo;
  }
  throw new Error(
    `CONTENT_SOURCE inválido: "${valor}". Valores aceitos: ${FONTES.join(", ")}.`,
  );
}

function lerMostrarExemplos(valor: string | undefined): boolean {
  if (valor === undefined || valor === "true") return true;
  if (valor === "false") return false;
  throw new Error(
    `MOSTRAR_EXEMPLOS inválido: "${valor}". Use "true" ou "false".`,
  );
}

const VARIAVEIS_DO_SUPABASE = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;

/** Lista todas as que faltam de uma vez, para quem configura não descobrir uma por deploy. */
function lerConexaoSupabase(env: Ambiente): ConexaoSupabase {
  const faltando = VARIAVEIS_DO_SUPABASE.filter(
    (nome) => (env[nome] ?? "").trim() === "",
  );
  if (faltando.length > 0) {
    throw new Error(
      `CONTENT_SOURCE=supabase: faltam variáveis de ambiente (ausentes ou vazias): ${faltando.join(", ")}.`,
    );
  }
  return {
    url: env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  };
}

/** Lê e valida CONTENT_SOURCE, MOSTRAR_EXEMPLOS e, com supabase, a conexão. Valor desconhecido nunca cai num padrão. */
export function lerConfiguracao(env: Ambiente): ContentConfig {
  const source = lerFonte(env.CONTENT_SOURCE);
  const mostrarExemplos = lerMostrarExemplos(env.MOSTRAR_EXEMPLOS);
  if (source === "files") return { source, mostrarExemplos };
  return { source, mostrarExemplos, supabase: lerConexaoSupabase(env) };
}
