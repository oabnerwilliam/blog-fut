import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Capa from "@/app/page";
import type { ArticleRepository } from "@/lib/content";

const PSG = "psg-balanco-temporada-2026-27-mercado-elenco-curto";

/** Liga um repositório vazio no lugar do real, para o estado vazio da capa (critério 10 da 04). */
const controle = vi.hoisted(() => ({ vazio: false }));

vi.mock("@/lib/content", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/content")>();
  const vazio: ArticleRepository = {
    async list() {
      return { itens: [], pagina: 1, totalPaginas: 0, total: 0 };
    },
    async getBySlug() {
      return null;
    },
    async search() {
      return [];
    },
    async listEditorias() {
      return [];
    },
    async listTags() {
      return [];
    },
  };
  return {
    ...original,
    getRepository: () => (controle.vazio ? vazio : original.getRepository()),
  };
});

/** Trecho do HTML da seção do destaque (do `<section aria-labelledby="destaque"` ao `</section>`). */
function secaoDoDestaque(html: string): string {
  const inicio = html.indexOf('aria-labelledby="destaque"');
  expect(inicio).toBeGreaterThan(-1);
  return html.slice(inicio, html.indexOf("</section>", inicio));
}

/**
 * A página da capa com o conteúdo real de content/. Desde a história 08 há uma matéria
 * real (PSG): ela fica no destaque com ou sem as fictícias.
 */
describe("capa (página)", () => {
  const original = process.env.MOSTRAR_EXEMPLOS;
  beforeEach(() => {
    delete process.env.MOSTRAR_EXEMPLOS;
    controle.vazio = false;
  });
  afterEach(() => {
    if (original === undefined) delete process.env.MOSTRAR_EXEMPLOS;
    else process.env.MOSTRAR_EXEMPLOS = original;
    controle.vazio = false;
  });

  async function renderizar(): Promise<string> {
    return renderToStaticMarkup(await Capa());
  }

  it("sem matérias visíveis, mostra o h1 e a mensagem de estado vazio", async () => {
    controle.vazio = true;
    const html = await renderizar();
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    expect(html).toContain("Zona Mista: futebol depois do apito");
    expect(html).toContain("As primeiras matérias estão sendo preparadas.");
    expect(html).not.toContain('aria-labelledby="destaque"');
    expect(html).not.toContain('aria-labelledby="ultimas"');
  });

  it("só com as reais (MOSTRAR_EXEMPLOS=false), o PSG fica no destaque, sem Últimas nem estado vazio", async () => {
    process.env.MOSTRAR_EXEMPLOS = "false";
    const html = await renderizar();
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    expect(secaoDoDestaque(html)).toContain(`href="/materias/${PSG}"`);
    expect(html).not.toContain('aria-labelledby="ultimas"');
    expect(html).not.toContain("Exemplo");
    expect(html).not.toContain("As primeiras matérias estão sendo preparadas.");
  });

  it("com as fictícias, o PSG segue no destaque sem selo e há Últimas, Editorias e a faixa de Crônica", async () => {
    const html = await renderizar();
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    for (const id of ["destaque", "ultimas", "editorias", "faixa-cronica"]) {
      expect(html).toContain(`aria-labelledby="${id}"`);
      expect(html).toContain(`id="${id}"`);
    }
    const destaque = secaoDoDestaque(html);
    expect(destaque).toContain(`href="/materias/${PSG}"`);
    expect(destaque).not.toContain("Exemplo");
    expect(html).not.toContain("As primeiras matérias estão sendo preparadas.");
  });
});
