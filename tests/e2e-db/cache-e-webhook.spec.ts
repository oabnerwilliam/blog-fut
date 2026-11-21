import { expect, test } from "@playwright/test";
import { configurarVault } from "../../scripts/lib/vault";
import {
  HOST_DO_SITE_NO_DOCKER,
  PORTA_DO_E2E_DB,
  SEGREDO_DO_E2E_DB,
} from "./constantes";
import { clienteDeServico } from "./supabase-local";

/**
 * Risco 3 do plano v2: matéria publicada que não aparece, ou despublicada que continua no
 * ar. O teste grava direto no banco (service_role), sem passar pelo site; quem avisa o
 * site é o trigger (pg_net → /api/revalidar → revalidateTag). O site precisa refletir o
 * banco em até 5 s.
 *
 * A capa sai do build estática (○) e só muda pela invalidação das etiquetas. A página da
 * matéria nova também depende do índice do Proxy, que aqui recarrega a cada 1 s
 * (`TTL_DO_INDICE_MS_TESTE`, só no e2e).
 */
const SLUG = "materia-do-teste-de-cache";
const TITULO = "Matéria gravada direto no banco pelo e2e";
const PRAZO_MS = 5_000;

const MATERIA = {
  slug: SLUG,
  titulo: TITULO,
  linha_fina: "Ela precisa aparecer no site sem build novo.",
  editoria: "noticia",
  tags: ["psg"],
  // A mais nova de todas: entra no topo das "últimas" da capa.
  publicado_em: "2099-01-01",
  autor: "Squad Fut",
  ficticio: true,
  fonte: "importacao",
  corpo_md: "Texto da matéria do e2e de cache.\n",
  status: "publicado",
  revisao_publicada: 1,
};

const servico = clienteDeServico();

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await servico.from("articles").delete().eq("slug", SLUG);
  // O Postgres (Docker) chega ao `next start` do host por host.docker.internal.
  await configurarVault(servico, {
    base: `http://${HOST_DO_SITE_NO_DOCKER}:${PORTA_DO_E2E_DB}`,
    segredo: SEGREDO_DO_E2E_DB,
  });
});

test.afterAll(async () => {
  await servico.from("articles").delete().eq("slug", SLUG);
});

async function htmlDe(
  request: import("@playwright/test").APIRequestContext,
  caminho: string,
) {
  const resposta = await request.get(caminho);
  return { status: resposta.status(), html: await resposta.text() };
}

test("antes de gravar: a capa não tem a matéria e a página dá 404", async ({
  request,
}) => {
  expect((await htmlDe(request, "/")).html).not.toContain(TITULO);
  expect((await htmlDe(request, `/materias/${SLUG}`)).status).toBe(404);
});

test("publicar no banco: em até 5 s, aparece na capa e na página dela", async ({
  request,
}) => {
  const { error } = await servico.from("articles").insert(MATERIA);
  expect(error).toBeNull();

  await expect
    .poll(async () => (await htmlDe(request, "/")).html, {
      timeout: PRAZO_MS,
      intervals: [250],
    })
    .toContain(TITULO);

  await expect
    .poll(
      async () => {
        const { status, html } = await htmlDe(request, `/materias/${SLUG}`);
        return status === 200 && html.includes(TITULO);
      },
      { timeout: PRAZO_MS, intervals: [250] },
    )
    .toBe(true);
});

test("editar o título no banco: em até 5 s, a página e a capa mostram o novo", async ({
  request,
}) => {
  const novo = `${TITULO} (editada)`;
  const { error } = await servico
    .from("articles")
    .update({ titulo: novo })
    .eq("slug", SLUG);
  expect(error).toBeNull();

  await expect
    .poll(async () => (await htmlDe(request, `/materias/${SLUG}`)).html, {
      timeout: PRAZO_MS,
      intervals: [250],
    })
    .toContain(novo);
  await expect
    .poll(async () => (await htmlDe(request, "/")).html, {
      timeout: PRAZO_MS,
      intervals: [250],
    })
    .toContain(novo);
});

test("despublicar no banco: em até 5 s, some da capa e a página dá 404", async ({
  request,
}) => {
  const { error } = await servico
    .from("articles")
    .update({ status: "rascunho" })
    .eq("slug", SLUG);
  expect(error).toBeNull();

  await expect
    .poll(async () => (await htmlDe(request, "/")).html, {
      timeout: PRAZO_MS,
      intervals: [250],
    })
    .not.toContain(TITULO);
  await expect
    .poll(async () => (await htmlDe(request, `/materias/${SLUG}`)).status, {
      timeout: PRAZO_MS,
      intervals: [250],
    })
    .toBe(404);
});

test("controle: sem o Vault, a gravação não chega à capa; o POST manual em /api/revalidar a traz", async ({
  request,
}) => {
  // Prova que quem atualiza a capa é a invalidação, e não uma leitura sem cache.
  const { error: erroDoVault } = await servico.rpc("remover_revalidacao");
  expect(erroDoVault).toBeNull();
  const { error } = await servico
    .from("articles")
    .update({ status: "publicado" })
    .eq("slug", SLUG);
  expect(error).toBeNull();

  await new Promise((resolver) => setTimeout(resolver, 2_500));
  expect((await htmlDe(request, "/")).html).not.toContain(TITULO);

  const resposta = await request.post("/api/revalidar", {
    headers: { "x-revalidate-secret": SEGREDO_DO_E2E_DB },
    data: { tabela: "articles", slug: SLUG },
  });
  expect(resposta.status()).toBe(200);
  expect(await resposta.json()).toEqual({
    revalidado: ["materias", `materia:${SLUG}`],
  });
  await expect
    .poll(async () => (await htmlDe(request, "/")).html, {
      timeout: PRAZO_MS,
      intervals: [250],
    })
    .toContain(TITULO);
});

test("/api/revalidar recusa o segredo errado mesmo com o site no ar", async ({
  request,
}) => {
  const resposta = await request.post("/api/revalidar", {
    headers: { "x-revalidate-secret": "errado" },
    data: { tabela: "articles", slug: SLUG },
  });
  expect(resposta.status()).toBe(401);
});
