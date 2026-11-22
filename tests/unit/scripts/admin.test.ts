import { describe, expect, it, vi } from "vitest";
import {
  executarPromoverAdmin,
  lerArgumentosDoPromover,
  mascararEmail,
  padraoDoEmail,
} from "../../../scripts/lib/admin";
import { ErroDoComando } from "../../../scripts/lib/materias";

describe("lerArgumentosDoPromover", () => {
  it("lê o e-mail e as opções em qualquer ordem", () => {
    expect(lerArgumentosDoPromover(["pessoa@exemplo.test"])).toEqual({
      email: "pessoa@exemplo.test",
      prod: false,
      sim: false,
    });
    expect(
      lerArgumentosDoPromover(["--sim", "--", "Pessoa@Exemplo.test", "--prod"]),
    ).toEqual({ email: "Pessoa@Exemplo.test", prod: true, sim: true });
  });

  it.each([
    [[]],
    [["a@exemplo.test", "b@exemplo.test"]],
    [["sem-arroba"]],
    [["com espaco@exemplo.test"]],
    [["@exemplo.test"]],
    [["pessoa@"]],
    [["a@exemplo.test", "--dir", "x"]],
  ])("recusa %j com o uso", (argv) => {
    expect(() => lerArgumentosDoPromover(argv)).toThrow(ErroDoComando);
    expect(() => lerArgumentosDoPromover(argv)).toThrow(
      /pnpm admin:promover <email> \[--prod\] \[--sim\]/,
    );
  });
});

describe("mascararEmail", () => {
  it("mostra só a primeira letra e o domínio", () => {
    expect(mascararEmail("pessoa@exemplo.test")).toBe("p***@exemplo.test");
    expect(mascararEmail("a@exemplo.test")).toBe("a***@exemplo.test");
  });
});

describe("padraoDoEmail (ilike sem curingas)", () => {
  it("escapa % e _ e troca * por um curinga de um caractere", () => {
    expect(padraoDoEmail("a_b%c\\d@exemplo.test")).toBe(
      "a\\_b\\%c\\\\d@exemplo.test",
    );
    expect(padraoDoEmail("a*b@exemplo.test")).toBe("a_b@exemplo.test");
  });
});

describe("executarPromoverAdmin", () => {
  it("argumento inválido: falha antes de ler o ambiente", async () => {
    const carregarAmbiente = vi.fn();
    await expect(
      executarPromoverAdmin(["sem-arroba"], {
        carregarAmbiente,
        criarCliente: vi.fn(),
        escrever: vi.fn(),
      }),
    ).rejects.toThrow(ErroDoComando);
    expect(carregarAmbiente).not.toHaveBeenCalled();
  });

  it("repassa --prod e --sim para a trava do ambiente", async () => {
    const carregarAmbiente = vi.fn().mockRejectedValue(new Error("parou aqui"));
    await expect(
      executarPromoverAdmin(["a@exemplo.test", "--prod", "--sim"], {
        carregarAmbiente,
        criarCliente: vi.fn(),
        escrever: vi.fn(),
      }),
    ).rejects.toThrow("parou aqui");
    expect(carregarAmbiente).toHaveBeenCalledWith({ prod: true, sim: true });
  });
});
