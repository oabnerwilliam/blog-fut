/**
 * Avatar do admin (história 16): a foto vem do `avatar_url` dos metadados do Google, que
 * o próprio usuário consegue influenciar. Só `https:` vira `<img>`; qualquer outro
 * esquema (`javascript:`, `data:`, `http:`) ou URL inválida mostra as iniciais.
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Avatar } from "@/components/admin/Avatar";

function html(url: string | null) {
  return renderToStaticMarkup(
    createElement(Avatar, { url, iniciais: "JP", tamanho: "normal" }),
  );
}

describe("Avatar", () => {
  it("https: mostra a foto, decorativa (alt vazio) e sem Referer", () => {
    const saida = html("https://lh3.googleusercontent.com/a/foto=s96-c");
    expect(saida).toContain(
      'src="https://lh3.googleusercontent.com/a/foto=s96-c"',
    );
    expect(saida).toContain('alt=""');
    expect(saida).toContain('referrerPolicy="no-referrer"');
    expect(saida).not.toContain("JP");
  });

  it.each([
    null,
    "",
    "http://exemplo.test/foto.png",
    "javascript:alert(1)",
    "data:image/svg+xml,<svg onload=alert(1)>",
    "//exemplo.test/foto.png",
    "não é url",
  ])("%j mostra as iniciais, escondidas do leitor de tela", (url) => {
    const saida = html(url);
    expect(saida).not.toContain("<img");
    expect(saida).toContain('aria-hidden="true"');
    expect(saida).toContain(">JP<");
  });
});
