import { createHash } from "node:crypto";
import { expect, test, type APIRequestContext } from "@playwright/test";
import { configurarVault } from "../../scripts/lib/vault";
import {
  HOST_DO_SITE_NO_DOCKER,
  PORTA_DO_E2E_DB,
  SEGREDO_DO_E2E_DB,
} from "./constantes";
import { clienteDeServico } from "./supabase-local";

/**
 * Prévia do link (T02, critério 4): a imagem da matéria sai do build e fica em cache, e só
 * muda quando a etiqueta `materia:<slug>` é invalidada. Assim, um título editado no painel
 * aparece na prévia nova, e nada é refeito a cada visita de um robô.
 *
 * Usa a matéria real do acervo, que o build gera com a imagem. O título volta ao original
 * no fim (e o teardown devolve o banco ao `content/`).
 */
const SLUG = "psg-balanco-temporada-2026-27-mercado-elenco-curto";
const PRAZO_MS = 5_000;

const servico = clienteDeServico();
let tituloOriginal = "";

test.describe.configure({ mode: "serial" });

async function configurarWebhook() {
  await configurarVault(servico, {
    base: `http://${HOST_DO_SITE_NO_DOCKER}:${PORTA_DO_E2E_DB}`,
    segredo: SEGREDO_DO_E2E_DB,
  });
}

async function revalidar(request: APIRequestContext) {
  const resposta = await request.post("/api/revalidar", {
    headers: { "x-revalidate-secret": SEGREDO_DO_E2E_DB },
    data: { tabela: "articles", slug: SLUG },
  });
  expect(resposta.status()).toBe(200);
}

/** Caminho da imagem, lido do `og:image` da página (o SITE_URL pode ser outra porta). */
async function caminhoDaImagem(request: APIRequestContext): Promise<string> {
  const html = await (await request.get(`/materias/${SLUG}`)).text();
  const [, url] =
    /<meta property="og:image" content="([^"]+)"/.exec(html) ?? [];
  expect(url, "og:image na página").toBeTruthy();
  const { pathname, search } = new URL(url.replace(/&amp;/g, "&"));
  return pathname + search;
}

async function impressaoDaImagem(
  request: APIRequestContext,
  caminho: string,
): Promise<string> {
  const resposta = await request.get(caminho);
  expect(resposta.status()).toBe(200);
  expect(resposta.headers()["content-type"]).toBe("image/png");
  return createHash("sha256")
    .update(await resposta.body())
    .digest("hex");
}

test.beforeAll(async () => {
  const { data, error } = await servico
    .from("articles")
    .select("titulo")
    .eq("slug", SLUG)
    .single();
  expect(error).toBeNull();
  tituloOriginal = data!.titulo as string;
  await configurarWebhook();
});

test.afterAll(async ({ request }) => {
  await servico
    .from("articles")
    .update({ titulo: tituloOriginal })
    .eq("slug", SLUG);
  await revalidar(request);
  await configurarWebhook();
});

test("a imagem fica em cache: sem o aviso do banco, um título novo não a refaz; invalidar materia:<slug> refaz", async ({
  request,
}) => {
  const caminho = await caminhoDaImagem(request);
  const antes = await impressaoDaImagem(request, caminho);

  // Sem o Vault, o trigger não avisa o site.
  const { error: erroDoVault } = await servico.rpc("remover_revalidacao");
  expect(erroDoVault).toBeNull();
  const { error } = await servico
    .from("articles")
    .update({ titulo: `${tituloOriginal} (prévia editada)` })
    .eq("slug", SLUG);
  expect(error).toBeNull();

  await new Promise((resolver) => setTimeout(resolver, 2_500));
  expect(await impressaoDaImagem(request, caminho)).toBe(antes);

  // O mesmo POST que o webhook faria: invalida `materias` e `materia:<slug>`.
  await revalidar(request);
  await expect
    .poll(() => impressaoDaImagem(request, caminho), {
      timeout: PRAZO_MS,
      intervals: [250],
    })
    .not.toBe(antes);
});

test("com o webhook ligado, editar o título no banco troca a prévia em até 5 s", async ({
  request,
}) => {
  await configurarWebhook();
  const caminho = await caminhoDaImagem(request);
  const antes = await impressaoDaImagem(request, caminho);

  const novo = `${tituloOriginal} (de novo)`;
  const { error } = await servico
    .from("articles")
    .update({ titulo: novo })
    .eq("slug", SLUG);
  expect(error).toBeNull();

  await expect
    .poll(() => impressaoDaImagem(request, caminho), {
      timeout: PRAZO_MS,
      intervals: [250],
    })
    .not.toBe(antes);
  // O alt da página acompanha o título.
  await expect
    .poll(async () => (await request.get(`/materias/${SLUG}`)).text(), {
      timeout: PRAZO_MS,
      intervals: [250],
    })
    .toContain(`<meta property="og:image:alt" content="${novo}"/>`);
});
