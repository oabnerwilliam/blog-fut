/**
 * `src/lib/auth/servidor.ts` contra o Supabase local (história 16, critério 3).
 *
 * O `cookies()` do Next é trocado por um pote em memória com cookies gerados pelo
 * próprio `@supabase/ssr`. A sessão vem de usuários reais, logados por senha.
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
import {
  cookiesDaSessao,
  poteDeCookies,
  type CookieSimples,
} from "./helpers/cookies-de-sessao";
import { clienteDeServico, supabaseLocal } from "./helpers/supabase-local";
import {
  apagarUsuarios,
  criarUsuario,
  type UsuarioDeTeste,
} from "./helpers/usuarios";

let pote = poteDeCookies();
vi.mock("next/headers", () => ({ cookies: async () => pote }));
// Fora do Next não há requisição: o connection() só marca a fase, então aqui resolve.
vi.mock("next/server", () => ({ connection: async () => {} }));

const { criarClienteDoServidor, obterSessaoDoAdmin } =
  await import("@/lib/auth/servidor");

const servico = clienteDeServico();
const EMAILS = {
  pendente: "servidor-pendente@exemplo.test",
  aprovado: "servidor-aprovado@exemplo.test",
};

let pendente: UsuarioDeTeste;
let aprovado: UsuarioDeTeste;
let cookiesDoPendente: CookieSimples[];
let cookiesDoAprovado: CookieSimples[];

beforeAll(async () => {
  const { url, anonKey } = supabaseLocal();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", url);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", anonKey);
  pendente = await criarUsuario(servico, {
    email: EMAILS.pendente,
    metadados: { full_name: "Pessoa Pendente" },
  });
  aprovado = await criarUsuario(servico, {
    email: EMAILS.aprovado,
    status: "aprovado",
  });
  cookiesDoPendente = await cookiesDaSessao(pendente.cliente);
  cookiesDoAprovado = await cookiesDaSessao(aprovado.cliente);
});

afterAll(async () => {
  vi.unstubAllEnvs();
  await apagarUsuarios(servico, Object.values(EMAILS));
});

beforeEach(() => {
  pote = poteDeCookies();
});

describe("obterSessaoDoAdmin", () => {
  it("sem cookie: null", async () => {
    expect(await obterSessaoDoAdmin()).toBeNull();
  });

  it("pendente: usuário e perfil pendente", async () => {
    pote = poteDeCookies(cookiesDoPendente, { somenteLeitura: true });
    const sessao = await obterSessaoDoAdmin();
    expect(sessao).toEqual({
      usuario: { id: pendente.id, email: EMAILS.pendente },
      perfil: {
        userId: pendente.id,
        email: EMAILS.pendente,
        nome: "Pessoa Pendente",
        avatarUrl: null,
        status: "pendente",
        papel: "admin",
        decididoPor: null,
        decididoEm: null,
        criadoEm: expect.any(String),
      },
    });
  });

  it("aprovado: perfil aprovado", async () => {
    pote = poteDeCookies(cookiesDoAprovado, { somenteLeitura: true });
    expect((await obterSessaoDoAdmin())?.perfil?.status).toBe("aprovado");
  });

  it("confere o token no Auth (getUser): um cookie com o access token adulterado dá null", async () => {
    const [primeiro, ...resto] = cookiesDoAprovado;
    const json = JSON.parse(
      Buffer.from(primeiro.value.replace(/^base64-/, ""), "base64url").toString(
        "utf8",
      ),
    ) as { access_token: string; expires_at: number };
    // Um JWT com outra assinatura e um prazo longe: só o Auth descobre a fraude.
    const [cabecalho, corpo] = json.access_token.split(".");
    const adulterado = {
      ...json,
      access_token: `${cabecalho}.${corpo}.assinatura-falsa`,
      expires_at: Math.floor(Date.now() / 1000) + 3000,
    };
    pote = poteDeCookies(
      [
        {
          name: primeiro.name,
          value: `base64-${Buffer.from(JSON.stringify(adulterado)).toString("base64url")}`,
        },
        ...resto,
      ],
      { somenteLeitura: true },
    );
    expect(await obterSessaoDoAdmin()).toBeNull();
  });

  it("usuário apagado no Auth: null, mesmo com o cookie ainda válido", async () => {
    const temporario = await criarUsuario(servico, {
      email: "servidor-temporario@exemplo.test",
      status: "aprovado",
    });
    const cookies = await cookiesDaSessao(temporario.cliente);
    await apagarUsuarios(servico, [temporario.email]);
    pote = poteDeCookies(cookies, { somenteLeitura: true });
    expect(await obterSessaoDoAdmin()).toBeNull();
  });
});

describe("criarClienteDoServidor", () => {
  it("usa a sessão do cookie: o RLS vê o usuário logado", async () => {
    pote = poteDeCookies(cookiesDoAprovado, { somenteLeitura: true });
    const cliente = await criarClienteDoServidor();
    const { data, error } = await cliente.rpc("eh_admin");
    expect(error).toBeNull();
    expect(data).toBe(true);
  });

  it("num Server Component (set lança), não quebra ao tentar gravar cookie", async () => {
    pote = poteDeCookies(cookiesDoPendente, { somenteLeitura: true });
    const cliente = await criarClienteDoServidor();
    await expect(cliente.auth.signOut({ scope: "local" })).resolves.toEqual({
      error: null,
    });
  });

  it("numa Server Action, grava os cookies (signOut apaga a sessão)", async () => {
    const temporario = await criarUsuario(servico, {
      email: "servidor-sair@exemplo.test",
    });
    pote = poteDeCookies(await cookiesDaSessao(temporario.cliente));
    const cliente = await criarClienteDoServidor();
    await cliente.auth.signOut();
    expect(pote.gravados.length).toBeGreaterThan(0);
    expect(pote.gravados.every((c) => c.value === "")).toBe(true);
    await apagarUsuarios(servico, [temporario.email]);
  });
});
