import AxeBuilder from "@axe-core/playwright";
import {
  expect,
  test,
  type APIRequestContext,
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
 * O painel de matérias de ponta a ponta (história 17, critério 8), contra o Supabase
 * local com as 9 matérias do `content/` (o global-teardown do `test:db` deixa o banco
 * assim, e o teardown deste projeto devolve no fim).
 *
 * - Risco 5 (U9): o admin edita o título da matéria do PSG e salva; o site continua com
 *   o título antigo. Depois publica, e a capa e a página mostram o novo em até 5 s.
 * - O histórico mostra as revisões, e a comparação marca as linhas trocadas.
 * - Cada tela: axe nos temas claro e escuro, e nada de rolagem lateral em 320px.
 *
 * Usuários com e-mail `@exemplo.test`, criados pela chave de serviço e apagados no fim.
 */
const conexao = lerSupabaseLocal();
const servico = clienteDeServico();
const BASE = `http://localhost:${PORTA_DO_E2E_DB}`;
const SLUG = "psg-balanco-temporada-2026-27-mercado-elenco-curto";
const PRAZO_MS = 5_000;
const TITULO_NOVO = "O mercado enxuto do PSG funcionou até aqui (painel e2e)";
const PARAGRAFO_NOVO =
  "Parágrafo trocado pelo e2e do painel, para a comparação marcar a linha.";

const EMAILS = {
  admin: "painel-e2e-admin@exemplo.test",
  pendente: "painel-e2e-pendente@exemplo.test",
};

let admin: UsuarioDeTeste;
let pendente: UsuarioDeTeste;
let id = "";
let tituloOriginal = "";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  admin = await criarUsuarioDeTeste(servico, conexao, {
    email: EMAILS.admin,
    status: "aprovado",
    metadados: { full_name: "Marina Couto" },
  });
  pendente = await criarUsuarioDeTeste(servico, conexao, {
    email: EMAILS.pendente,
    metadados: { full_name: "Joana Prado" },
  });
  const { data, error } = await servico
    .from("articles")
    .select("id,titulo")
    .eq("slug", SLUG)
    .single();
  expect(error).toBeNull();
  id = data!.id;
  tituloOriginal = data!.titulo;
});

test.afterAll(async () => {
  await apagarUsuarios(servico, Object.values(EMAILS));
});

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

function h1(page: Page) {
  return page.getByRole("heading", { level: 1 });
}

/** A região de retorno das actions (há outras `role=status` na página). */
function retorno(page: Page, texto: string | RegExp) {
  return page.getByRole("status").filter({ hasText: texto });
}

async function htmlDe(request: APIRequestContext, caminho: string) {
  const resposta = await request.get(caminho);
  return { status: resposta.status(), html: await resposta.text() };
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

test("a lista mostra as matérias do banco, com filtros na URL e o estado vazio", async ({
  browser,
}) => {
  const contexto = await contextoDe(browser, admin);
  const page = await contexto.newPage();
  await page.goto("/admin/materias");
  await expect(h1(page)).toHaveText("Matérias");
  const nav = page.getByRole("navigation", { name: "Admin" });
  await expect(nav.getByRole("link", { name: "Matérias" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(page.getByText("Mostrando 9 de 9 matérias")).toBeVisible();
  const psg = page.locator(`[data-materia="${SLUG}"]`);
  await expect(psg.getByRole("heading", { level: 2 })).toHaveText(
    tituloOriginal,
  );
  await expect(psg).toContainText("do squad");

  await page.getByLabel("Editoria").selectOption("analise");
  await page.getByRole("button", { name: "Filtrar" }).click();
  await expect(page).toHaveURL(/editoria=analise/);
  await expect(page.getByText(/Mostrando \d de 9 matérias/)).toBeVisible();
  await expect(psg).toBeVisible();

  await page.goto("/admin/materias?status=rascunho&fonte=painel");
  await expect(
    page.getByText("Nenhuma matéria com esses filtros."),
  ).toBeVisible();
  await expect(
    page.getByText("Mostrando 0 de 9 matérias · rascunho · painel"),
  ).toBeVisible();
  await page.getByRole("link", { name: "limpe todos" }).click();
  await expect(page).toHaveURL(/\/admin\/materias$/);
  await contexto.close();
});

test("salvar não muda o site; publicar muda a capa e a página em até 5 s", async ({
  browser,
  request,
}) => {
  const contexto = await contextoDe(browser, admin);
  const page = await contexto.newPage();
  await page.goto(`/admin/materias/${id}`);
  await expect(h1(page)).toHaveText(tituloOriginal);
  await expect(
    page.getByRole("navigation", { name: "Admin" }).getByRole("link", {
      name: "Matérias",
    }),
  ).toHaveAttribute("aria-current", "true");
  await expect(page.getByText("Em dia.")).toBeVisible();
  await expect(page.getByText("Nada a publicar.")).toBeVisible();
  await esperarHidratacao(page);

  await page.getByLabel("Título", { exact: true }).fill(TITULO_NOVO);
  const corpo = page.getByLabel("Corpo", { exact: true });
  const texto = await corpo.inputValue();
  const linhas = texto.split("\n");
  linhas[4] = PARAGRAFO_NOVO;
  await corpo.fill(linhas.join("\n"));
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(
    retorno(
      page,
      "Revisão 2 salva. O site continua mostrando a revisão 1 até você publicar.",
    ),
  ).toBeVisible();
  await expect(h1(page)).toHaveText(TITULO_NOVO);
  await expect(page.getByText("Alterações não publicadas")).toBeVisible();
  await expect(page.getByText("salva por Marina Couto")).toBeVisible();

  // O site continua com o título antigo (o anon lê só a revisão publicada).
  for (const caminho of ["/", `/materias/${SLUG}`]) {
    const { html } = await htmlDe(request, caminho);
    expect(html, caminho).toContain(tituloOriginal);
    expect(html, caminho).not.toContain(TITULO_NOVO);
  }

  await page.getByRole("button", { name: "Publicar alterações" }).click();
  await expect(
    retorno(
      page,
      "Alterações publicadas. A capa e a página da matéria mostram a revisão 2.",
    ),
  ).toBeVisible();
  for (const caminho of ["/", `/materias/${SLUG}`]) {
    await expect
      .poll(async () => (await htmlDe(request, caminho)).html, {
        timeout: PRAZO_MS,
        intervals: [250],
      })
      .toContain(TITULO_NOVO);
  }
  await expect(page.getByText("Em dia.")).toBeVisible();
  await contexto.close();
});

test("o histórico mostra as revisões, e a comparação marca as linhas trocadas", async ({
  browser,
}) => {
  const contexto = await contextoDe(browser, admin);
  const page = await contexto.newPage();
  // Uma revisão em edição depois da publicada, para a visão padrão comparar as duas.
  await page.goto(`/admin/materias/${id}`);
  await esperarHidratacao(page);
  await page.getByLabel("Título", { exact: true }).fill(`${TITULO_NOVO}!`);
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(retorno(page, "Revisão 3 salva.")).toBeVisible();

  await page.getByRole("link", { name: /Histórico · 3 revisões/ }).click();
  await expect(h1(page)).toHaveText("Histórico");
  const revisoes = page.locator("[data-revisao]");
  await expect(revisoes).toHaveCount(3);
  await expect(page.locator('[data-revisao="2"]')).toContainText("Publicada");
  await expect(page.locator('[data-revisao="3"]')).toContainText("Em edição");
  await expect(page.locator('[data-revisao="1"]')).toContainText(
    "Texto do squad",
  );
  await expect(page.locator('[data-revisao="3"]')).toContainText(
    "Marina Couto",
  );

  // Padrão: a publicada (2) com a em edição (3). Só o título mudou.
  await expect(
    page.getByRole("heading", { name: "Revisão 2 → revisão 3" }),
  ).toBeVisible();
  await expect(
    page.getByText("As duas revisões têm o mesmo corpo."),
  ).toBeVisible();

  // Da 1 para a 2: o parágrafo trocado aparece removido e adicionado.
  await page.getByLabel("De", { exact: true }).selectOption("1");
  await page.getByLabel("Para", { exact: true }).selectOption("2");
  await page.getByRole("button", { name: "Comparar" }).click();
  await expect(page).toHaveURL(/de=1&para=2/);
  const removida = page.locator('[data-linha="removida"]');
  const adicionada = page.locator('[data-linha="adicionada"]');
  await expect(removida).toHaveCount(1);
  await expect(adicionada).toHaveCount(1);
  await expect(removida.locator("del")).toContainText("Só que três daqueles");
  await expect(adicionada.locator("ins")).toHaveText(PARAGRAFO_NOVO);
  await expect(removida).toContainText("Removida, linha 5 da revisão 1:");
  await expect(adicionada).toContainText("Adicionada, linha 5 da revisão 2:");
  await expect(page.locator('[data-linha="pulo"]').first()).toContainText(
    "linhas iguais",
  );

  // Restaurar a revisão 1: vira a 4, e nada é apagado.
  await esperarHidratacao(page);
  await page.goto(`/admin/materias/${id}/historico?ver=1`);
  await esperarHidratacao(page);
  await expect(page.getByRole("heading", { name: "Revisão 1" })).toBeVisible();
  await page.getByRole("button", { name: "Restaurar esta versão" }).click();
  await expect(
    retorno(
      page,
      /Revisão 1 restaurada como revisão 4\. O site continua na revisão 2/,
    ),
  ).toBeVisible();
  await expect(revisoes).toHaveCount(4);
  await page.goto(`/admin/materias/${id}/historico?ver=4`);
  await expect(
    page.getByRole("button", { name: "Restaurar esta versão" }),
  ).toHaveCount(0);
  await contexto.close();
});

test("um campo inválido: o bloco de erro recebe o foco e o campo fica marcado", async ({
  browser,
}) => {
  const contexto = await contextoDe(browser, admin);
  const page = await contexto.newPage();
  await page.goto(`/admin/materias/${id}`);
  await esperarHidratacao(page);
  const titulo = page.getByLabel("Título", { exact: true });
  await titulo.fill("   ");
  await page.getByRole("button", { name: "Salvar" }).click();
  const erro = page.getByRole("alert").filter({ hasText: "Não salvou" });
  await expect(erro).toBeFocused();
  await expect(
    erro.getByRole("link", { name: /Título: não pode ficar vazio/ }),
  ).toHaveAttribute("href", "#c-titulo");
  await expect(titulo).toHaveAttribute("aria-invalid", "true");
  await expect(titulo).toHaveAccessibleDescription(/Não pode ficar vazio\./);
  // O que foi digitado continua no formulário.
  await expect(titulo).toHaveValue("   ");

  // Tag que não é slug: explica e sugere, sem ir ao servidor.
  const tag = page.getByLabel("Adicionar tag");
  await tag.fill("Luis Enrique 2");
  await page.getByRole("button", { name: "Adicionar" }).click();
  await expect(tag).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByText(/não é um slug.*luis-enrique-2/)).toBeVisible();
  await contexto.close();
});

test("quem não é admin não vê o painel; id inválido ou inexistente dá a página de não encontrado", async ({
  browser,
}) => {
  const doPendente = await contextoDe(browser, pendente);
  const page = await doPendente.newPage();
  for (const caminho of [
    "/admin/materias",
    `/admin/materias/${id}`,
    `/admin/materias/${id}/historico`,
  ]) {
    await page.goto(caminho);
    await expect(h1(page)).toHaveText("Pedido enviado");
    await expect(page.getByText(tituloOriginal)).toHaveCount(0);
  }
  await doPendente.close();

  const doAdmin = await contextoDe(browser, admin);
  const dele = await doAdmin.newPage();
  for (const caminho of [
    "/admin/materias/nao-e-um-uuid",
    "/admin/materias/00000000-0000-4000-8000-000000000999",
    "/admin/materias/00000000-0000-4000-8000-000000000999/historico",
  ]) {
    // O `notFound()` vem de dentro do <Suspense> do porteiro, depois de a resposta
    // começar: o status pode já ter saído como 200. O que vale é a página de não
    // encontrado, sem nada da matéria.
    await dele.goto(caminho);
    await expect(h1(dele), caminho).toHaveText("Página não encontrada");
  }
  await doAdmin.close();
});

/** Cada tela do painel: axe nos dois temas e nada de rolagem lateral em 320px. */
const TELAS = [
  { nome: "lista", url: () => "/admin/materias" },
  { nome: "lista vazia", url: () => "/admin/materias?status=rascunho" },
  { nome: "edição", url: () => `/admin/materias/${id}` },
  {
    nome: "histórico (comparação)",
    url: () => `/admin/materias/${id}/historico?de=1&para=2`,
  },
  {
    nome: "histórico (revisão)",
    url: () => `/admin/materias/${id}/historico?ver=2`,
  },
] as const;

for (const { nome, url } of TELAS) {
  test.describe(`tela ${nome}`, () => {
    for (const tema of ["light", "dark"] as const) {
      test(`sem violações axe (${tema})`, async ({ browser }) => {
        const contexto = await contextoDe(browser, admin);
        const page = await contexto.newPage();
        await page.goto(url());
        await expect(h1(page)).toHaveCount(1);
        await definirTema(page, tema);
        expect(await violacoes(page)).toEqual([]);
        await contexto.close();
      });
    }

    test("320px sem rolagem horizontal", async ({ browser }) => {
      const contexto = await contextoDe(browser, admin, {
        viewport: { width: 320, height: 800 },
      });
      const page = await contexto.newPage();
      await page.goto(url());
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
