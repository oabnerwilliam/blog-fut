/**
 * Ambiente dos comandos locais (`pnpm db:importar` e os das próximas histórias).
 *
 * - Sem `--prod`: lê `.env.local`, que aponta para o Supabase local (Docker).
 * - Com `--prod`: lê `.env.prod.local`, mostra o destino e exige confirmação: `s` num
 *   terminal, ou `--sim` fora dele (sessão autônoma, CI). Sem isso, sai com código 1.
 *
 * Nunca imprime chave. Nunca usa `.env.production.local`, que o Next carregaria sozinho.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import { parseEnv } from "node:util";

export interface OpcoesDoAmbiente {
  readonly prod: boolean;
  readonly sim: boolean;
}

export interface Ambiente {
  readonly url: string;
  readonly serviceRoleKey: string;
  /** Só o host da URL, para mostrar o destino sem mostrar chave. */
  readonly host: string;
}

/** Tudo que toca o mundo fica injetável, para o teste cobrir os casos sem terminal real. */
export interface DependenciasDoAmbiente {
  readonly raiz?: string;
  readonly lerArquivo?: (caminho: string) => string;
  readonly ehTTY?: boolean;
  readonly perguntar?: (pergunta: string) => Promise<string>;
  readonly escrever?: (linha: string) => void;
  readonly sair?: (codigo: number) => never;
}

const OBRIGATORIAS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

async function perguntarNoTerminal(pergunta: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return await rl.question(pergunta);
  } finally {
    rl.close();
  }
}

function ehArquivoAusente(erro: unknown): boolean {
  return (
    typeof erro === "object" &&
    erro !== null &&
    "code" in erro &&
    erro.code === "ENOENT"
  );
}

export async function carregarAmbiente(
  { prod, sim }: OpcoesDoAmbiente,
  {
    raiz = process.cwd(),
    lerArquivo = (caminho) => readFileSync(caminho, "utf8"),
    ehTTY = Boolean(process.stdin.isTTY && process.stdout.isTTY),
    perguntar = perguntarNoTerminal,
    escrever = (linha) => console.log(linha),
    sair = (codigo) => process.exit(codigo),
  }: DependenciasDoAmbiente = {},
): Promise<Ambiente> {
  const nome = prod ? ".env.prod.local" : ".env.local";

  let conteudo: string;
  try {
    conteudo = lerArquivo(path.join(raiz, nome));
  } catch (erro) {
    if (ehArquivoAusente(erro)) {
      throw new Error(
        `${nome} não encontrado na raiz do projeto. Veja docs/operacao/supabase-local.md.`,
      );
    }
    throw erro;
  }

  const variaveis = parseEnv(conteudo);
  const faltando = OBRIGATORIAS.filter(
    (chave) => (variaveis[chave] ?? "").trim() === "",
  );
  if (faltando.length > 0) {
    throw new Error(`${nome} sem ${faltando.join(", ")}.`);
  }

  const url = variaveis.NEXT_PUBLIC_SUPABASE_URL!.trim();
  const ambiente: Ambiente = {
    url,
    serviceRoleKey: variaveis.SUPABASE_SERVICE_ROLE_KEY!.trim(),
    host: new URL(url).host,
  };

  if (prod) {
    escrever(`Destino: PRODUÇÃO (${ambiente.host})`);
    if (!sim) {
      if (!ehTTY) {
        escrever(
          "Fora de um terminal interativo, --prod exige --sim como confirmação. Nada foi feito.",
        );
        return sair(1);
      }
      const resposta = await perguntar("Gravar na produção? [s/N] ");
      if (resposta.trim().toLowerCase() !== "s") {
        escrever("Cancelado. Nada foi feito.");
        return sair(1);
      }
    }
  }

  return ambiente;
}

/** `--prod`, `--sim` e `--dir <pasta>` (ou `--dir=<pasta>`). Outra opção → erro. */
export function lerArgumentos(argv: readonly string[]): {
  prod: boolean;
  sim: boolean;
  dir: string | undefined;
} {
  let prod = false;
  let sim = false;
  let dir: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--prod") prod = true;
    else if (arg === "--sim") sim = true;
    else if (arg === "--dir") {
      dir = argv[++i];
      if (dir === undefined) throw new Error("--dir precisa de uma pasta.");
    } else if (arg.startsWith("--dir=")) dir = arg.slice("--dir=".length);
    else throw new Error(`Opção desconhecida: ${arg}`);
  }
  return { prod, sim, dir };
}
