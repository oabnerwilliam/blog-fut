import { describe, expect, it } from "vitest";
import {
  adminHabilitado,
  ehRotaAbertaDoAdmin,
  ehRotaDoAdmin,
  lerConexaoDoAuth,
} from "@/lib/auth/config";

describe("adminHabilitado (U14)", () => {
  it('só "true" liga o admin', () => {
    expect(adminHabilitado({ ADMIN_HABILITADO: "true" })).toBe(true);
  });

  it.each([undefined, "", "false", "TRUE", "True", "1", "sim", " true"])(
    "%j desliga",
    (valor) => {
      expect(adminHabilitado({ ADMIN_HABILITADO: valor })).toBe(false);
    },
  );
});

describe("ehRotaDoAdmin", () => {
  it.each([
    "/admin",
    "/admin/",
    "/admin/entrar",
    "/admin/acessos",
    "/admin/auth/callback",
    "/admin/qualquer/coisa",
  ])("%s é do admin", (caminho) => {
    expect(ehRotaDoAdmin(caminho)).toBe(true);
  });

  it.each(["/", "/administracao", "/adminx", "/materias/admin", "/tags/admin"])(
    "%s não é",
    (caminho) => {
      expect(ehRotaDoAdmin(caminho)).toBe(false);
    },
  );
});

describe("ehRotaAbertaDoAdmin", () => {
  it.each(["/admin/entrar", "/admin/auth/callback", "/admin/auth/qualquer"])(
    "%s não exige sessão",
    (caminho) => {
      expect(ehRotaAbertaDoAdmin(caminho)).toBe(true);
    },
  );

  it.each([
    "/admin",
    "/admin/",
    "/admin/acessos",
    "/admin/entrarx",
    "/admin/autor",
  ])("%s exige", (caminho) => {
    expect(ehRotaAbertaDoAdmin(caminho)).toBe(false);
  });
});

describe("lerConexaoDoAuth", () => {
  it("lê a URL e a chave anon", () => {
    expect(
      lerConexaoDoAuth({
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "chave",
      }),
    ).toEqual({ url: "http://127.0.0.1:54321", anonKey: "chave" });
  });

  it("lista todas as que faltam, sem cair num padrão", () => {
    expect(() => lerConexaoDoAuth({ NEXT_PUBLIC_SUPABASE_URL: " " })).toThrow(
      /NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY/,
    );
  });

  it("nunca usa a service_role, mesmo se ela estiver no ambiente", () => {
    const conexao = lerConexaoDoAuth({
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
      SUPABASE_SERVICE_ROLE_KEY: "nao-use",
    });
    expect(conexao.anonKey).toBe("anon");
  });
});
