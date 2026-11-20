import { describe, expect, it } from "vitest";
import {
  CHAVE_DO_TEMA,
  SCRIPT_DO_TEMA,
  aplicarTema,
  guardarTema,
  lerTemaGuardado,
  nomeDoBotaoDeTema,
  proximoTema,
  rotuloDoTema,
  temaDoAtributo,
  type Tema,
} from "@/lib/tema";

/** Storage em memória, com a mesma interface do `localStorage` que o código usa. */
function storageFalso(inicial: Record<string, string> = {}) {
  const dados = new Map(Object.entries(inicial));
  return {
    dados,
    getItem: (k: string) => dados.get(k) ?? null,
    setItem: (k: string, v: string) => void dados.set(k, String(v)),
    removeItem: (k: string) => void dados.delete(k),
  };
}

/** Storage que lança em toda operação (modo privado, cookies bloqueados). */
const storageQueLanca = {
  getItem: () => {
    throw new Error("SecurityError");
  },
  setItem: () => {
    throw new Error("QuotaExceededError");
  },
  removeItem: () => {
    throw new Error("SecurityError");
  },
};

/** `<html>` falso: só guarda atributos. */
function htmlFalso() {
  const atributos = new Map<string, string>();
  return {
    atributos,
    getAttribute: (n: string) => atributos.get(n) ?? null,
    setAttribute: (n: string, v: string) => void atributos.set(n, v),
    removeAttribute: (n: string) => void atributos.delete(n),
  };
}

/** Executa a string do script inline com um `document` e um `localStorage` falsos. */
function rodarScript(localStorage: unknown) {
  const html = htmlFalso();
  const document = { documentElement: html };
  new Function("document", "localStorage", SCRIPT_DO_TEMA)(
    document,
    localStorage,
  );
  return html.atributos;
}

describe("proximoTema", () => {
  it("segue o ciclo sistema → light → dark → sistema", () => {
    expect(proximoTema("sistema")).toBe("light");
    expect(proximoTema("light")).toBe("dark");
    expect(proximoTema("dark")).toBe("sistema");
  });
});

describe("rotuloDoTema e nome do botão", () => {
  it("rótulos em pt-BR", () => {
    expect(rotuloDoTema("sistema")).toBe("sistema");
    expect(rotuloDoTema("light")).toBe("claro");
    expect(rotuloDoTema("dark")).toBe("escuro");
  });

  it("o aria-label começa pelo texto visível e diz o próximo (WCAG 2.5.3)", () => {
    expect(nomeDoBotaoDeTema("sistema")).toBe(
      "Tema: sistema. Mudar para claro",
    );
    expect(nomeDoBotaoDeTema("light")).toBe("Tema: claro. Mudar para escuro");
    expect(nomeDoBotaoDeTema("dark")).toBe("Tema: escuro. Mudar para sistema");
  });
});

describe("temaDoAtributo", () => {
  it("só aceita light e dark; o resto é sistema", () => {
    expect(temaDoAtributo("light")).toBe("light");
    expect(temaDoAtributo("dark")).toBe("dark");
    expect(temaDoAtributo(null)).toBe("sistema");
    expect(temaDoAtributo("azul")).toBe("sistema");
    expect(temaDoAtributo("sistema")).toBe("sistema");
  });
});

describe("lerTemaGuardado", () => {
  it("lê light e dark da chave", () => {
    expect(lerTemaGuardado(storageFalso({ [CHAVE_DO_TEMA]: "light" }))).toBe(
      "light",
    );
    expect(lerTemaGuardado(storageFalso({ [CHAVE_DO_TEMA]: "dark" }))).toBe(
      "dark",
    );
  });

  it("valor ausente, inválido ou storage ausente viram sistema", () => {
    expect(lerTemaGuardado(storageFalso())).toBe("sistema");
    expect(lerTemaGuardado(storageFalso({ [CHAVE_DO_TEMA]: "azul" }))).toBe(
      "sistema",
    );
    expect(lerTemaGuardado(null)).toBe("sistema");
  });

  it("storage que lança em getItem vira sistema", () => {
    expect(lerTemaGuardado(storageQueLanca)).toBe("sistema");
  });
});

describe("guardarTema", () => {
  it("grava light e dark e apaga a chave para sistema", () => {
    const s = storageFalso();
    guardarTema(s, "dark");
    expect(s.dados.get(CHAVE_DO_TEMA)).toBe("dark");
    guardarTema(s, "light");
    expect(s.dados.get(CHAVE_DO_TEMA)).toBe("light");
    guardarTema(s, "sistema");
    expect(s.dados.has(CHAVE_DO_TEMA)).toBe(false);
  });

  it("engole o erro do storage que lança em setItem e removeItem, e aceita storage ausente", () => {
    for (const tema of ["light", "dark", "sistema"] as Tema[]) {
      expect(() => guardarTema(storageQueLanca, tema)).not.toThrow();
      expect(() => guardarTema(null, tema)).not.toThrow();
    }
  });
});

describe("aplicarTema", () => {
  it("põe data-theme para light e dark e tira para sistema", () => {
    const html = htmlFalso();
    aplicarTema(html, "dark");
    expect(html.atributos.get("data-theme")).toBe("dark");
    aplicarTema(html, "light");
    expect(html.atributos.get("data-theme")).toBe("light");
    aplicarTema(html, "sistema");
    expect(html.atributos.has("data-theme")).toBe(false);
  });
});

describe("SCRIPT_DO_TEMA", () => {
  it("é curto e sem dependência (nada de import, require ou fetch)", () => {
    expect(SCRIPT_DO_TEMA.length).toBeLessThan(300);
    expect(SCRIPT_DO_TEMA).not.toMatch(/\b(import|require|fetch)\b/);
  });

  it("faz o mesmo que lerTemaGuardado e sempre põe data-js", () => {
    const casos: [Record<string, string>, Tema][] = [
      [{ [CHAVE_DO_TEMA]: "light" }, "light"],
      [{ [CHAVE_DO_TEMA]: "dark" }, "dark"],
      [{ [CHAVE_DO_TEMA]: "azul" }, "sistema"],
      [{}, "sistema"],
    ];
    for (const [dados, esperado] of casos) {
      const storage = storageFalso(dados);
      expect(lerTemaGuardado(storage)).toBe(esperado);
      const atributos = rodarScript(storage);
      expect(atributos.get("data-theme") ?? "sistema").toBe(esperado);
      expect(atributos.has("data-js")).toBe(true);
    }
  });

  it("com localStorage que lança, não põe data-theme, mas põe data-js e não lança", () => {
    let atributos: Map<string, string> | undefined;
    expect(() => {
      atributos = rodarScript(storageQueLanca);
    }).not.toThrow();
    expect(atributos!.has("data-theme")).toBe(false);
    expect(atributos!.has("data-js")).toBe(true);
  });

  it("com localStorage inacessível (o acesso ao objeto já lança), também não quebra", () => {
    const html = htmlFalso();
    const escopo = {
      document: { documentElement: html },
      get localStorage(): never {
        throw new Error("SecurityError");
      },
    };
    // `with` não existe em módulo estrito: usa um getter no lugar do global.
    expect(() =>
      new Function("escopo", `with (escopo) { ${SCRIPT_DO_TEMA} }`)(escopo),
    ).not.toThrow();
    expect(html.atributos.has("data-theme")).toBe(false);
    expect(html.atributos.has("data-js")).toBe(true);
  });
});
