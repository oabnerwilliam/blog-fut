/**
 * Editor de matérias contra o Supabase local (história 18, critérios 2, 3, 4, 6 e 7).
 *
 * As server actions de `src/lib/admin/materias.ts` rodam de verdade, como em
 * `painel.test.ts`: o `cookies()` do Next é um pote em memória com a sessão de um usuário
 * real, e o `updateTag`/`refresh` viram espiões. O que o site lê é conferido com a chave
 * anon e com o repositório do site.
 */
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import type { CamposDaCriacaoDeEntrada } from "@/lib/admin/tipos";
import { SupabaseArticleRepository } from "@/lib/content/supabase/repository";
import { jsonLdDaMateria } from "@/lib/seo";
import {
  cookiesDaSessao,
  poteDeCookies,
  type CookieSimples,
} from "./helpers/cookies-de-sessao";
import {
  clienteAnonimo,
  clienteDeServico,
  limparBanco,
  supabaseLocal,
} from "./helpers/supabase-local";
import {
  apagarUsuarios,
  criarUsuario,
  definirStatus,
  type UsuarioDeTeste,
} from "./helpers/usuarios";

let pote = poteDeCookies();
vi.mock("next/headers", () => ({ cookies: async () => pote }));
vi.mock("next/server", () => ({ connection: async () => {} }));
const updateTag = vi.fn();
const refresh = vi.fn();
vi.mock("next/cache", () => ({ updateTag, refresh }));

const acoes = await import("@/lib/admin/materias");

const servico = clienteDeServico();
const anon = clienteAnonimo();
const site = () =>
  new SupabaseArticleRepository({ client: anon, mostrarExemplos: true });

const EMAILS = {
  admin: "editor-admin@exemplo.test",
  pendente: "editor-pendente@exemplo.test",
};

let admin: UsuarioDeTeste;
let pendente: UsuarioDeTeste;
let cookiesDoAdmin: CookieSimples[];
let cookiesDoPendente: CookieSimples[];

/** Uma matéria do squad já no ar, para o slug repetido. */
const DO_SQUAD = {
  slug: "psg-vence-e-respira",
  titulo: "PSG vence e respira na Ligue 1",
  titulo_seo: null,
  linha_fina: "Vitória sobre o Lyon",
  editoria: "noticia",
  tags: ["psg"],
  meta_description: null,
  palavras_chave: [],
  publicado_em: "2026-11-02",
  autor: "Squad Fut",
  ficticio: false,
  origem: "squad-fut/materias/psg-vence/final.md",
  corpo_md: "O PSG venceu.\n",
  rotulos: { psg: "PSG" },
};

const SLUG = "marcelina-arruda-renova";

/** Os campos que a tela de criação mandaria. */
function campos(
  extra: Partial<CamposDaCriacaoDeEntrada> = {},
): CamposDaCriacaoDeEntrada {
  return {
    titulo: "Marcelina Arruda renova até 2028",
    slug: SLUG,
    titulo_seo: null,
    linha_fina: "A goleira fica no clube por mais duas temporadas",
    editoria: "noticia",
    tags: ["marcelina-arruda", "psg"],
    meta_description: null,
    palavras_chave: ["renovação"],
    autor: "Admin do Editor",
    ficticio: false,
    corpo_md: "Primeiro parágrafo.\r\n\r\nSegundo, com **negrito**.\r\n",
    ...extra,
  };
}

/** Os campos no formato da RPC (o que a action manda depois do zod). */
function camposDaRpc(extra: Record<string, unknown> = {}) {
  return {
    ...campos(),
    corpo_md: "Primeiro parágrafo.\n",
    ...extra,
  };
}

/** A data de hoje em São Paulo, AAAA-MM-DD (en-CA formata assim). */
function hojeEmSaoPaulo(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date());
}

function comoAdmin() {
  pote = poteDeCookies(cookiesDoAdmin);
}
function comoPendente() {
  pote = poteDeCookies(cookiesDoPendente);
}

async function fotoDoBanco() {
  const [articles, revs, tags] = await Promise.all([
    servico.from("articles").select("*").order("slug"),
    servico
      .from("article_revisions")
      .select("*")
      .order("article_id")
      .order("numero"),
    servico.from("tags").select("*").order("slug"),
  ]);
  return { articles: articles.data, revisoes: revs.data, tags: tags.data };
}

async function linhaDe(slug: string) {
  const { data, error } = await servico
    .from("articles")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  expect(error).toBeNull();
  return data as Record<string, unknown> | null;
}

async function revisoesDe(articleId: string) {
  const { data, error } = await servico
    .from("article_revisions")
    .select("*")
    .eq("article_id", articleId)
    .order("numero");
  expect(error).toBeNull();
  return data as Record<string, unknown>[];
}

beforeAll(async () => {
  const { url, anonKey } = supabaseLocal();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", url);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", anonKey);
  vi.stubEnv("ADMIN_HABILITADO", "true");
  admin = await criarUsuario(servico, {
    email: EMAILS.admin,
    status: "aprovado",
    metadados: { full_name: "Admin do Editor" },
  });
  pendente = await criarUsuario(servico, { email: EMAILS.pendente });
  cookiesDoAdmin = await cookiesDaSessao(admin.cliente);
  cookiesDoPendente = await cookiesDaSessao(pendente.cliente);
});

afterAll(async () => {
  vi.unstubAllEnvs();
  await apagarUsuarios(servico, Object.values(EMAILS));
});

beforeEach(async () => {
  vi.clearAllMocks();
  await definirStatus(servico, admin.id, "aprovado");
  await limparBanco(servico);
  const envio = await servico.rpc("enviar_materia_do_squad", {
    dados: DO_SQUAD,
  });
  expect(envio.error).toBeNull();
  const publicacao = await servico.rpc("publicar_revisao", {
    p_article_id: envio.data,
  });
  expect(publicacao.error).toBeNull();
  comoAdmin();
});

describe("criarMateria", () => {
  it("cria o rascunho do painel com a revisão 1 assinada por quem criou, sem mexer no cache", async () => {
    const resultado = await acoes.criarMateria(campos());
    expect(resultado).toEqual({
      ok: true,
      id: expect.stringMatching(/^[0-9a-f-]{36}$/),
      slug: SLUG,
    });
    if (!resultado.ok) return;

    const linha = await linhaDe(SLUG);
    expect(linha).toMatchObject({
      id: resultado.id,
      fonte: "painel",
      origem: null,
      status: "rascunho",
      revisao_em_edicao: 1,
      revisao_publicada: null,
      publicado_em: hojeEmSaoPaulo(),
      titulo: "Marcelina Arruda renova até 2028",
      tags: ["marcelina-arruda", "psg"],
      palavras_chave: ["renovação"],
      autor: "Admin do Editor",
      ficticio: false,
      corpo_md: "Primeiro parágrafo.\n\nSegundo, com **negrito**.\n",
    });

    const revisoes = await revisoesDe(resultado.id);
    expect(revisoes).toHaveLength(1);
    expect(revisoes[0]).toMatchObject({
      numero: 1,
      origem_da_revisao: "painel",
      autor_id: admin.id,
      titulo: linha!.titulo,
      corpo_md: linha!.corpo_md,
      publicado_em: linha!.publicado_em,
    });

    expect(updateTag).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("o rascunho criado não aparece para o anon (nem a linha, nem a tag nova, nem o site)", async () => {
    const resultado = await acoes.criarMateria(campos());
    expect(resultado.ok).toBe(true);

    const { data, error } = await anon
      .from("articles")
      .select("slug")
      .eq("slug", SLUG);
    expect(error).toBeNull();
    expect(data).toEqual([]);
    const tags = await anon.from("tags").select("slug");
    expect(tags.data?.map((t) => t.slug)).not.toContain("marcelina-arruda");

    const repo = site();
    expect(await repo.getBySlug(SLUG)).toBeNull();
    expect((await repo.list()).itens.map((a) => a.slug)).toEqual([
      DO_SQUAD.slug,
    ]);
    expect(await repo.search("marcelina")).toEqual([]);
  });

  it("slug que já existe: erro claro com o slug, também no campo, e nada é gravado", async () => {
    const antes = await fotoDoBanco();
    const resultado = await acoes.criarMateria(campos({ slug: DO_SQUAD.slug }));
    expect(resultado).toEqual({
      ok: false,
      erro: "slug_ja_existe",
      mensagem: `Já existe uma matéria com o slug ${DO_SQUAD.slug}.`,
      errosDosCampos: {
        slug: `Já existe uma matéria com o slug ${DO_SQUAD.slug}.`,
      },
    });
    expect(await fotoDoBanco()).toEqual(antes);
  });

  it("criar duas vezes o mesmo slug: a segunda é recusada, e só uma matéria e uma revisão existem", async () => {
    expect((await acoes.criarMateria(campos())).ok).toBe(true);
    const depoisDaPrimeira = await fotoDoBanco();
    expect(
      await acoes.criarMateria(campos({ titulo: "Outro título" })),
    ).toMatchObject({ ok: false, erro: "slug_ja_existe" });
    expect(await fotoDoBanco()).toEqual(depoisDaPrimeira);
  });

  it("duas criações do mesmo slug ao mesmo tempo: uma cria, a outra recebe slug_ja_existe", async () => {
    const resultados = await Promise.all([
      acoes.criarMateria(campos({ titulo: "Primeira" })),
      acoes.criarMateria(campos({ titulo: "Segunda" })),
    ]);
    expect(resultados.filter((r) => r.ok)).toHaveLength(1);
    expect(resultados.filter((r) => !r.ok)).toEqual([
      expect.objectContaining({ erro: "slug_ja_existe" }),
    ]);
    const linha = await linhaDe(SLUG);
    expect(await revisoesDe(linha!.id as string)).toHaveLength(1);
  });

  it("slug vazio (título só com pontuação): erro no campo slug, nada é gravado", async () => {
    const antes = await fotoDoBanco();
    const resultado = await acoes.criarMateria(
      campos({ titulo: "?!...", slug: "" }),
    );
    expect(resultado).toMatchObject({
      ok: false,
      erro: "campos_invalidos",
      errosDosCampos: { slug: expect.stringMatching(/não pode ficar vazio/) },
    });
    expect(await fotoDoBanco()).toEqual(antes);
  });

  it("campos inválidos: recusa com os erros por campo, nada é gravado", async () => {
    const antes = await fotoDoBanco();
    const resultado = await acoes.criarMateria(
      campos({ slug: "Com Espaço", tags: [], linha_fina: " " }),
    );
    expect(resultado).toMatchObject({
      ok: false,
      erro: "campos_invalidos",
      errosDosCampos: {
        slug: expect.stringMatching(/kebab-case/),
        tags: expect.any(String),
        linha_fina: expect.any(String),
      },
    });
    expect(await fotoDoBanco()).toEqual(antes);
  });

  it("publicar a matéria criada: aparece no site com fonte painel, JSON-LD Person e a data da criação", async () => {
    const criada = await acoes.criarMateria(campos());
    if (!criada.ok) throw new Error(criada.mensagem);
    expect(await acoes.publicarAlteracoes(criada.id)).toEqual({
      ok: true,
      slug: SLUG,
    });

    const materia = await site().getBySlug(SLUG);
    expect(materia).toMatchObject({
      slug: SLUG,
      fonte: "painel",
      origem: null,
      autor: "Admin do Editor",
      publicado_em: hojeEmSaoPaulo(),
      tags: [
        { slug: "marcelina-arruda", rotulo: "Marcelina Arruda" },
        { slug: "psg", rotulo: "PSG" },
      ],
    });
    expect(
      jsonLdDaMateria(materia!, new URL("https://exemplo.test")).author,
    ).toEqual({ "@type": "Person", name: "Admin do Editor" });
    // A do squad continua Organization.
    const doSquad = await site().getBySlug(DO_SQUAD.slug);
    expect(doSquad?.fonte).toBe("squad");
    expect(
      jsonLdDaMateria(doSquad!, new URL("https://exemplo.test")).author,
    ).toMatchObject({ "@type": "Organization" });
    // No resumo da lista também.
    const resumo = (await site().list()).itens.find((a) => a.slug === SLUG);
    expect(resumo?.fonte).toBe("painel");
  });
});

describe("criar_materia chamada direto pelo admin (o banco valida, sem o zod)", () => {
  it.each([
    ["slug fora do kebab-case", { slug: "Com Espaço" }],
    ["slug ausente", { slug: null }],
    ["tags vazias", { tags: [] }],
    ["tags que não são lista", { tags: "psg" }],
    ["tag fora do kebab-case", { tags: ["Tag Ruim"] }],
    ["palavras_chave que não são lista", { palavras_chave: "x" }],
    ["ficticio que não é booleano", { ficticio: "não" }],
    ["título vazio", { titulo: " " }],
    ["linha fina ausente", { linha_fina: null }],
    ["editoria fora da lista", { editoria: "opiniao" }],
    ["autor vazio", { autor: "" }],
    ["corpo ausente", { corpo_md: null }],
  ])("%s: campos_invalidos e o banco igual", async (_caso, extra) => {
    const antes = await fotoDoBanco();
    const { error } = await admin.cliente.rpc("criar_materia", {
      campos: camposDaRpc(extra),
    });
    expect(error?.hint).toBe("campos_invalidos");
    expect(await fotoDoBanco()).toEqual(antes);
  });

  it("slug existente pela RPC: hint slug_ja_existe e o banco igual", async () => {
    const antes = await fotoDoBanco();
    const { error } = await admin.cliente.rpc("criar_materia", {
      campos: camposDaRpc({ slug: DO_SQUAD.slug }),
    });
    expect(error?.hint).toBe("slug_ja_existe");
    expect(await fotoDoBanco()).toEqual(antes);
  });

  it("chaves a mais não forjam a fonte, a origem, o status, a data nem o autor da revisão", async () => {
    const { data, error } = await admin.cliente.rpc("criar_materia", {
      campos: camposDaRpc({
        fonte: "squad",
        origem: "squad-fut/forjada.md",
        status: "publicado",
        publicado_em: "2020-01-01",
        revisao_publicada: 1,
        autor_id: pendente.id,
        origem_da_revisao: "squad",
      }),
    });
    expect(error).toBeNull();
    const linha = await linhaDe(SLUG);
    expect(linha).toMatchObject({
      id: data,
      fonte: "painel",
      origem: null,
      status: "rascunho",
      revisao_publicada: null,
      publicado_em: hojeEmSaoPaulo(),
    });
    expect((await revisoesDe(data as string))[0]).toMatchObject({
      autor_id: admin.id,
      origem_da_revisao: "painel",
    });
  });
});

describe("quem não é admin não cria", () => {
  it("o pendente pela action: nao_autorizado e o banco igual", async () => {
    comoPendente();
    const antes = await fotoDoBanco();
    expect(await acoes.criarMateria(campos())).toMatchObject({
      ok: false,
      erro: "nao_autorizado",
    });
    expect(await fotoDoBanco()).toEqual(antes);
  });

  it("o pendente pela RPC direta, com o próprio JWT: 42501 e o banco igual", async () => {
    const antes = await fotoDoBanco();
    const { error } = await pendente.cliente.rpc("criar_materia", {
      campos: camposDaRpc(),
    });
    expect(error?.code).toBe("42501");
    expect(await fotoDoBanco()).toEqual(antes);
  });

  it("o anon pela RPC: sem execute, e o banco igual", async () => {
    const antes = await fotoDoBanco();
    const { error } = await anon.rpc("criar_materia", {
      campos: camposDaRpc(),
    });
    expect(error).not.toBeNull();
    expect(await fotoDoBanco()).toEqual(antes);
  });

  it("o admin revogado: a action e a RPC recusam", async () => {
    await definirStatus(servico, admin.id, "revogado");
    const antes = await fotoDoBanco();
    expect(await acoes.criarMateria(campos())).toMatchObject({
      ok: false,
      erro: "nao_autorizado",
    });
    const { error } = await admin.cliente.rpc("criar_materia", {
      campos: camposDaRpc(),
    });
    expect(error?.code).toBe("42501");
    expect(await fotoDoBanco()).toEqual(antes);
  });

  it("com o admin desligado (ADMIN_HABILITADO), nem o aprovado cria", async () => {
    vi.stubEnv("ADMIN_HABILITADO", "false");
    try {
      const antes = await fotoDoBanco();
      expect(await acoes.criarMateria(campos())).toMatchObject({
        ok: false,
        erro: "nao_autorizado",
      });
      expect(await fotoDoBanco()).toEqual(antes);
    } finally {
      vi.stubEnv("ADMIN_HABILITADO", "true");
    }
  });
});

describe("previsualizar", () => {
  const PERIGOSO = [
    "Texto com **negrito**.",
    "",
    "<script>alert('xss')</script>",
    "",
    '<img src="x.png" onerror="alert(1)">',
    "",
    "[clique](javascript:alert(2))",
    "",
    '<a href="javascript:alert(3)" onclick="alert(4)">link</a>',
    "",
    '<p onmouseover="alert(5)">passe o mouse</p>',
    "",
  ].join("\n");

  it("o admin recebe o HTML do markdown sem <script>, on* nem javascript:", async () => {
    const resultado = await acoes.previsualizar(PERIGOSO);
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.html).toContain("<strong>negrito</strong>");
    expect(resultado.html).toContain("passe o mouse");
    expect(resultado.html).not.toMatch(/<script/i);
    expect(resultado.html).not.toMatch(/\bon[a-z]+=/i);
    expect(resultado.html).not.toMatch(/javascript:/i);
    expect(resultado.html).not.toContain("alert");
    expect(updateTag).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("o pendente não recebe prévia", async () => {
    comoPendente();
    const resultado = await acoes.previsualizar("**oi**");
    expect(resultado).toMatchObject({ ok: false, erro: "nao_autorizado" });
    expect(resultado).not.toHaveProperty("html");
  });
});
