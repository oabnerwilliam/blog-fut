import {
  expect,
  test,
  type Browser,
  type BrowserContext,
  type Page,
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
 * Riscos do editor (história 18) que a suíte do dev não cobre. Revisor da história 18.
 *
 * - A corrida da prévia: uma resposta antiga de `previsualizar`, que chega depois da
 *   nova, não pode cobrir a prévia do texto atual (critério 4, "só a última resposta
 *   vale"). A primeira resposta é segurada pela rota até a segunda já estar na tela.
 * - XSS no topo da prévia: título, linha fina e autor entram como texto (o React escapa),
 *   e o corpo passa pelo `renderMarkdown` sanitizado (ADR 0004). Nada executa.
 * - Quem não é admin: o pendente repete, com os próprios cookies, os POSTs de "Criar
 *   rascunho" e da prévia que o navegador do admin montou, e o payload RSC da navegação
 *   para "Nova matéria" (ADR 0009). Nada é criado, nada é renderizado, e a tela não vem.
 *
 * Usuários `@exemplo.test` e matérias com o prefixo `rev18-`, apagados no fim: o e2e do
 * painel conta as 9 do `content/`.
 */
const conexao = lerSupabaseLocal();
const servico = clienteDeServico();
const BASE = `http://localhost:${PORTA_DO_E2E_DB}`;
const SLUG_DO_REPLAY = "rev18-replay-do-pendente";

const EMAILS = {
  admin: "rev18-admin@exemplo.test",
  pendente: "rev18-pendente@exemplo.test",
};
let admin: UsuarioDeTeste;
let pendente: UsuarioDeTeste;

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  admin = await criarUsuarioDeTeste(servico, conexao, {
    email: EMAILS.admin,
    status: "aprovado",
    metadados: { full_name: "Renata Revisora" },
  });
  pendente = await criarUsuarioDeTeste(servico, conexao, {
    email: EMAILS.pendente,
    metadados: { full_name: "Paulo Pendente" },
  });
});

async function apagarMateria(slug: string) {
  const { data } = await servico
    .from("articles")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (data) {
    await servico.from("article_revisions").delete().eq("article_id", data.id);
    await servico.from("articles").delete().eq("id", data.id);
  }
}

test.afterAll(async () => {
  await apagarMateria(SLUG_DO_REPLAY);
  await apagarUsuarios(servico, Object.values(EMAILS));
});

async function cabecalhoDeCookies(usuario: UsuarioDeTeste): Promise<string> {
  const cookies = await gerarCookiesDaSessao(conexao, usuario.cliente);
  return cookies.map((c) => `${c.name}=${c.value}`).join("; ");
}

async function contextoDoAdmin(browser: Browser): Promise<BrowserContext> {
  const contexto = await browser.newContext({
    locale: "pt-BR",
    viewport: { width: 1280, height: 900 },
  });
  const cookies = await gerarCookiesDaSessao(conexao, admin.cliente);
  await contexto.addCookies(
    cookies.map((c) => ({ ...c, url: BASE, sameSite: "Lax" as const })),
  );
  return contexto;
}

function previa(page: Page) {
  return page.getByRole("region", { name: /Prévia/ });
}

function ehAction(pedido: Request): boolean {
  return pedido.method() === "POST" && !!pedido.headers()["next-action"];
}

/** Os cabeçalhos que o Next usa para montar a resposta (RSC, árvore, action). */
function cabecalhosDoNext(pedido: Request): Record<string, string> {
  const copiados: Record<string, string> = {};
  for (const [nome, valor] of Object.entries(pedido.headers())) {
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

async function existeMateria(slug: string): Promise<boolean> {
  const { data, error } = await servico
    .from("articles")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  expect(error).toBeNull();
  return data !== null;
}

test("prévia: uma resposta antiga que chega depois não cobre a do texto atual", async ({
  browser,
}) => {
  const contexto = await contextoDoAdmin(browser);
  const page = await contexto.newPage();
  await page.goto("/admin/materias/nova");
  await esperarHidratacao(page);

  // O Next despacha as server actions uma de cada vez por cliente (server-actions.md,
  // "Sequential dispatch"): o pedido do segundo texto só sai depois que a resposta do
  // primeiro foi entregue. A corrida real é a resposta do primeiro chegar quando o texto
  // já mudou. As duas respostas ficam presas na rota, e cada uma é solta na hora certa.
  const soltas: Record<"PRIMEIRO" | "SEGUNDO", () => void> = {
    PRIMEIRO: () => {},
    SEGUNDO: () => {},
  };
  const esperas = {
    PRIMEIRO: new Promise<void>((r) => (soltas.PRIMEIRO = r)),
    SEGUNDO: new Promise<void>((r) => (soltas.SEGUNDO = r)),
  };
  const chegou = { PRIMEIRO: false, SEGUNDO: false };
  await page.route("**/admin/materias/nova", async (rota) => {
    const pedido = rota.request();
    const corpo = pedido.postData() ?? "";
    const marca = corpo.includes("PRIMEIRO")
      ? "PRIMEIRO"
      : corpo.includes("SEGUNDO")
        ? "SEGUNDO"
        : null;
    if (ehAction(pedido) && marca) {
      chegou[marca] = true;
      const resposta = await rota.fetch();
      await esperas[marca];
      await rota.fulfill({ response: resposta });
      return;
    }
    await rota.continue();
  });

  const corpo = page.getByLabel("Texto em Markdown");
  const estado = page.locator("[data-estado-da-previa]");
  await corpo.fill("PRIMEIRO texto, **antigo**.");
  await expect.poll(() => chegou.PRIMEIRO).toBe(true);
  // O texto muda enquanto a resposta do primeiro ainda não chegou.
  await corpo.fill("SEGUNDO texto, **atual**.");
  await expect(estado).toHaveAttribute("data-estado-da-previa", "atualizando");

  // A resposta velha chega; o pedido do segundo só sai depois que ela foi tratada.
  soltas.PRIMEIRO();
  await expect.poll(() => chegou.SEGUNDO).toBe(true);
  await page.waitForTimeout(300);
  await expect(previa(page).locator(".prosa")).not.toContainText("PRIMEIRO");
  await expect(estado).toHaveAttribute("data-estado-da-previa", "atualizando");
  await expect(previa(page)).toHaveAttribute("aria-busy", "true");

  // A resposta do texto atual chega e vale.
  soltas.SEGUNDO();
  await expect(previa(page).locator(".prosa strong")).toHaveText("atual");
  await expect(estado).toHaveAttribute("data-estado-da-previa", "em-dia");
  await expect(previa(page)).not.toHaveAttribute("aria-busy", "true");
  await contexto.close();
});

test("prévia: título, linha fina e autor hostis aparecem como texto, e o corpo vem sanitizado", async ({
  browser,
}) => {
  const contexto = await contextoDoAdmin(browser);
  const page = await contexto.newPage();
  const dialogos: string[] = [];
  page.on("dialog", async (d) => {
    dialogos.push(d.message());
    await d.dismiss();
  });
  await page.goto("/admin/materias/nova");
  await esperarHidratacao(page);

  const tituloHostil = `<img src=x onerror="window.__xss='titulo'">Título hostil`;
  const finaHostil = `<script>window.__xss='fina'</script>Linha fina`;
  const autorHostil = `<svg onload="window.__xss='autor'"></svg>Autor`;
  await page.getByLabel("Título", { exact: true }).fill(tituloHostil);
  await page.getByLabel("Linha fina", { exact: true }).fill(finaHostil);
  await page.getByLabel("Autor", { exact: true }).fill(autorHostil);
  await page
    .getByLabel("Texto em Markdown")
    .fill(
      [
        `Texto <img src="x" onerror="window.__xss='corpo'"> **marcado**.`,
        "",
        "<script>window.__xss='script'</script>",
        "",
        "[link](javascript:window.__xss='link')",
      ].join("\n"),
    );
  await expect(previa(page).locator(".prosa strong")).toHaveText("marcado");

  // Os três campos aparecem literalmente, como texto.
  await expect(previa(page)).toContainText(tituloHostil);
  await expect(previa(page)).toContainText(finaHostil);
  await expect(previa(page)).toContainText(autorHostil);
  // Nada de elemento ativo na região: nem do topo, nem do corpo.
  await expect(previa(page).locator("script, svg")).toHaveCount(0);
  await expect(
    previa(page).locator("[onerror], [onload], [onclick]"),
  ).toHaveCount(0);
  await expect(previa(page).locator('a[href^="javascript"]')).toHaveCount(0);
  // Uma imagem quebrada dispararia o onerror: espera um pouco e confere.
  await page.waitForTimeout(300);
  expect(
    await page.evaluate(() => (window as { __xss?: string }).__xss),
  ).toBeUndefined();
  expect(dialogos).toEqual([]);
  await contexto.close();
});

test("o pendente repete os POSTs de criar e de prévia e o RSC da tela com os próprios cookies: nada", async ({
  browser,
  playwright,
}) => {
  const contexto = await contextoDoAdmin(browser);
  const page = await contexto.newPage();

  // O payload RSC da navegação do admin da lista para "Nova matéria".
  await page.goto("/admin/materias");
  await esperarHidratacao(page);
  const rscs: Request[] = [];
  page.on("request", (r) => {
    if (new URL(r.url()).pathname === "/admin/materias/nova" && r.headers().rsc) {
      rscs.push(r);
    }
  });
  await page
    .getByRole("navigation", { name: "Admin" })
    .getByRole("link", { name: "Nova matéria" })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Nova matéria",
  );
  await esperarHidratacao(page);
  expect(rscs.length).toBeGreaterThan(0);
  const navegacao =
    rscs.find((r) => !r.headers()["next-router-prefetch"]) ?? rscs[0];

  // Os POSTs das actions: a prévia passa (o admin vê), o de criar é guardado e não sai.
  let doCriar: Request | null = null;
  let daPrevia: Request | null = null;
  await page.route("**/admin/materias/nova", async (rota) => {
    const pedido = rota.request();
    const corpo = pedido.postData() ?? "";
    if (ehAction(pedido) && corpo.includes(SLUG_DO_REPLAY)) {
      doCriar = pedido;
      await rota.abort();
      return;
    }
    if (ehAction(pedido) && corpo.includes("REPLAY")) daPrevia = pedido;
    await rota.continue();
  });
  await page.getByLabel("Título", { exact: true }).fill("Replay do pendente");
  await page.getByLabel("Slug", { exact: true }).fill(SLUG_DO_REPLAY);
  await page
    .getByLabel("Linha fina", { exact: true })
    .fill("Um pendente tenta criar uma matéria.");
  await page.getByLabel("Adicionar tag").fill("psg");
  await page.getByRole("button", { name: "Adicionar" }).click();
  await page.getByLabel("Texto em Markdown").fill("REPLAY com **negrito**.");
  await expect(previa(page).locator(".prosa strong")).toHaveText("negrito");
  await page.getByRole("button", { name: "Criar rascunho" }).click();
  await expect.poll(() => doCriar !== null).toBe(true);
  expect(daPrevia).not.toBeNull();
  const criar = doCriar as unknown as Request;
  const previaDoAdmin = daPrevia as unknown as Request;
  await contexto.close();
  expect(await existeMateria(SLUG_DO_REPLAY)).toBe(false);

  const api = async (usuario: UsuarioDeTeste) =>
    playwright.request.newContext({
      baseURL: BASE,
      extraHTTPHeaders: { cookie: await cabecalhoDeCookies(usuario) },
    });
  const repetir = async (usuario: UsuarioDeTeste, pedido: Request) => {
    const cliente = await api(usuario);
    const resposta = await cliente.post("/admin/materias/nova", {
      headers: { ...cabecalhosDoNext(pedido), origin: BASE },
      data: pedido.postDataBuffer() ?? undefined,
    });
    const texto = await resposta.text();
    await cliente.dispose();
    return texto;
  };

  // O pendente: a tela não vem, nem no HTML nem no payload RSC.
  const doPendente = await api(pendente);
  const html = await (await doPendente.get("/admin/materias/nova")).text();
  const payload = await (
    await doPendente.get(new URL(navegacao.url()).pathname, {
      headers: cabecalhosDoNext(navegacao),
    })
  ).text();
  await doPendente.dispose();
  for (const corpo of [html, payload]) {
    expect(corpo).not.toContain("Criar rascunho");
    expect(corpo).not.toContain("tags-existentes");
    expect(corpo).not.toContain("Campos da nova matéria");
  }

  // O pendente: a prévia não renderiza, e a criação não grava.
  const previaDoPendente = await repetir(pendente, previaDoAdmin);
  expect(previaDoPendente).toContain("nao_autorizado");
  expect(previaDoPendente).not.toContain("<strong>negrito</strong>");
  const criarDoPendente = await repetir(pendente, criar);
  expect(criarDoPendente).toContain("nao_autorizado");
  expect(await existeMateria(SLUG_DO_REPLAY)).toBe(false);

  // O mesmo POST com os cookies do admin cria: a repetição chega de fato à action.
  expect(await repetir(admin, previaDoAdmin)).toContain(
    "<strong>negrito</strong>",
  );
  await repetir(admin, criar);
  expect(await existeMateria(SLUG_DO_REPLAY)).toBe(true);
  const { data } = await servico
    .from("articles")
    .select("status, fonte, origem")
    .eq("slug", SLUG_DO_REPLAY)
    .single();
  expect(data).toEqual({ status: "rascunho", fonte: "painel", origem: null });
});
