/**
 * Painel de matérias contra o Supabase local (história 17, critério 7; risco 5 do foco de
 * revisão do plano v2): uma edição não vaza antes de "Publicar alterações" (U9), e o
 * histórico só cresce.
 *
 * As server actions de `src/lib/admin/materias.ts` rodam de verdade: o `cookies()` do
 * Next é um pote em memória com a sessão de um usuário real, e o `updateTag`/`refresh`
 * do Next viram espiões (fora do Next não há cache nem roteador). O que o site lê é
 * conferido com a chave anon e com o repositório do site.
 */
import { createHash } from "node:crypto";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import type { CamposEditoriaisDeEntrada } from "@/lib/admin/tipos";
import { SupabaseArticleRepository } from "@/lib/content/supabase/repository";
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
// Fora do Next não há requisição: o connection() só marca a fase, então aqui resolve.
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
  admin: "painel-admin@exemplo.test",
  pendente: "painel-pendente@exemplo.test",
};

let admin: UsuarioDeTeste;
let pendente: UsuarioDeTeste;
let cookiesDoAdmin: CookieSimples[];
let cookiesDoPendente: CookieSimples[];

const SLUG = "psg-vence-e-respira";
/** CRLF, espaço no fim da linha e acentos: o texto literal do squad. */
const CORPO_DO_SQUAD =
  "O PSG venceu o Lyon por 2 a 1.  \r\n\r\nNo segundo tempo, **Dembélé** decidiu.\r\n";
const DO_SQUAD = {
  slug: SLUG,
  titulo: "PSG vence e respira na Ligue 1",
  titulo_seo: null,
  linha_fina: "Vitória sobre o Lyon",
  editoria: "noticia",
  tags: ["psg", "ligue-1"],
  meta_description: null,
  palavras_chave: [],
  publicado_em: "2026-11-02",
  autor: "Squad Fut",
  ficticio: false,
  origem: "squad-fut/materias/psg-vence/final.md",
  corpo_md: CORPO_DO_SQUAD,
  rotulos: { psg: "PSG", "ligue-1": "Ligue 1" },
};

/** Os campos editoriais da matéria do squad, como a tela de edição mandaria. */
function campos(
  extra: Partial<CamposEditoriaisDeEntrada> = {},
): CamposEditoriaisDeEntrada {
  return {
    titulo: DO_SQUAD.titulo,
    titulo_seo: null,
    linha_fina: DO_SQUAD.linha_fina,
    editoria: "noticia",
    tags: DO_SQUAD.tags,
    meta_description: null,
    palavras_chave: [],
    autor: DO_SQUAD.autor,
    ficticio: false,
    corpo_md: CORPO_DO_SQUAD,
    ...extra,
  };
}

let id = "";

function comoAdmin() {
  pote = poteDeCookies(cookiesDoAdmin);
}
function comoPendente() {
  pote = poteDeCookies(cookiesDoPendente);
}

/** O que o visitante lê, direto pela API e pelo repositório do site. */
async function oQueOSiteMostra() {
  const { data, error } = await anon
    .from("articles")
    .select("titulo,linha_fina,tags,corpo_md,status,publicado_em")
    .eq("slug", SLUG);
  expect(error).toBeNull();
  const materia = await site().getBySlug(SLUG);
  return {
    linha: data,
    pagina: materia && { titulo: materia.titulo, corpo: materia.corpo_md },
  };
}

async function revisoes() {
  const { data, error } = await servico
    .from("article_revisions")
    .select("*")
    .eq("article_id", id)
    .order("numero");
  expect(error).toBeNull();
  return data as Record<string, unknown>[];
}

async function artigo() {
  const { data } = await servico
    .from("articles")
    .select("*")
    .eq("id", id)
    .single();
  return data as Record<string, unknown>;
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

function hash(valor: unknown): string {
  return createHash("sha256").update(JSON.stringify(valor)).digest("hex");
}

beforeAll(async () => {
  const { url, anonKey } = supabaseLocal();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", url);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", anonKey);
  vi.stubEnv("ADMIN_HABILITADO", "true");
  admin = await criarUsuario(servico, {
    email: EMAILS.admin,
    status: "aprovado",
    metadados: { full_name: "Admin do Painel" },
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
  id = envio.data as string;
  const publicacao = await servico.rpc("publicar_revisao", {
    p_article_id: id,
  });
  expect(publicacao.error).toBeNull();
  comoAdmin();
});

describe("salvar (U9)", () => {
  it("salvar não muda o que o anon lê; só a revisão em edição anda", async () => {
    const antes = await oQueOSiteMostra();
    const linhaAntes = await artigo();

    const resultado = await acoes.salvarRevisao(
      id,
      campos({ titulo: "PSG atropela o Lyon", corpo_md: "Texto novo.\n" }),
    );
    expect(resultado).toEqual({ ok: true, numero: 2 });

    expect(await oQueOSiteMostra()).toEqual(antes);
    const linhaDepois = await artigo();
    const { revisao_em_edicao, updated_at, ...resto } = linhaDepois;
    expect(revisao_em_edicao).toBe(2);
    const {
      revisao_em_edicao: _emEdicaoAntes,
      updated_at: _atualizadoAntes,
      ...restoAntes
    } = linhaAntes;
    expect(resto).toEqual(restoAntes);
    expect(updated_at).not.toBe(_atualizadoAntes);
    expect(_emEdicaoAntes).toBe(1);
    // Salvar não invalida o cache do site, só atualiza a tela do painel.
    expect(updateTag).not.toHaveBeenCalled();
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("a revisão nova é do painel, assinada por quem salvou, com a data editorial da matéria", async () => {
    await acoes.salvarRevisao(id, campos({ titulo: "Outro título" }));
    const nova = (await revisoes())[1];
    expect(nova).toMatchObject({
      numero: 2,
      titulo: "Outro título",
      origem_da_revisao: "painel",
      autor_id: admin.id,
      publicado_em: DO_SQUAD.publicado_em,
    });
  });

  it("o CRLF do formulário vira LF na revisão nova; a revisão 1 fica com o CRLF original", async () => {
    await acoes.salvarRevisao(
      id,
      campos({ corpo_md: "Linha um.\r\nLinha dois.\r\n" }),
    );
    const [primeira, segunda] = await revisoes();
    expect(primeira.corpo_md).toBe(CORPO_DO_SQUAD);
    expect(segunda.corpo_md).toBe("Linha um.\nLinha dois.\n");
  });

  it("salvar sem mudar nada não cria revisão", async () => {
    const primeira = await acoes.salvarRevisao(id, campos({ titulo: "Novo" }));
    const segunda = await acoes.salvarRevisao(id, campos({ titulo: "Novo" }));
    expect(primeira).toEqual({ ok: true, numero: 2 });
    expect(segunda).toEqual({ ok: true, numero: 2 });
    expect(await revisoes()).toHaveLength(2);
  });

  it("dois salvamentos ao mesmo tempo viram duas revisões, sem sobrescrever o número", async () => {
    const resultados = await Promise.all([
      acoes.salvarRevisao(id, campos({ titulo: "Versão A" })),
      acoes.salvarRevisao(id, campos({ titulo: "Versão B" })),
    ]);
    const numeros = resultados.map((r) => (r.ok ? r.numero : r.erro)).sort();
    expect(numeros).toEqual([2, 3]);
    const titulos = (await revisoes()).map((r) => r.titulo);
    expect(titulos.slice(1).sort()).toEqual(["Versão A", "Versão B"]);
    expect((await artigo()).revisao_em_edicao).toBe(3);
  });

  it("campos inválidos: recusa com os problemas, nada é gravado", async () => {
    const antes = await fotoDoBanco();
    const resultado = await acoes.salvarRevisao(id, {
      ...campos({ titulo: " ", tags: ["Com Espaço"] }),
      slug: "outro-slug",
    } as never);
    expect(resultado).toMatchObject({ ok: false, erro: "campos_invalidos" });
    if (!resultado.ok) {
      expect(resultado.problemas).toEqual(
        expect.arrayContaining([
          expect.stringContaining('campo "titulo"'),
          expect.stringContaining('campo "tags[0]"'),
          'campo desconhecido "slug"',
        ]),
      );
    }
    expect(await fotoDoBanco()).toEqual(antes);
  });

  it("matéria real do squad sem origem não pode deixar de ser fictícia", async () => {
    const ficticia = await servico.rpc("enviar_materia_do_squad", {
      dados: { ...DO_SQUAD, slug: "exemplo", ficticio: true, origem: null },
    });
    expect(ficticia.error).toBeNull();
    const antes = await fotoDoBanco();
    const resultado = await acoes.salvarRevisao(
      ficticia.data as string,
      campos({ ficticio: false }),
    );
    expect(resultado).toMatchObject({ ok: false, erro: "origem_obrigatoria" });
    expect(await fotoDoBanco()).toEqual(antes);
  });

  it("id inválido ou inexistente: recusa clara, nada é gravado", async () => {
    const antes = await fotoDoBanco();
    expect(await acoes.salvarRevisao("abc", campos())).toMatchObject({
      ok: false,
      erro: "id_invalido",
    });
    expect(
      await acoes.salvarRevisao(
        "00000000-0000-4000-8000-000000000999",
        campos(),
      ),
    ).toMatchObject({ ok: false, erro: "materia_inexistente" });
    expect(await fotoDoBanco()).toEqual(antes);
  });
});

describe("publicar (U9)", () => {
  it("publicar muda o que o anon lê, mantém a data editorial e expira o cache", async () => {
    await acoes.salvarRevisao(
      id,
      campos({ titulo: "PSG atropela o Lyon", corpo_md: "Texto novo.\n" }),
    );
    const resultado = await acoes.publicarAlteracoes(id);
    expect(resultado).toEqual({ ok: true, slug: SLUG });

    const depois = await oQueOSiteMostra();
    expect(depois.linha).toEqual([
      {
        titulo: "PSG atropela o Lyon",
        linha_fina: DO_SQUAD.linha_fina,
        tags: DO_SQUAD.tags,
        corpo_md: "Texto novo.\n",
        status: "publicado",
        publicado_em: DO_SQUAD.publicado_em,
      },
    ]);
    expect(depois.pagina).toEqual({
      titulo: "PSG atropela o Lyon",
      corpo: "Texto novo.\n",
    });
    expect((await artigo()).revisao_publicada).toBe(2);
    expect(updateTag.mock.calls).toEqual([["materias"], [`materia:${SLUG}`]]);
  });

  it("matéria inexistente: recusa, sem mexer no cache", async () => {
    const resultado = await acoes.publicarAlteracoes(
      "00000000-0000-4000-8000-000000000999",
    );
    expect(resultado).toMatchObject({ ok: false, erro: "materia_inexistente" });
    expect(updateTag).not.toHaveBeenCalled();
  });
});

describe("despublicar", () => {
  it("tira a matéria do anon, mantém revisao_publicada e o histórico, e expira o cache", async () => {
    const revisoesAntes = await revisoes();
    const resultado = await acoes.despublicar(id);
    expect(resultado).toEqual({ ok: true, slug: SLUG });

    expect(await oQueOSiteMostra()).toEqual({ linha: [], pagina: null });
    const linha = await artigo();
    expect(linha.status).toBe("rascunho");
    expect(linha.revisao_publicada).toBe(1);
    expect(await revisoes()).toEqual(revisoesAntes);
    expect(updateTag.mock.calls).toEqual([["materias"], [`materia:${SLUG}`]]);
  });

  it("publicar de novo volta a matéria ao site com a mesma data editorial", async () => {
    await acoes.despublicar(id);
    expect(await acoes.publicarAlteracoes(id)).toEqual({
      ok: true,
      slug: SLUG,
    });
    const { linha } = await oQueOSiteMostra();
    expect(linha).toMatchObject([
      { status: "publicado", publicado_em: DO_SQUAD.publicado_em },
    ]);
  });
});

describe("restaurar", () => {
  it("cria a revisão N+1 com o conteúdo da antiga e mantém as N anteriores", async () => {
    await acoes.salvarRevisao(id, campos({ titulo: "Versão 2" }));
    await acoes.salvarRevisao(id, campos({ titulo: "Versão 3" }));
    const antes = await revisoes();
    expect(antes).toHaveLength(3);

    const resultado = await acoes.restaurarRevisao(id, 1);
    expect(resultado).toEqual({ ok: true, numero: 4 });

    const depois = await revisoes();
    expect(depois).toHaveLength(4);
    expect(depois.slice(0, 3)).toEqual(antes);
    const campos1 = (r: Record<string, unknown>) => ({
      titulo: r.titulo,
      titulo_seo: r.titulo_seo,
      linha_fina: r.linha_fina,
      editoria: r.editoria,
      tags: r.tags,
      meta_description: r.meta_description,
      palavras_chave: r.palavras_chave,
      autor: r.autor,
      ficticio: r.ficticio,
    });
    expect(campos1(depois[3])).toEqual(campos1(antes[0]));
    expect(depois[3]).toMatchObject({
      numero: 4,
      origem_da_revisao: "painel",
      autor_id: admin.id,
    });
    expect((await artigo()).revisao_em_edicao).toBe(4);
    // Restaurar não publica: o site continua na revisão 1.
    expect((await artigo()).revisao_publicada).toBe(1);
    expect(updateTag).not.toHaveBeenCalled();
  });

  it("revisão que não existe: recusa, nada é gravado", async () => {
    const antes = await fotoDoBanco();
    expect(await acoes.restaurarRevisao(id, 9)).toMatchObject({
      ok: false,
      erro: "revisao_inexistente",
    });
    expect(await acoes.restaurarRevisao(id, 0)).toMatchObject({
      ok: false,
      erro: "id_invalido",
    });
    expect(await fotoDoBanco()).toEqual(antes);
  });
});

describe("a revisão 1 do squad é intocável", () => {
  it("o hash da revisão 1 não muda depois de 3 edições, 1 restauração e 1 publicação", async () => {
    const [original] = await revisoes();
    expect(original.corpo_md).toBe(CORPO_DO_SQUAD);
    const hashDoOriginal = hash(original);

    await acoes.salvarRevisao(id, campos({ corpo_md: "Edição 1.\n" }));
    await acoes.salvarRevisao(id, campos({ titulo: "Edição 2" }));
    await acoes.salvarRevisao(
      id,
      campos({ corpo_md: "Edição 3.\n", tags: ["psg"] }),
    );
    await acoes.restaurarRevisao(id, 2);
    await acoes.publicarAlteracoes(id);

    const depois = await revisoes();
    expect(depois.map((r) => r.numero)).toEqual([1, 2, 3, 4, 5]);
    expect(hash(depois[0])).toBe(hashDoOriginal);
    expect(depois[0]).toMatchObject({
      numero: 1,
      origem_da_revisao: "squad",
      autor_id: null,
      corpo_md: CORPO_DO_SQUAD,
    });
  });

  it("update e delete em article_revisions falham até para o admin", async () => {
    const antes = await revisoes();
    const alteracao = await admin.cliente
      .from("article_revisions")
      .update({ corpo_md: "reescrito" })
      .eq("article_id", id)
      .select("id");
    if (alteracao.error === null) expect(alteracao.data).toEqual([]);
    const remocao = await admin.cliente
      .from("article_revisions")
      .delete()
      .eq("article_id", id)
      .select("id");
    if (remocao.error === null) expect(remocao.data).toEqual([]);
    expect(await revisoes()).toEqual(antes);
  });
});

describe("quem não é admin não grava nada", () => {
  it("o pendente chamando as actions: nao_autorizado e o banco igual", async () => {
    comoPendente();
    const antes = await fotoDoBanco();
    for (const [nome, chamar] of [
      ["listar", () => acoes.listarMateriasDoPainel({})],
      ["salvar", () => acoes.salvarRevisao(id, campos({ titulo: "Invasão" }))],
      ["publicar", () => acoes.publicarAlteracoes(id)],
      ["despublicar", () => acoes.despublicar(id)],
      ["restaurar", () => acoes.restaurarRevisao(id, 1)],
    ] as const) {
      const resultado = await chamar();
      expect(resultado, nome).toMatchObject({
        ok: false,
        erro: "nao_autorizado",
      });
    }
    expect(await fotoDoBanco()).toEqual(antes);
    expect(updateTag).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("o pendente chamando as RPCs direto, com o próprio JWT: erro e o banco igual", async () => {
    const antes = await fotoDoBanco();
    for (const [funcao, args] of [
      [
        "salvar_revisao",
        { p_article_id: id, campos: { ...campos({ titulo: "Invasão" }) } },
      ],
      ["publicar_revisao", { p_article_id: id }],
      ["despublicar_materia", { p_article_id: id }],
    ] as const) {
      const { error } = await pendente.cliente.rpc(funcao, args);
      expect(error?.code, funcao).toBe("42501");
    }
    expect(await fotoDoBanco()).toEqual(antes);
  });

  it("o admin revogado depois de abrir a página: a action recusa", async () => {
    await definirStatus(servico, admin.id, "revogado");
    const antes = await fotoDoBanco();
    expect(
      await acoes.salvarRevisao(id, campos({ titulo: "Tarde demais" })),
    ).toMatchObject({ ok: false, erro: "nao_autorizado" });
    expect(await acoes.despublicar(id)).toMatchObject({
      ok: false,
      erro: "nao_autorizado",
    });
    expect(await fotoDoBanco()).toEqual(antes);
  });

  it("com o admin desligado (ADMIN_HABILITADO), nem o aprovado grava", async () => {
    vi.stubEnv("ADMIN_HABILITADO", "false");
    try {
      const antes = await fotoDoBanco();
      expect(await acoes.publicarAlteracoes(id)).toMatchObject({
        ok: false,
        erro: "nao_autorizado",
      });
      expect(await fotoDoBanco()).toEqual(antes);
    } finally {
      vi.stubEnv("ADMIN_HABILITADO", "true");
    }
  });
});

describe("lista do painel", () => {
  it("mostra rascunhos e publicadas, com o título em edição e o aviso de alterações não publicadas", async () => {
    const rascunho = await servico.rpc("enviar_materia_do_squad", {
      dados: {
        ...DO_SQUAD,
        slug: "rascunho-novo",
        titulo: "Rascunho novo",
        editoria: "cronica",
        ficticio: true,
        origem: null,
      },
    });
    expect(rascunho.error).toBeNull();
    await acoes.salvarRevisao(id, campos({ titulo: "Título em edição" }));

    const todas = await acoes.listarMateriasDoPainel({});
    expect(todas.ok).toBe(true);
    if (!todas.ok) return;
    const porSlug = Object.fromEntries(todas.materias.map((m) => [m.slug, m]));
    expect(porSlug[SLUG]).toMatchObject({
      id,
      titulo: "Título em edição",
      tituloPublicado: DO_SQUAD.titulo,
      status: "publicado",
      fonte: "squad",
      editoria: "noticia",
      revisaoPublicada: 1,
      revisaoEmEdicao: 2,
      alteracoesNaoPublicadas: true,
    });
    expect(porSlug["rascunho-novo"]).toMatchObject({
      titulo: "Rascunho novo",
      tituloPublicado: null,
      status: "rascunho",
      alteracoesNaoPublicadas: false,
    });
    // A gravada mais recentemente vem primeiro.
    expect(todas.materias.map((m) => m.slug)).toEqual([SLUG, "rascunho-novo"]);
  });

  it("filtra por status, editoria e fonte; filtro desconhecido é recusado", async () => {
    await servico.rpc("enviar_materia_do_squad", {
      dados: {
        ...DO_SQUAD,
        slug: "cronica-rascunho",
        editoria: "cronica",
        ficticio: true,
        origem: null,
      },
    });
    const slugs = async (filtros: object) => {
      const r = await acoes.listarMateriasDoPainel(filtros as never);
      expect(r.ok, JSON.stringify(filtros)).toBe(true);
      return r.ok ? r.materias.map((m) => m.slug).sort() : [];
    };
    expect(await slugs({ status: "rascunho" })).toEqual(["cronica-rascunho"]);
    expect(await slugs({ status: "publicado" })).toEqual([SLUG]);
    expect(await slugs({ editoria: "cronica" })).toEqual(["cronica-rascunho"]);
    expect(await slugs({ fonte: "squad" })).toEqual(["cronica-rascunho", SLUG]);
    expect(await slugs({ fonte: "painel" })).toEqual([]);
    expect(
      await acoes.listarMateriasDoPainel({ status: "lixo" } as never),
    ).toMatchObject({ ok: false, erro: "filtros_invalidos" });
  });
});
