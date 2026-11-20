import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import Capa from "@/app/page";

/**
 * A página da capa com o conteúdo real de content/. Hoje todas as matérias são fictícias:
 * com MOSTRAR_EXEMPLOS=false não sobra nenhuma, e a capa precisa mostrar o estado vazio
 * (critério 10), sem lançar erro, para o build continuar passando.
 */
describe("capa (página)", () => {
  const original = process.env.MOSTRAR_EXEMPLOS;
  beforeEach(() => {
    delete process.env.MOSTRAR_EXEMPLOS;
  });
  afterEach(() => {
    if (original === undefined) delete process.env.MOSTRAR_EXEMPLOS;
    else process.env.MOSTRAR_EXEMPLOS = original;
  });

  async function renderizar(): Promise<string> {
    return renderToStaticMarkup(await Capa());
  }

  it("sem matérias visíveis, mostra o h1 e a mensagem de estado vazio", async () => {
    process.env.MOSTRAR_EXEMPLOS = "false";
    const html = await renderizar();
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    expect(html).toContain("Zona Mista: futebol depois do apito");
    expect(html).toContain("As primeiras matérias estão sendo preparadas.");
    expect(html).not.toContain('aria-labelledby="destaque"');
    expect(html).not.toContain('aria-labelledby="ultimas"');
  });

  it("com as fictícias, mostra destaque, Últimas, Editorias e a faixa de Crônica, sem o estado vazio", async () => {
    const html = await renderizar();
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    for (const id of ["destaque", "ultimas", "editorias", "faixa-cronica"]) {
      expect(html).toContain(`aria-labelledby="${id}"`);
      expect(html).toContain(`id="${id}"`);
    }
    expect(html).not.toContain("As primeiras matérias estão sendo preparadas.");
  });
});
