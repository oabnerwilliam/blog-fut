import {
  expect,
  test,
  type APIRequestContext,
  type Browser,
  type BrowserContext,
  type Request,
} from "@playwright/test";
import {
  apagarUsuarios,
  criarUsuarioDeTeste,
  gerarCookiesDaSessao,
  type UsuarioDeTeste,
} from "../helpers/sessao-supabase";
import { esperarHidratacao } from "../e2e/helpers";
import { PORTA_DO_E2E_DB } from "./constantes";
import { clienteDeServico, lerSupabaseLocal } from "./supabase-local";

/**
 * Risco 1 da v2 (história 16), pelo lado de quem não tem permissão e não usa a tela.
 *
 * - Com Cache Components, o Next renderiza a página junto com os layouts e, numa
 *   navegação do cliente, pede só o segmento que muda (payload RSC). O porteiro do grupo
 *   `(painel)` não protege a página sozinho: `/admin/acessos` confere de novo. Aqui, o
 *   pendente e o recusado repetem a requisição RSC que o navegador do admin fez ao clicar
 *   em "Acessos", com os próprios cookies, e o e-mail de ninguém pode vir na resposta.
 * - Uma server action é um endpoint POST. O pendente e o recusado repetem o POST de
 *   "Aceitar" que o navegador do admin montou (com o id do alvo nos argumentos), com os
 *   próprios cookies: o alvo continua pendente. O mesmo POST com os cookies do admin
 *   aceita, o que prova que a repetição chega de fato à action.
 *
 * Revisor da história 16. E-mails `@exemplo.test`, apagados no fim.
 */
const conexao = lerSupabaseLocal();
const servico = clienteDeServico();
const BASE = `http://localhost:${PORTA_DO_E2E_DB}`;

const EMAILS = {
  admin: "rev-admin@exemplo.test",
  pendente: "rev-pendente@exemplo.test",
  recusado: "rev-recusado@exemplo.test",
  alvo: "rev-alvo@exemplo.test",
};

let admin: UsuarioDeTeste;
let pendente: UsuarioDeTeste;
let recusado: UsuarioDeTeste;
let alvo: UsuarioDeTeste;

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  const criar = (
    email: string,
    nome: string,
    status?: "aprovado" | "recusado",
  ) =>
    criarUsuarioDeTeste(servico, conexao, {
      email,
      status,
      metadados: { full_name: nome },
    });
  admin = await criar(EMAILS.admin, "Rita Revisora", "aprovado");
  pendente = await criar(EMAILS.pendente, "Pedro Pendente");
  recusado = await criar(EMAILS.recusado, "Rui Recusado", "recusado");
  alvo = await criar(EMAILS.alvo, "Alice Alvo");
});

test.afterAll(async () => {
  await apagarUsuarios(servico, Object.values(EMAILS));
});

async function cabecalhoDeCookies(usuario: UsuarioDeTeste): Promise<string> {
  const cookies = await gerarCookiesDaSessao(conexao, usuario.cliente);
  return cookies.map((c) => `${c.name}=${c.value}`).join("; ");
}

async function contextoDe(
  browser: Browser,
  usuario: UsuarioDeTeste,
): Promise<BrowserContext> {
  const contexto = await browser.newContext({ locale: "pt-BR" });
  const cookies = await gerarCookiesDaSessao(conexao, usuario.cliente);
  await contexto.addCookies(
    cookies.map((c) => ({ ...c, url: BASE, sameSite: "Lax" as const })),
  );
  return contexto;
}

/** Os cabeçalhos que o Next usa para montar a resposta (RSC, árvore, action). */
function cabecalhosDoNext(pedido: Request): Record<string, string> {
  const todos = pedido.headers();
  const copiados: Record<string, string> = {};
  for (const [nome, valor] of Object.entries(todos)) {
    if (
      nome === "rsc" ||
      nome.startsWith("next-") ||
      nome === "content-type" ||
      nome === "accept"
    ) {
      copiados[nome] = valor;
    }
  }
  return copiados;
}

async function statusDe(id: string): Promise<string> {
  const { data, error } = await servico
    .from("perfis")
    .select("status")
    .eq("user_id", id)
    .single();
  expect(error).toBeNull();
  return (data as { status: string }).status;
}

function semEmailDeNinguem(corpo: string) {
  for (const email of [EMAILS.admin, EMAILS.alvo]) {
    expect(corpo).not.toContain(email);
  }
}

test("pendente e recusado não recebem a lista de acessos, nem no HTML nem no payload RSC da navegação", async ({
  browser,
  playwright,
}) => {
  // O admin navega de /admin para /admin/acessos pela nav: o navegador pede o RSC.
  const doAdmin = await contextoDe(browser, admin);
  const pagina = await doAdmin.newPage();
  await pagina.goto("/admin");
  await esperarHidratacao(pagina);
  const pedidos: Request[] = [];
  pagina.on("request", (r) => {
    if (new URL(r.url()).pathname === "/admin/acessos" && r.headers().rsc) {
      pedidos.push(r);
    }
  });
  await pagina
    .getByRole("navigation", { name: "Admin" })
    .getByRole("link", { name: "Acessos" })
    .click();
  await expect(pagina.getByRole("heading", { level: 1 })).toHaveText(
    "Acessos",
  );
  // Sanidade: o admin recebe a lista com o e-mail do alvo.
  await expect(pagina.getByText(EMAILS.alvo)).toBeVisible();
  expect(pedidos.length).toBeGreaterThan(0);
  const navegacao =
    pedidos.find((r) => !r.headers()["next-router-prefetch"]) ?? pedidos[0];
  const rsc = cabecalhosDoNext(navegacao);
  await doAdmin.close();

  for (const usuario of [pendente, recusado]) {
    const api: APIRequestContext = await playwright.request.newContext({
      baseURL: BASE,
      extraHTTPHeaders: { cookie: await cabecalhoDeCookies(usuario) },
    });
    const html = await api.get("/admin/acessos");
    semEmailDeNinguem(await html.text());

    const payload = await api.get(new URL(navegacao.url()).pathname, {
      headers: rsc,
    });
    semEmailDeNinguem(await payload.text());
    await api.dispose();
  }
});

test("pendente e recusado repetem o POST de Aceitar com os próprios cookies e nada muda", async ({
  browser,
  playwright,
}) => {
  // O navegador do admin monta o POST da action; ele é guardado e não sai.
  const doAdmin = await contextoDe(browser, admin);
  const pagina = await doAdmin.newPage();
  await pagina.goto("/admin/acessos");
  await esperarHidratacao(pagina);
  let capturado: Request | null = null;
  await pagina.route("**/admin/acessos", async (rota) => {
    const pedido = rota.request();
    if (pedido.method() === "POST" && pedido.headers()["next-action"]) {
      capturado = pedido;
      await rota.abort();
      return;
    }
    await rota.continue();
  });
  await pagina.getByRole("button", { name: "Aceitar Alice Alvo" }).click();
  await expect.poll(() => capturado !== null).toBe(true);
  const pedido = capturado as unknown as Request;
  const corpo = pedido.postDataBuffer();
  const cabecalhos = { ...cabecalhosDoNext(pedido), origin: BASE };
  await doAdmin.close();
  expect(await statusDe(alvo.id)).toBe("pendente");

  const repetir = async (usuario: UsuarioDeTeste) => {
    const api = await playwright.request.newContext({
      baseURL: BASE,
      extraHTTPHeaders: { cookie: await cabecalhoDeCookies(usuario) },
    });
    const resposta = await api.post("/admin/acessos", {
      headers: cabecalhos,
      data: corpo ?? undefined,
    });
    const texto = await resposta.text();
    await api.dispose();
    return texto;
  };

  for (const usuario of [pendente, recusado]) {
    const texto = await repetir(usuario);
    expect(texto).toContain("nao_autorizado");
    expect(await statusDe(alvo.id)).toBe("pendente");
  }

  // O mesmo POST com os cookies do admin aceita: a repetição chega à action.
  await repetir(admin);
  expect(await statusDe(alvo.id)).toBe("aprovado");
});
