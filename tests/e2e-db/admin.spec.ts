import AxeBuilder from "@axe-core/playwright";
import {
  expect,
  test,
  type Browser,
  type BrowserContext,
  type Page,
} from "@playwright/test";
import {
  apagarUsuarios,
  criarUsuarioDeTeste,
  gerarCookiesDaSessao,
  type UsuarioDeTeste,
} from "../helpers/sessao-supabase";
import { definirTema, esperarHidratacao } from "../e2e/helpers";
import { PORTA_DO_E2E_DB } from "./constantes";
import { clienteDeServico, lerSupabaseLocal } from "./supabase-local";

/**
 * O admin de ponta a ponta (história 16, critério 9), contra o Supabase local e com
 * `ADMIN_HABILITADO=true`. O Google não roda no local (sem credencial OAuth de teste):
 * a sessão entra no navegador por cookies gerados pelo próprio `@supabase/ssr`
 * (`gerarCookiesDaSessao`), e o clique em "Entrar com Google" é conferido até o endereço
 * de autorização do Auth, sem seguir para o Google.
 *
 * Usuários criados pela chave de serviço, com e-mails `@exemplo.test`, e apagados no fim.
 */
const conexao = lerSupabaseLocal();
const servico = clienteDeServico();
const BASE = `http://localhost:${PORTA_DO_E2E_DB}`;

const EMAILS = {
  admin: "e2e-admin@exemplo.test",
  pendente: "e2e-pendente@exemplo.test",
  aceito: "e2e-aceito@exemplo.test",
  recusado: "e2e-recusado@exemplo.test",
  revogado: "e2e-revogado@exemplo.test",
  sair: "e2e-sair@exemplo.test",
};

let admin: UsuarioDeTeste;
let pendente: UsuarioDeTeste;
let aceito: UsuarioDeTeste;
let recusado: UsuarioDeTeste;
let revogado: UsuarioDeTeste;
let sair: UsuarioDeTeste;

test.describe.configure({ mode: "serial" });

async function decidido(id: string, status: string, por: string | null) {
  const { error } = await servico
    .from("perfis")
    .update({ status, decidido_por: por, decidido_em: "2026-11-20T15:00:00Z" })
    .eq("user_id", id);
  expect(error).toBeNull();
}

test.beforeAll(async () => {
  const criar = (email: string, nome: string) =>
    criarUsuarioDeTeste(servico, conexao, {
      email,
      metadados: { full_name: nome },
    });
  admin = await criar(EMAILS.admin, "Marina Couto");
  pendente = await criar(EMAILS.pendente, "Joana Prado");
  aceito = await criar(EMAILS.aceito, "Rafael Lima");
  recusado = await criar(EMAILS.recusado, "Carlos Duarte");
  revogado = await criar(EMAILS.revogado, "Paula Viana");
  sair = await criar(EMAILS.sair, "Bruno Sales");
  await decidido(admin.id, "aprovado", null);
  await decidido(sair.id, "aprovado", admin.id);
  await decidido(recusado.id, "recusado", admin.id);
  await decidido(revogado.id, "revogado", admin.id);
});

test.afterAll(async () => {
  await apagarUsuarios(servico, Object.values(EMAILS));
});

/** Um navegador novo com a sessão do usuário nos cookies, como depois do callback. */
async function contextoDe(
  browser: Browser,
  usuario: UsuarioDeTeste,
  opcoes: Parameters<Browser["newContext"]>[0] = {},
): Promise<BrowserContext> {
  const contexto = await browser.newContext({ locale: "pt-BR", ...opcoes });
  const cookies = await gerarCookiesDaSessao(conexao, usuario.cliente);
  await contexto.addCookies(
    cookies.map((c) => ({ ...c, url: BASE, sameSite: "Lax" as const })),
  );
  return contexto;
}

/**
 * O h1 visível. Com Cache Components, a página anterior fica no DOM escondida pelo
 * `<Activity>` (doc `preserving-ui-state.md`): `locator("h1")` acharia as duas.
 */
function h1(page: Page) {
  return page.getByRole("heading", { level: 1 });
}

/** O aviso do callback. Não basta `getByRole("alert")`: o anunciador de rotas do Next também é um alert. */
function avisoDeErro(page: Page) {
  return page.getByRole("alert").filter({ hasText: "Não entrou" });
}

async function violacoes(page: Page) {
  const resultado = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  return resultado.violations.map((v) => ({
    id: v.id,
    alvos: v.nodes.map((n) => n.target.join(" ")),
  }));
}

test.describe("sem sessão", () => {
  test("/admin e /admin/acessos levam a /admin/entrar", async ({ page }) => {
    for (const caminho of ["/admin", "/admin/acessos"]) {
      await page.goto(caminho);
      await expect(page).toHaveURL(/\/admin\/entrar$/);
    }
    await expect(h1(page)).toHaveCount(1);
    await expect(h1(page)).toHaveText("Entrar na redação");
    await expect(
      page.getByRole("button", { name: "Entrar com Google" }),
    ).toBeVisible();
    await expect(avisoDeErro(page)).toHaveCount(0);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex/,
    );
  });

  test("o /admin fica fora do sitemap, e nenhuma página pública tem link para ele", async ({
    page,
    request,
  }) => {
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toContain("<loc>");
    expect(sitemap).not.toContain("/admin");
    await page.goto("/");
    await expect(page.locator('a[href^="/admin"]')).toHaveCount(0);
  });

  test("Entrar com Google vai à autorização do Auth com o callback do admin", async ({
    page,
  }) => {
    // O provedor está desligado no local: o teste para no endereço do Auth.
    await page.route(`${conexao.url}/auth/v1/authorize**`, (rota) =>
      rota.fulfill({ status: 200, body: "autorizar" }),
    );
    await page.goto("/admin/entrar");
    await esperarHidratacao(page);
    const pedido = page.waitForRequest((r) =>
      r.url().startsWith(`${conexao.url}/auth/v1/authorize`),
    );
    await page.getByRole("button", { name: "Entrar com Google" }).click();
    const url = new URL((await pedido).url());
    expect(url.searchParams.get("provider")).toBe("google");
    expect(url.searchParams.get("redirect_to")).toBe(
      `${BASE}/admin/auth/callback`,
    );
    // PKCE: o desafio vai na URL, e o verificador fica num cookie do site.
    expect(url.searchParams.get("code_challenge")).toBeTruthy();
  });

  test("o callback com código inválido ou sem código volta para entrar com o aviso", async ({
    page,
  }) => {
    for (const caminho of [
      "/admin/auth/callback?code=codigo-que-nao-existe",
      "/admin/auth/callback",
    ]) {
      await page.goto(caminho);
      await expect(page).toHaveURL(/\/admin\/entrar\?erro=login$/);
      await expect(avisoDeErro(page)).toContainText(
        "Não foi possível concluir o login com o Google.",
      );
    }
  });

  test("um erro qualquer na URL não mostra o aviso", async ({ page }) => {
    await page.goto("/admin/entrar?erro=%3Cscript%3E");
    await expect(avisoDeErro(page)).toHaveCount(0);
  });
});

test.describe("estados da conta", () => {
  test("pendente vê Pedido enviado, sem nav", async ({ browser }) => {
    const contexto = await contextoDe(browser, pendente);
    const page = await contexto.newPage();
    for (const caminho of ["/admin", "/admin/acessos"]) {
      await page.goto(caminho);
      await expect(h1(page)).toHaveCount(1);
      await expect(h1(page)).toHaveText("Pedido enviado");
    }
    await expect(page.getByText("Conectado como Joana Prado")).toBeAttached();
    await expect(page.getByRole("navigation", { name: "Admin" })).toHaveCount(
      0,
    );
    await expect(page.locator("dl")).toContainText("Pendente");
    await contexto.close();
  });

  for (const [nome, frase] of [
    ["recusado", "Um admin recusou o pedido"],
    ["revogado", "foi revogado por um admin"],
  ] as const) {
    test(`${nome} vê Acesso não autorizado`, async ({ browser }) => {
      const contexto = await contextoDe(
        browser,
        nome === "recusado" ? recusado : revogado,
      );
      const page = await contexto.newPage();
      await page.goto("/admin/acessos");
      await expect(h1(page)).toHaveText("Acesso não autorizado");
      await expect(page.getByText(frase)).toBeVisible();
      await expect(page.locator("dl")).toContainText("em 20.11.2026");
      await expect(page.getByRole("button", { name: /Aceitar/ })).toHaveCount(
        0,
      );
      await contexto.close();
    });
  }
});

test.describe("aprovado", () => {
  test("vê o painel com a nav, e a própria linha em Acessos fica sem ações", async ({
    browser,
  }) => {
    const contexto = await contextoDe(browser, admin);
    const page = await contexto.newPage();
    await page.goto("/admin");
    await expect(h1(page)).toHaveText("Painel");
    const nav = page.getByRole("navigation", { name: "Admin" });
    await expect(nav.getByRole("link", { name: "Painel" })).toHaveAttribute(
      "aria-current",
      "page",
    );

    await nav.getByRole("link", { name: "Acessos" }).click();
    await expect(page).toHaveURL(/\/admin\/acessos$/);
    await expect(h1(page)).toHaveText("Acessos");
    await expect(nav.getByRole("link", { name: "Acessos" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    const propria = page.locator(`[data-pessoa="${admin.id}"]`);
    await expect(propria).toContainText("Você");
    await expect(propria).toContainText("Sua conta · sem ações");
    await expect(propria.getByRole("button")).toHaveCount(0);
    await expect(page.locator('[role="status"]')).toBeAttached();
    await contexto.close();
  });

  test("aceita um pendente, a região de status avisa, e o pendente passa a ver o painel", async ({
    browser,
  }) => {
    const contexto = await contextoDe(browser, admin);
    const page = await contexto.newPage();
    await page.goto("/admin/acessos");
    await esperarHidratacao(page);
    await page.getByRole("button", { name: "Aceitar Rafael Lima" }).click();
    await expect(page.getByRole("status")).toHaveText(
      "Pedido de Rafael Lima aceito. A pessoa já pode abrir o painel.",
    );
    await expect(
      page.locator('section[aria-labelledby="g-aprovados"]'),
    ).toContainText("Rafael Lima");
    await expect(
      page.getByRole("button", { name: "Revogar Rafael Lima" }),
    ).toBeVisible();
    await contexto.close();

    const doAceito = await contextoDe(browser, aceito);
    const dele = await doAceito.newPage();
    await dele.goto("/admin");
    await expect(h1(dele)).toHaveText("Painel");
    await doAceito.close();
  });

  test("Sair encerra a sessão e volta para entrar", async ({ browser }) => {
    const contexto = await contextoDe(browser, sair);
    const page = await contexto.newPage();
    await page.goto("/admin");
    await expect(h1(page)).toHaveText("Painel");
    await page.getByRole("button", { name: "Sair" }).click();
    await expect(page).toHaveURL(/\/admin\/entrar$/);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/entrar$/);
    await contexto.close();
  });
});

/** Cada tela do admin: axe nos dois temas e nada de rolagem lateral em 320px. */
const TELAS = [
  { nome: "entrar", url: "/admin/entrar", quem: null },
  { nome: "entrar com erro", url: "/admin/entrar?erro=login", quem: null },
  { nome: "pedido enviado", url: "/admin", quem: "pendente" },
  { nome: "não autorizado", url: "/admin", quem: "revogado" },
  { nome: "painel", url: "/admin", quem: "admin" },
  { nome: "acessos", url: "/admin/acessos", quem: "admin" },
] as const;

const USUARIOS = () => ({ pendente, revogado, admin });

for (const { nome, url, quem } of TELAS) {
  test.describe(`tela ${nome}`, () => {
    for (const tema of ["light", "dark"] as const) {
      test(`sem violações axe (${tema})`, async ({ browser }) => {
        const contexto = quem
          ? await contextoDe(browser, USUARIOS()[quem])
          : await browser.newContext({ locale: "pt-BR" });
        const page = await contexto.newPage();
        await page.goto(url);
        await expect(h1(page)).toHaveCount(1);
        await definirTema(page, tema);
        expect(await violacoes(page)).toEqual([]);
        await contexto.close();
      });
    }

    test("320px sem rolagem horizontal", async ({ browser }) => {
      const opcoes = { viewport: { width: 320, height: 800 } };
      const contexto = quem
        ? await contextoDe(browser, USUARIOS()[quem], opcoes)
        : await browser.newContext({ locale: "pt-BR", ...opcoes });
      const page = await contexto.newPage();
      await page.goto(url);
      await expect(h1(page)).toHaveCount(1);
      const largura = await page.evaluate(() => ({
        rolagem: document.documentElement.scrollWidth,
        tela: document.documentElement.clientWidth,
      }));
      expect(largura.rolagem).toBeLessThanOrEqual(largura.tela);
      await contexto.close();
    });
  });
}
