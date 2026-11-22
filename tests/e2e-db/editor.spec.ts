import AxeBuilder from "@axe-core/playwright";
import {
  expect,
  test,
  type APIRequestContext,
  type Browser,
  type BrowserContext,
  type Page,
} from "@playwright/test";
import { gerarSlug } from "../../src/lib/admin/slug";
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
 * O editor de ponta a ponta (história 18, critério 8), contra o Supabase local com as 9
 * matérias do `content/`.
 *
 * - O admin cria uma matéria pelo editor: o slug acompanha o título, a prévia mostra o
 *   markdown renderizado, e "Criar rascunho" leva à edição. Lá, publica, e em até 5 s a
 *   matéria aparece na capa, no sitemap e com JSON-LD `Person`.
 * - Erros: slug repetido e h1 no corpo, com o foco no bloco de erro.
 * - No celular, as abas Escrever/Prévia funcionam por teclado (padrão APG).
 * - A tela: axe nos temas claro e escuro, e nada de rolagem lateral em 320px.
 *
 * A matéria criada é apagada no fim (pela chave de serviço): o e2e do painel, que roda
 * depois, conta as 9 do `content/`. Usuários com e-mail `@exemplo.test`.
 */
const conexao = lerSupabaseLocal();
const servico = clienteDeServico();
const BASE = `http://localhost:${PORTA_DO_E2E_DB}`;
const PRAZO_MS = 5_000;
const SLUG_EXISTENTE = "psg-balanco-temporada-2026-27-mercado-elenco-curto";
const TITULO = "Elenco curto: a conta que só chega em março (editor e2e)";
const SLUG = gerarSlug(TITULO);
const AUTOR = "Marina Couto";
const CORPO = [
  "Todo elenco curto parece genial em **novembro**.",
  "",
  "## O que ele cobra depois",
  "",
  "- lesões em série;",
  "- calendário apertado.",
  "",
].join("\n");

const EMAILS = { admin: "editor-e2e-admin@exemplo.test" };
let admin: UsuarioDeTeste;

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  admin = await criarUsuarioDeTeste(servico, conexao, {
    email: EMAILS.admin,
    status: "aprovado",
    metadados: { full_name: AUTOR },
  });
});

test.afterAll(async () => {
  const { data } = await servico
    .from("articles")
    .select("id")
    .eq("slug", SLUG)
    .maybeSingle();
  if (data) {
    await servico.from("article_revisions").delete().eq("article_id", data.id);
    await servico.from("articles").delete().eq("id", data.id);
  }
  await apagarUsuarios(servico, Object.values(EMAILS));
});

async function contextoDe(
  browser: Browser,
  opcoes: Parameters<Browser["newContext"]>[0] = {},
): Promise<BrowserContext> {
  const contexto = await browser.newContext({ locale: "pt-BR", ...opcoes });
  const cookies = await gerarCookiesDaSessao(conexao, admin.cliente);
  await contexto.addCookies(
    cookies.map((c) => ({ ...c, url: BASE, sameSite: "Lax" as const })),
  );
  return contexto;
}

function h1(page: Page) {
  return page.getByRole("heading", { level: 1 });
}

function previa(page: Page) {
  return page.getByRole("region", { name: /Prévia/ });
}

async function htmlDe(request: APIRequestContext, caminho: string) {
  return (await request.get(caminho)).text();
}

/** O JSON-LD da página da matéria (o `<` vem escapado como `<`, JSON válido). */
async function jsonLdDe(request: APIRequestContext, caminho: string) {
  const html = await htmlDe(request, caminho);
  const achado =
    /<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/.exec(html);
  return achado ? (JSON.parse(achado[1]) as Record<string, unknown>) : null;
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

/** Preenche o que a criação exige, menos o corpo. */
async function preencherCampos(page: Page) {
  await page.getByLabel("Título", { exact: true }).fill(TITULO);
  await page
    .getByLabel("Linha fina", { exact: true })
    .fill("Vender caro e comprar pouco deu certo até a Data Fifa.");
  await page.getByLabel("Editoria", { exact: true }).selectOption("analise");
  const tag = page.getByLabel("Adicionar tag");
  await tag.fill("psg");
  await page.getByRole("button", { name: "Adicionar" }).click();
  await tag.fill("calendario-europeu");
  await page.getByRole("button", { name: "Adicionar" }).click();
}

test("a lista e a nav levam à nova matéria, e só 'Nova matéria' fica marcada", async ({
  browser,
}) => {
  const contexto = await contextoDe(browser);
  const page = await contexto.newPage();
  await page.goto("/admin/materias");
  await page
    .getByRole("main")
    .getByRole("link", { name: "Nova matéria" })
    .click();
  await expect(page).toHaveURL(/\/admin\/materias\/nova$/);
  await expect(h1(page)).toHaveText("Nova matéria");
  const nav = page.getByRole("navigation", { name: "Admin" });
  await expect(nav.getByRole("link", { name: "Nova matéria" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(nav.getByRole("link", { name: "Matérias" })).not.toHaveAttribute(
    "aria-current",
    /.+/,
  );
  await contexto.close();
});

test("criar pelo editor, com a prévia renderizada, e publicar: capa, sitemap e JSON-LD Person em até 5 s", async ({
  browser,
  request,
}) => {
  const contexto = await contextoDe(browser, {
    viewport: { width: 1280, height: 900 },
  });
  const page = await contexto.newPage();
  await page.goto("/admin/materias/nova");
  await esperarHidratacao(page);

  // O autor vem com o nome do Google, e "fictícia" começa desmarcado.
  await expect(page.getByLabel("Autor", { exact: true })).toHaveValue(AUTOR);
  await expect(page.getByLabel("Conteúdo fictício")).not.toBeChecked();

  // O slug acompanha o título até ser editado; "Usar o título" volta à sugestão.
  await preencherCampos(page);
  const slug = page.getByLabel("Slug", { exact: true });
  await expect(slug).toHaveValue(SLUG);
  await slug.fill("outro-slug");
  await page.getByLabel("Título", { exact: true }).fill(`${TITULO}!`);
  await expect(slug).toHaveValue("outro-slug");
  await page.getByLabel("Título", { exact: true }).fill(TITULO);
  await page.getByRole("button", { name: "Usar o título" }).click();
  await expect(slug).toHaveValue(SLUG);
  await expect(slug).toHaveAccessibleDescription(
    /O slug não muda depois de criado/,
  );
  await expect(page.locator("[data-tag-nova]")).toHaveText(
    /calendario-europeu/,
  );

  // A prévia: lado a lado no desktop (sem abas), com o HTML sanitizado do site.
  await expect(page.getByRole("tablist")).toHaveCount(0);
  await expect(
    previa(page).getByText("A prévia aparece aqui quando você escrever."),
  ).toBeVisible();
  await page.getByLabel("Texto em Markdown").fill(CORPO);
  await expect(previa(page).locator(".prosa strong")).toHaveText("novembro");
  await expect(
    previa(page).getByRole("heading", {
      level: 2,
      name: "O que ele cobra depois",
    }),
  ).toBeVisible();
  await expect(previa(page).locator(".prosa li")).toHaveCount(2);
  await expect(previa(page)).toContainText(TITULO);
  await expect(previa(page)).toContainText(AUTOR);
  await expect(page.locator("[data-estado-da-previa]")).toHaveText(
    "Em dia com o texto",
  );
  await expect(previa(page)).not.toHaveAttribute("aria-busy", "true");
  await expect(h1(page)).toHaveCount(1);

  await page.getByRole("button", { name: "Criar rascunho" }).click();
  await expect(page).toHaveURL(/\/admin\/materias\/[0-9a-f-]{36}$/);
  await expect(h1(page)).toHaveText(TITULO);
  await expect(
    page.getByText("A matéria ainda não foi publicada."),
  ).toBeVisible();

  // Antes de publicar, nada no site.
  expect(await htmlDe(request, "/")).not.toContain(TITULO);

  await esperarHidratacao(page);
  await page.getByRole("button", { name: "Publicar", exact: true }).click();
  await expect(page.getByText("Em dia.")).toBeVisible();

  await expect
    .poll(async () => htmlDe(request, "/"), {
      timeout: PRAZO_MS,
      intervals: [250],
    })
    .toContain(TITULO);
  await expect
    .poll(async () => htmlDe(request, "/sitemap.xml"), {
      timeout: PRAZO_MS,
      intervals: [250],
    })
    .toContain(`/materias/${SLUG}`);
  await expect
    .poll(async () => (await jsonLdDe(request, `/materias/${SLUG}`))?.author, {
      timeout: PRAZO_MS,
      intervals: [250],
    })
    .toEqual({ "@type": "Person", name: AUTOR });
  // As matérias do squad continuam com Organization.
  expect(
    (await jsonLdDe(request, `/materias/${SLUG_EXISTENTE}`))?.author,
  ).toMatchObject({ "@type": "Organization" });
  await contexto.close();
});

test("slug repetido e h1 no corpo: o bloco de erro recebe o foco, e nada se perde", async ({
  browser,
}) => {
  const contexto = await contextoDe(browser, {
    viewport: { width: 1280, height: 900 },
  });
  const page = await contexto.newPage();
  await page.goto("/admin/materias/nova");
  await esperarHidratacao(page);
  await preencherCampos(page);
  const slug = page.getByLabel("Slug", { exact: true });
  await slug.fill(SLUG_EXISTENTE);
  const corpo = page.getByLabel("Texto em Markdown");
  await corpo.fill("Texto.\n\n# Outro título\n");
  await page.getByRole("button", { name: "Criar rascunho" }).click();

  // O zod recusa o h1 antes de ir ao banco: primeiro só o corpo.
  const erro = page.getByRole("alert").filter({ hasText: "Não criou" });
  await expect(erro).toBeFocused();
  await expect(
    erro.getByRole("link", {
      name: "Corpo: O título da matéria já é o h1. Use ## para subtítulos (linha 3).",
    }),
  ).toHaveAttribute("href", "#c-corpo");
  await expect(corpo).toHaveAttribute("aria-invalid", "true");
  await expect(corpo).toHaveAccessibleDescription(/já é o h1/);

  // Com o corpo corrigido, o banco recusa o slug que já existe.
  await corpo.fill("Texto.\n\n## Subtítulo\n");
  await page.getByRole("button", { name: "Criar rascunho" }).click();
  await expect(
    erro.getByRole("link", { name: /^Slug: Já existe uma matéria/ }),
  ).toHaveAttribute("href", "#c-slug");
  await expect(erro).toBeFocused();
  await expect(slug).toHaveAttribute("aria-invalid", "true");
  await expect(slug).toHaveAccessibleDescription(
    new RegExp(
      `Já existe uma matéria com o slug ${SLUG_EXISTENTE}\\. Mude o slug, por exemplo acrescentando -2 no fim\\.`,
    ),
  );
  await expect(corpo).not.toHaveAttribute("aria-invalid", "true");
  // O que foi digitado continua no formulário.
  await expect(page.getByLabel("Título", { exact: true })).toHaveValue(TITULO);
  await expect(corpo).toHaveValue("Texto.\n\n## Subtítulo\n");
  await contexto.close();
});

test("no celular, Escrever e Prévia são abas que funcionam por teclado", async ({
  browser,
}) => {
  const contexto = await contextoDe(browser, {
    viewport: { width: 375, height: 800 },
  });
  const page = await contexto.newPage();
  await page.goto("/admin/materias/nova");
  await esperarHidratacao(page);
  const lista = page.getByRole("tablist", { name: "Corpo" });
  await expect(lista).toBeVisible();
  const escrever = lista.getByRole("tab", { name: "Escrever" });
  const aPrevia = lista.getByRole("tab", { name: "Prévia" });
  await expect(escrever).toHaveAttribute("aria-selected", "true");
  await expect(escrever).toHaveAttribute("tabindex", "0");
  await expect(aPrevia).toHaveAttribute("tabindex", "-1");
  await expect(page.locator("#p-previa")).toBeHidden();

  await page.getByLabel("Texto em Markdown").fill("Um parágrafo **forte**.");
  await escrever.focus();
  await page.keyboard.press("ArrowRight");
  await expect(aPrevia).toBeFocused();
  await expect(aPrevia).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#p-escrever")).toBeHidden();
  await expect(page.getByRole("tabpanel", { name: "Prévia" })).toBeVisible();
  await expect(previa(page).locator(".prosa strong")).toHaveText("forte");

  await page.keyboard.press("Home");
  await expect(escrever).toBeFocused();
  await expect(page.locator("#p-escrever")).toBeVisible();
  await page.keyboard.press("End");
  await expect(aPrevia).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(escrever).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(aPrevia).toBeFocused();
  // Tab sai da lista de abas e vai para o painel (o roving tabindex: uma parada só).
  await page.keyboard.press("Tab");
  await expect(escrever).not.toBeFocused();
  await expect(aPrevia).not.toBeFocused();
  await contexto.close();
});

for (const tema of ["light", "dark"] as const) {
  test(`a tela não tem violações axe (${tema}), vazia e com prévia`, async ({
    browser,
  }) => {
    const contexto = await contextoDe(browser, {
      viewport: { width: 1280, height: 900 },
    });
    const page = await contexto.newPage();
    await page.goto("/admin/materias/nova");
    await esperarHidratacao(page);
    await definirTema(page, tema);
    expect(await violacoes(page)).toEqual([]);
    await page.getByLabel("Texto em Markdown").fill(CORPO);
    await expect(previa(page).locator(".prosa strong")).toHaveText("novembro");
    expect(await violacoes(page)).toEqual([]);
    await contexto.close();
  });
}

for (const aba of ["Escrever", "Prévia"] as const) {
  test(`320px sem rolagem horizontal (aba ${aba})`, async ({ browser }) => {
    const contexto = await contextoDe(browser, {
      viewport: { width: 320, height: 800 },
    });
    const page = await contexto.newPage();
    await page.goto("/admin/materias/nova");
    await esperarHidratacao(page);
    await expect(h1(page)).toHaveCount(1);
    await page.getByLabel("Texto em Markdown").fill(CORPO);
    await page.getByRole("tab", { name: aba }).click();
    if (aba === "Prévia") {
      await expect(previa(page).locator(".prosa strong")).toHaveText(
        "novembro",
      );
      expect(await violacoes(page)).toEqual([]);
    }
    const largura = await page.evaluate(() => ({
      rolagem: document.documentElement.scrollWidth,
      tela: document.documentElement.clientWidth,
    }));
    expect(largura.rolagem).toBeLessThanOrEqual(largura.tela);
    await contexto.close();
  });
}
