/**
 * RLS do admin (história 16, critério 8; risco 1 do foco de revisão do plano v2).
 *
 * Uma conta Google qualquer (pendente, recusada ou revogada) chamando a API direto com o
 * próprio JWT não lê rascunho e não grava nada. Na história 17, `publicar_revisao`,
 * `despublicar_materia` e `salvar_revisao` passam a ser executáveis por `authenticated`,
 * e a primeira linha de cada uma recusa quem não é admin. Só o aprovado lê e grava matérias, e
 * nem ele muda o próprio status nem altera ou apaga revisões.
 *
 * Os usuários são reais no Supabase local (`auth.admin.createUser` + `signInWithPassword`).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  clienteAnonimo,
  clienteDeServico,
  limparBanco,
} from "./helpers/supabase-local";
import {
  apagarUsuarios,
  criarUsuario,
  definirStatus,
  type UsuarioDeTeste,
} from "./helpers/usuarios";

const servico = clienteDeServico();
const anon = clienteAnonimo();

const EMAILS = {
  pendente: "rls-pendente@exemplo.test",
  aprovado: "rls-aprovado@exemplo.test",
  recusado: "rls-recusado@exemplo.test",
  revogado: "rls-revogado@exemplo.test",
  alvo: "rls-alvo@exemplo.test",
} as const;

const BASE = {
  linha_fina: "Linha fina de teste",
  editoria: "noticia",
  publicado_em: "2026-11-01",
  autor: "Squad Fut",
  ficticio: true,
  fonte: "importacao",
};

let pendente: UsuarioDeTeste;
let aprovado: UsuarioDeTeste;
let recusado: UsuarioDeTeste;
let revogado: UsuarioDeTeste;
let alvo: UsuarioDeTeste;
let idDoRascunho = "";

/** Quem não é admin: o anon e as contas logadas sem aprovação. */
function naoAdmins(): [string, SupabaseClient][] {
  return [
    ["anon", anon],
    ["pendente", pendente.cliente],
    ["recusado", recusado.cliente],
    ["revogado", revogado.cliente],
  ];
}

/** Tudo que a tentativa poderia ter mudado, lido pela service_role. */
async function fotoDoBanco() {
  const [articles, revisoes, tags, perfis] = await Promise.all([
    servico.from("articles").select("*").order("slug"),
    servico.from("article_revisions").select("*").order("numero"),
    servico.from("tags").select("*").order("slug"),
    servico.from("perfis").select("*").order("user_id"),
  ]);
  return {
    articles: articles.data,
    revisoes: revisoes.data,
    tags: tags.data,
    perfis: perfis.data,
  };
}

/** "0 linhas ou erro": a escrita não aconteceu, de um jeito ou de outro. */
function semEfeito(resposta: { data: unknown; error: unknown }, nome: string) {
  if (resposta.error === null) {
    expect(resposta.data ?? [], nome).toEqual([]);
  }
}

function revisao(numero: number, extra: Record<string, unknown> = {}) {
  return {
    article_id: idDoRascunho,
    numero,
    titulo: "Revisão do painel",
    linha_fina: BASE.linha_fina,
    editoria: BASE.editoria,
    tags: ["tag-do-rascunho"],
    publicado_em: BASE.publicado_em,
    autor: BASE.autor,
    ficticio: true,
    corpo_md: "Texto revisado.\n",
    origem_da_revisao: "painel",
    ...extra,
  };
}

beforeAll(async () => {
  await limparBanco(servico);
  const { error: erroDasTags } = await servico.from("tags").insert([
    { slug: "tag-publica", rotulo: "Tag Pública" },
    { slug: "tag-do-rascunho", rotulo: "Tag do Rascunho" },
  ]);
  expect(erroDasTags).toBeNull();
  const { data, error } = await servico
    .from("articles")
    .insert([
      {
        ...BASE,
        slug: "rascunho-do-admin",
        titulo: "Rascunho do admin",
        tags: ["tag-do-rascunho"],
        corpo_md: "Segredo de rascunho.\n",
        status: "rascunho",
      },
      {
        ...BASE,
        slug: "materia-no-ar",
        titulo: "Matéria no ar",
        tags: ["tag-publica"],
        corpo_md: "Texto público.\n",
        status: "publicado",
        revisao_publicada: 1,
      },
    ])
    .select("id,slug");
  expect(error).toBeNull();
  idDoRascunho = data!.find((m) => m.slug === "rascunho-do-admin")!.id;
  const { error: erroDaRevisao } = await servico
    .from("article_revisions")
    .insert(
      revisao(1, { titulo: "Rascunho do admin", origem_da_revisao: "squad" }),
    );
  expect(erroDaRevisao).toBeNull();

  pendente = await criarUsuario(servico, {
    email: EMAILS.pendente,
    metadados: {
      full_name: "Pendente de Teste",
      avatar_url: "https://exemplo.test/pendente.png",
    },
  });
  aprovado = await criarUsuario(servico, {
    email: EMAILS.aprovado,
    status: "aprovado",
    metadados: {
      name: "Aprovada de Teste",
      picture: "https://exemplo.test/aprovada.png",
    },
  });
  recusado = await criarUsuario(servico, {
    email: EMAILS.recusado,
    status: "recusado",
  });
  revogado = await criarUsuario(servico, {
    email: EMAILS.revogado,
    status: "revogado",
  });
  alvo = await criarUsuario(servico, { email: EMAILS.alvo });
});

afterAll(async () => {
  await apagarUsuarios(servico, Object.values(EMAILS));
});

describe("trigger em auth.users", () => {
  it("cria o perfil pendente com nome e avatar (full_name e avatar_url)", async () => {
    const { data } = await servico
      .from("perfis")
      .select("email,nome,avatar_url,status,papel,decidido_por,decidido_em")
      .eq("user_id", pendente.id)
      .single();
    expect(data).toEqual({
      email: EMAILS.pendente,
      nome: "Pendente de Teste",
      avatar_url: "https://exemplo.test/pendente.png",
      status: "pendente",
      papel: "admin",
      decidido_por: null,
      decidido_em: null,
    });
  });

  it("aceita os nomes alternativos do Google (name e picture)", async () => {
    const { data } = await servico
      .from("perfis")
      .select("nome,avatar_url")
      .eq("user_id", aprovado.id)
      .single();
    expect(data).toEqual({
      nome: "Aprovada de Teste",
      avatar_url: "https://exemplo.test/aprovada.png",
    });
  });

  it("sem metadados, nome e avatar ficam nulos e o perfil é criado mesmo assim", async () => {
    const { data } = await servico
      .from("perfis")
      .select("nome,avatar_url,status")
      .eq("user_id", alvo.id)
      .single();
    expect(data).toEqual({ nome: null, avatar_url: null, status: "pendente" });
  });

  it("apagar o usuário apaga o perfil (on delete cascade)", async () => {
    const temporario = await criarUsuario(servico, {
      email: "rls-temporario@exemplo.test",
    });
    await apagarUsuarios(servico, [temporario.email]);
    const { data } = await servico
      .from("perfis")
      .select("user_id")
      .eq("user_id", temporario.id);
    expect(data).toEqual([]);
  });
});

describe("leitura de matérias", () => {
  it("só o aprovado lê o rascunho", async () => {
    for (const [nome, cliente] of naoAdmins()) {
      const { data, error } = await cliente
        .from("articles")
        .select("slug")
        .order("slug");
      expect(error, nome).toBeNull();
      expect(data, nome).toEqual([{ slug: "materia-no-ar" }]);
    }
    const { data, error } = await aprovado.cliente
      .from("articles")
      .select("slug")
      .order("slug");
    expect(error).toBeNull();
    expect(data).toEqual([
      { slug: "materia-no-ar" },
      { slug: "rascunho-do-admin" },
    ]);
  });

  it("só o aprovado lê article_revisions", async () => {
    for (const [nome, cliente] of naoAdmins()) {
      const resposta = await cliente.from("article_revisions").select("id");
      semEfeito(resposta, nome);
    }
    const { data, error } = await aprovado.cliente
      .from("article_revisions")
      .select("numero");
    expect(error).toBeNull();
    expect(data).toEqual([{ numero: 1 }]);
  });
});

describe("escrita em articles", () => {
  it("quem não é admin não insere", async () => {
    for (const [nome, cliente] of naoAdmins()) {
      const antes = await fotoDoBanco();
      const { error } = await cliente.from("articles").insert({
        ...BASE,
        slug: `invasora-${nome}`,
        titulo: "Invasora",
        tags: ["tag-publica"],
        corpo_md: "x",
        status: "publicado",
        revisao_publicada: 1,
      });
      expect(error, nome).not.toBeNull();
      expect(await fotoDoBanco(), nome).toEqual(antes);
    }
  });

  it("quem não é admin não altera nem o rascunho nem a publicada", async () => {
    for (const [nome, cliente] of naoAdmins()) {
      for (const slug of ["rascunho-do-admin", "materia-no-ar"]) {
        const antes = await fotoDoBanco();
        const resposta = await cliente
          .from("articles")
          .update({ titulo: "Alterado", status: "publicado" })
          .eq("slug", slug)
          .select("slug");
        semEfeito(resposta, `${nome} → ${slug}`);
        expect(await fotoDoBanco(), `${nome} → ${slug}`).toEqual(antes);
      }
    }
  });

  it("o aprovado insere e altera matérias", async () => {
    const insercao = await aprovado.cliente
      .from("articles")
      .insert({
        ...BASE,
        slug: "nova-do-painel",
        titulo: "Nova do painel",
        tags: ["tag-do-rascunho"],
        corpo_md: "Corpo novo.\n",
        status: "rascunho",
        fonte: "painel",
      })
      .select("slug,status");
    expect(insercao.error).toBeNull();
    expect(insercao.data).toEqual([
      { slug: "nova-do-painel", status: "rascunho" },
    ]);

    const alteracao = await aprovado.cliente
      .from("articles")
      .update({ titulo: "Rascunho do admin (editado)" })
      .eq("id", idDoRascunho)
      .select("titulo");
    expect(alteracao.error).toBeNull();
    expect(alteracao.data).toEqual([{ titulo: "Rascunho do admin (editado)" }]);
  });

  it("ninguém apaga matéria, nem o aprovado", async () => {
    for (const [nome, cliente] of [
      ...naoAdmins(),
      ["aprovado", aprovado.cliente] as [string, SupabaseClient],
    ]) {
      const antes = await fotoDoBanco();
      const resposta = await cliente
        .from("articles")
        .delete()
        .eq("slug", "materia-no-ar")
        .select("slug");
      semEfeito(resposta, nome);
      expect(await fotoDoBanco(), nome).toEqual(antes);
    }
  });
});

describe("article_revisions: só inserção, e só do painel", () => {
  it("quem não é admin não insere revisão", async () => {
    for (const [nome, cliente] of naoAdmins()) {
      const antes = await fotoDoBanco();
      const { error } = await cliente
        .from("article_revisions")
        .insert(revisao(5));
      expect(error, nome).not.toBeNull();
      expect(await fotoDoBanco(), nome).toEqual(antes);
    }
  });

  it("o aprovado insere a revisão do painel assinada por ele", async () => {
    const { data, error } = await aprovado.cliente
      .from("article_revisions")
      .insert(revisao(2, { autor_id: aprovado.id }))
      .select("numero,autor_id,origem_da_revisao");
    expect(error).toBeNull();
    expect(data).toEqual([
      { numero: 2, autor_id: aprovado.id, origem_da_revisao: "painel" },
    ]);
  });

  it("o aprovado não forja revisão do squad nem assina por outro", async () => {
    for (const [nome, extra] of [
      ["origem squad", { origem_da_revisao: "squad", autor_id: null }],
      ["origem importacao", { origem_da_revisao: "importacao" }],
      ["sem autor", { autor_id: null }],
      ["autor de outro", { autor_id: alvo.id }],
    ] as const) {
      const antes = await fotoDoBanco();
      const assinada: Record<string, unknown> = { autor_id: aprovado.id };
      const { error } = await aprovado.cliente
        .from("article_revisions")
        .insert(revisao(9, { ...assinada, ...extra }));
      expect(error, nome).not.toBeNull();
      expect(await fotoDoBanco(), nome).toEqual(antes);
    }
  });

  it("ninguém altera nem apaga revisão, nem o aprovado", async () => {
    for (const [nome, cliente] of [
      ...naoAdmins(),
      ["aprovado", aprovado.cliente] as [string, SupabaseClient],
    ]) {
      const antes = await fotoDoBanco();
      const alteracao = await cliente
        .from("article_revisions")
        .update({ corpo_md: "reescrito" })
        .eq("article_id", idDoRascunho)
        .select("id");
      semEfeito(alteracao, `${nome} update`);
      const remocao = await cliente
        .from("article_revisions")
        .delete()
        .eq("article_id", idDoRascunho)
        .select("id");
      semEfeito(remocao, `${nome} delete`);
      expect(await fotoDoBanco(), nome).toEqual(antes);
    }
  });
});

describe("perfis", () => {
  it("o pendente, o recusado e o revogado leem só o próprio perfil", async () => {
    for (const usuario of [pendente, recusado, revogado]) {
      const { data, error } = await usuario.cliente
        .from("perfis")
        .select("user_id,status");
      expect(error, usuario.email).toBeNull();
      expect(
        (data ?? []).map((p) => p.user_id),
        usuario.email,
      ).toEqual([usuario.id]);
    }
  });

  it("o anon não lê perfil nenhum", async () => {
    semEfeito(await anon.from("perfis").select("user_id"), "anon");
  });

  it("o aprovado lê todos os perfis", async () => {
    const { data, error } = await aprovado.cliente
      .from("perfis")
      .select("user_id");
    expect(error).toBeNull();
    const ids = (data ?? []).map((p) => p.user_id);
    for (const usuario of [pendente, aprovado, recusado, revogado, alvo]) {
      expect(ids).toContain(usuario.id);
    }
  });

  it("ninguém muda o próprio status, nem o aprovado", async () => {
    for (const [usuario, novo] of [
      [pendente, "aprovado"],
      [recusado, "aprovado"],
      [revogado, "aprovado"],
      [aprovado, "revogado"],
    ] as const) {
      const antes = await fotoDoBanco();
      const resposta = await usuario.cliente
        .from("perfis")
        .update({
          status: novo,
          decidido_por: usuario.id,
          decidido_em: new Date().toISOString(),
        })
        .eq("user_id", usuario.id)
        .select("status");
      semEfeito(resposta, usuario.email);
      expect(await fotoDoBanco(), usuario.email).toEqual(antes);
    }
  });

  it("pendente, recusado e revogado não mudam o status de outro (0 linhas ou erro)", async () => {
    for (const [nome, cliente] of naoAdmins()) {
      const antes = await fotoDoBanco();
      const resposta = await cliente
        .from("perfis")
        .update({
          status: "aprovado",
          decidido_por: alvo.id,
          decidido_em: new Date().toISOString(),
        })
        .eq("user_id", alvo.id)
        .select("status");
      semEfeito(resposta, nome);
      expect(await fotoDoBanco(), nome).toEqual(antes);
    }
  });

  it("o aprovado muda o status de outro usuário, assinando a decisão", async () => {
    const decididoEm = new Date().toISOString();
    const { data, error } = await aprovado.cliente
      .from("perfis")
      .update({
        status: "recusado",
        decidido_por: aprovado.id,
        decidido_em: decididoEm,
      })
      .eq("user_id", alvo.id)
      .select("status,decidido_por");
    expect(error).toBeNull();
    expect(data).toEqual([{ status: "recusado", decidido_por: aprovado.id }]);
    await definirStatus(servico, alvo.id, "pendente");
  });

  it("o aprovado não assina a decisão em nome de outro", async () => {
    const antes = await fotoDoBanco();
    const { error } = await aprovado.cliente
      .from("perfis")
      .update({
        status: "aprovado",
        decidido_por: alvo.id,
        decidido_em: new Date().toISOString(),
      })
      .eq("user_id", alvo.id)
      .select("status");
    expect(error).not.toBeNull();
    expect(await fotoDoBanco()).toEqual(antes);
  });

  it("o aprovado não muda e-mail, nome, papel nem created_at de ninguém", async () => {
    for (const campos of [
      { email: "trocado@exemplo.test" },
      { nome: "Outro nome" },
      { papel: "admin" },
      { created_at: "2020-01-01T00:00:00Z" },
    ]) {
      const antes = await fotoDoBanco();
      const { error } = await aprovado.cliente
        .from("perfis")
        .update(campos)
        .eq("user_id", alvo.id)
        .select("user_id");
      expect(error, JSON.stringify(campos)).not.toBeNull();
      expect(await fotoDoBanco(), JSON.stringify(campos)).toEqual(antes);
    }
  });

  it("ninguém insere nem apaga perfil pela API, nem o aprovado", async () => {
    for (const [nome, cliente] of [
      ...naoAdmins(),
      ["aprovado", aprovado.cliente] as [string, SupabaseClient],
    ]) {
      const antes = await fotoDoBanco();
      const insercao = await cliente
        .from("perfis")
        .insert({ user_id: alvo.id, status: "aprovado" });
      expect(insercao.error, `${nome} insert`).not.toBeNull();
      const remocao = await cliente
        .from("perfis")
        .delete()
        .eq("user_id", alvo.id)
        .select("user_id");
      semEfeito(remocao, `${nome} delete`);
      expect(await fotoDoBanco(), nome).toEqual(antes);
    }
  });
});

describe("funções", () => {
  it("eh_admin: verdadeira só para o aprovado; o anon não executa", async () => {
    expect(await aprovado.cliente.rpc("eh_admin")).toMatchObject({
      data: true,
      error: null,
    });
    for (const usuario of [pendente, recusado, revogado]) {
      expect(
        await usuario.cliente.rpc("eh_admin"),
        usuario.email,
      ).toMatchObject({ data: false, error: null });
    }
    const doAnon = await anon.rpc("eh_admin");
    expect(doAnon.error).not.toBeNull();
  });

  it("authenticated (mesmo aprovado) não executa as funções internas", async () => {
    const internas: [string, Record<string, unknown>][] = [
      ["normalizar_busca", { texto: "São Paulo" }],
      [
        "calcular_busca_normalizada",
        { p_titulo: "a", p_linha_fina: "b", p_tags: ["c"], p_corpo: "d" },
      ],
      ["enviar_materia_do_squad", { dados: { slug: "x" } }],
      [
        "configurar_revalidacao",
        {
          p_url: "http://exemplo.test/api/revalidar",
          p_segredo: "segredo-de-teste-123456",
        },
      ],
      ["remover_revalidacao", {}],
      ["avisar_revalidacao", {}],
      ["articles_antes_de_gravar", {}],
      ["tags_depois_de_gravar", {}],
      ["criar_perfil_do_usuario", {}],
    ];
    for (const usuario of [aprovado, pendente, recusado, revogado]) {
      const antes = await fotoDoBanco();
      for (const [funcao, args] of internas) {
        const { data, error } = await usuario.cliente.rpc(funcao, args);
        expect(error, `${usuario.email} ${funcao}`).not.toBeNull();
        expect(data, `${usuario.email} ${funcao}`).toBeNull();
      }
      expect(await fotoDoBanco(), usuario.email).toEqual(antes);
    }
  });

  it("as funções com argumentos falham por permissão (42501), não por outro motivo", async () => {
    // Pendente do PR #16: o pendente também, e não só o aprovado.
    for (const usuario of [aprovado, pendente]) {
      for (const [funcao, args] of [
        ["normalizar_busca", { texto: "x" }],
        [
          "calcular_busca_normalizada",
          { p_titulo: "a", p_linha_fina: "b", p_tags: ["c"], p_corpo: "d" },
        ],
        ["enviar_materia_do_squad", { dados: { slug: "x" } }],
        [
          "configurar_revalidacao",
          {
            p_url: "http://exemplo.test/api/revalidar",
            p_segredo: "segredo-de-teste-123456",
          },
        ],
      ] as const) {
        const { error } = await usuario.cliente.rpc(funcao, args);
        expect(error?.code, `${usuario.email} ${funcao}`).toBe("42501");
      }
    }
  });

  describe("as funções do painel (história 17): abertas a authenticated, mas só o aprovado grava", () => {
    let idParaPublicar = "";
    const DO_PAINEL = () =>
      [
        ["publicar_revisao", { p_article_id: idParaPublicar }],
        ["despublicar_materia", { p_article_id: idParaPublicar }],
        [
          "salvar_revisao",
          {
            p_article_id: idParaPublicar,
            campos: {
              titulo: "Invasão",
              linha_fina: "x",
              editoria: "noticia",
              tags: ["tag-publica"],
              autor: "x",
              ficticio: true,
              corpo_md: "x",
            },
          },
        ],
      ] as const;

    beforeAll(async () => {
      const { data, error } = await servico
        .from("articles")
        .insert({
          ...BASE,
          slug: "publicada-pelo-admin",
          titulo: "Publicada pelo admin",
          tags: ["tag-publica"],
          corpo_md: "Texto que o admin publica.\n",
          status: "rascunho",
        })
        .select("id")
        .single();
      expect(error).toBeNull();
      idParaPublicar = data!.id;
      const { error: erroDaRevisao } = await servico
        .from("article_revisions")
        .insert({
          ...revisao(1, {
            titulo: "Publicada pelo admin",
            tags: ["tag-publica"],
            corpo_md: "Texto que o admin publica.\n",
            origem_da_revisao: "importacao",
          }),
          article_id: idParaPublicar,
        });
      expect(erroDaRevisao).toBeNull();
    });

    it("anon, pendente, recusado e revogado recebem erro (42501) e nada muda", async () => {
      for (const [nome, cliente] of naoAdmins()) {
        for (const [funcao, args] of DO_PAINEL()) {
          const antes = await fotoDoBanco();
          const { data, error } = await cliente.rpc(funcao, args);
          expect(error?.code, `${nome} ${funcao}`).toBe("42501");
          expect(data, `${nome} ${funcao}`).toBeNull();
          expect(await fotoDoBanco(), `${nome} ${funcao}`).toEqual(antes);
        }
      }
    });

    it("o aprovado publica, e o anon passa a ler a matéria", async () => {
      const { error } = await aprovado.cliente.rpc("publicar_revisao", {
        p_article_id: idParaPublicar,
      });
      expect(error).toBeNull();
      const { data } = await anon
        .from("articles")
        .select("slug,status,revisao_publicada")
        .eq("id", idParaPublicar);
      expect(data).toEqual([
        {
          slug: "publicada-pelo-admin",
          status: "publicado",
          revisao_publicada: 1,
        },
      ]);
    });

    it("a service_role (pnpm materia:publicar) continua publicando", async () => {
      const { error } = await servico.rpc("publicar_revisao", {
        p_article_id: idParaPublicar,
      });
      expect(error).toBeNull();
    });
  });

  it("buscar_artigos continua aberta (security invoker: o admin acha o rascunho)", async () => {
    const doAnon = await anon.rpc("buscar_artigos", { termos: ["segredo"] });
    expect(doAnon.error).toBeNull();
    expect(doAnon.data).toEqual([]);
    const doAdmin = await aprovado.cliente.rpc("buscar_artigos", {
      termos: ["segredo"],
    });
    expect(doAdmin.error).toBeNull();
    expect((doAdmin.data as { slug: string }[]).map((m) => m.slug)).toEqual([
      "rascunho-do-admin",
    ]);
  });
});

describe("tags de rascunho", () => {
  const slugs = (data: unknown) =>
    ((data ?? []) as { slug: string }[]).map((t) => t.slug).sort();

  it("a tag usada só por rascunho não aparece para quem não é admin", async () => {
    for (const [nome, cliente] of naoAdmins()) {
      const { data, error } = await cliente.from("tags").select("slug");
      expect(error, nome).toBeNull();
      expect(slugs(data), nome).toEqual(["tag-publica"]);
    }
  });

  it("e aparece para o aprovado", async () => {
    const { data, error } = await aprovado.cliente.from("tags").select("slug");
    expect(error).toBeNull();
    expect(slugs(data)).toEqual(["tag-do-rascunho", "tag-publica"]);
  });

  it("a tag aparece para o público quando a matéria é publicada", async () => {
    const { error } = await servico
      .from("articles")
      .update({ status: "publicado", revisao_publicada: 1 })
      .eq("id", idDoRascunho);
    expect(error).toBeNull();
    const { data } = await anon.from("tags").select("slug");
    expect(slugs(data)).toEqual(["tag-do-rascunho", "tag-publica"]);
  });
});
