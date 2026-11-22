/**
 * `pnpm admin:promover <email> [--prod] [--sim]` (história 16, critério 7; spec v2 §7.2).
 *
 * Sem um primeiro admin, ninguém aceita o primeiro pedido de acesso. Este comando torna
 * `aprovado` o perfil de um e-mail, com a service_role (que ignora o RLS). O perfil só
 * existe depois que a pessoa entra uma vez em `/admin/entrar`: é o trigger em
 * `auth.users` que o cria.
 *
 * O e-mail nunca aparece inteiro na saída (`mascararEmail`): o relatório de uma sessão
 * pode ir para o git.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Ambiente, OpcoesDoAmbiente } from "./ambiente";
import { ErroDoComando } from "./materias";

const USO = "Uso: pnpm admin:promover <email> [--prod] [--sim]";

/** Um "@" com algo dos dois lados e nenhum espaço. Quem valida de verdade é o banco. */
const EMAIL = /^[^\s@]+@[^\s@]+$/;

export interface ArgumentosDoPromover {
  readonly email: string;
  readonly prod: boolean;
  readonly sim: boolean;
}

export function lerArgumentosDoPromover(
  argv: readonly string[],
): ArgumentosDoPromover {
  let prod = false;
  let sim = false;
  const emails: string[] = [];
  for (const arg of argv) {
    if (arg === "--prod") prod = true;
    else if (arg === "--sim") sim = true;
    else if (arg === "--") continue;
    else if (arg.startsWith("-")) {
      throw new ErroDoComando(`Opção desconhecida: ${arg}\n${USO}`);
    } else emails.push(arg);
  }
  if (emails.length !== 1) throw new ErroDoComando(USO);
  const [email] = emails;
  if (!EMAIL.test(email)) {
    throw new ErroDoComando(`E-mail inválido.\n${USO}`);
  }
  return { email, prod, sim };
}

/** `pessoa@exemplo.test` → `p***@exemplo.test`. */
export function mascararEmail(email: string): string {
  const arroba = email.lastIndexOf("@");
  return `${email.slice(0, 1)}***${email.slice(arroba)}`;
}

/**
 * Padrão do `ilike` que casa o e-mail sem diferenciar maiúsculas e sem curingas: `%`, `_`
 * e `\` são escapados. O PostgREST troca `*` por `%`, então o `*` vira `_` (um caractere
 * qualquer); a comparação exata em JS, depois, descarta o que não for igual.
 */
export function padraoDoEmail(email: string): string {
  return email.replace(/[\\%_]/g, (c) => `\\${c}`).replace(/\*/g, "_");
}

type StatusDoPerfil = "pendente" | "aprovado" | "recusado" | "revogado";

export type ResultadoDoPromover =
  | { readonly estado: "promovido"; readonly anterior: StatusDoPerfil }
  | { readonly estado: "ja_aprovado" };

export interface OpcoesDoPromover {
  /** Cliente com a service_role. */
  readonly cliente: SupabaseClient;
  readonly email: string;
  readonly agora?: () => Date;
}

export async function promoverAdmin({
  cliente,
  email,
  agora = () => new Date(),
}: OpcoesDoPromover): Promise<ResultadoDoPromover> {
  const mascarado = mascararEmail(email);
  const { data, error } = await cliente
    .from("perfis")
    .select("user_id,email,status")
    .ilike("email", padraoDoEmail(email));
  if (error) {
    throw new ErroDoComando(`Falha ao ler os perfis: ${error.message}`);
  }
  const alvo = email.toLowerCase();
  const perfis = (
    data as { user_id: string; email: string | null; status: StatusDoPerfil }[]
  ).filter((p) => p.email?.toLowerCase() === alvo);

  if (perfis.length === 0) {
    throw new ErroDoComando(
      `Nenhum perfil com o e-mail ${mascarado}. A pessoa precisa entrar uma vez em /admin/entrar, com o Google, antes de ser promovida. Depois, rode o comando de novo.`,
    );
  }
  if (perfis.length > 1) {
    throw new ErroDoComando(
      `Há ${perfis.length} perfis com o e-mail ${mascarado}. Nada foi feito; confira em Authentication → Users.`,
    );
  }
  const [perfil] = perfis;
  if (perfil.status === "aprovado") return { estado: "ja_aprovado" };

  const { error: erro } = await cliente
    .from("perfis")
    .update({
      status: "aprovado",
      // Ninguém decidiu pelo painel: o comando é a decisão de quem opera.
      decidido_por: null,
      decidido_em: agora().toISOString(),
    })
    .eq("user_id", perfil.user_id);
  if (erro) {
    throw new ErroDoComando(
      `O banco não promoveu ${mascarado}: ${erro.message}`,
    );
  }
  return { estado: "promovido", anterior: perfil.status };
}

export interface DependenciasDoPromover {
  readonly carregarAmbiente: (opcoes: OpcoesDoAmbiente) => Promise<Ambiente>;
  readonly criarCliente: (ambiente: Ambiente) => SupabaseClient;
  readonly escrever: (linha: string) => void;
}

export async function executarPromoverAdmin(
  argv: readonly string[],
  { carregarAmbiente, criarCliente, escrever }: DependenciasDoPromover,
): Promise<void> {
  const { email, prod, sim } = lerArgumentosDoPromover(argv);
  const ambiente = await carregarAmbiente({ prod, sim });
  const resultado = await promoverAdmin({
    cliente: criarCliente(ambiente),
    email,
  });
  const mascarado = mascararEmail(email);
  if (resultado.estado === "ja_aprovado") {
    escrever(`${mascarado} já é admin. Nada mudou.`);
    return;
  }
  escrever(
    `${mascarado} agora é admin (antes: ${resultado.anterior}), em ${ambiente.host}.`,
  );
}
