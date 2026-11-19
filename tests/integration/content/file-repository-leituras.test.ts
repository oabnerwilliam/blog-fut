import * as fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FileArticleRepository } from "@/lib/content/file-repository";
import { fixture } from "./helpers";

// Içado: vale para o arquivo inteiro. Por isso este teste fica separado.
vi.mock("node:fs", { spy: true });

afterEach(() => {
  vi.mocked(fs.readFileSync).mockClear();
  vi.mocked(fs.readdirSync).mockClear();
});

describe("leituras do FileArticleRepository", () => {
  it("getBySlug não lê nada fora de materias/", async () => {
    const contentDir = fixture("basico");
    const materias = path.join(contentDir, "materias");
    const tagsJson = path.join(contentDir, "tags.json");
    const repositorio = new FileArticleRepository({
      contentDir,
      mostrarExemplos: true,
      avisar: () => {},
    });

    for (const slug of [
      "../../package",
      "..\\..\\package",
      "materia/../outra",
      "%00",
      "",
      "nao-existe",
      "alfa-cronica",
    ]) {
      await repositorio.getBySlug(slug);
    }

    const lidos = vi
      .mocked(fs.readFileSync)
      .mock.calls.map(([caminho]) => path.resolve(String(caminho)));
    expect(lidos.length).toBeGreaterThan(0);
    for (const caminho of lidos) {
      const dentro = caminho === tagsJson || path.dirname(caminho) === materias;
      expect(dentro, caminho).toBe(true);
    }

    const pastas = vi
      .mocked(fs.readdirSync)
      .mock.calls.map(([caminho]) => path.resolve(String(caminho)));
    expect(pastas).toEqual([materias]);
  });

  it("o disco é lido uma vez por instância", async () => {
    const repositorio = new FileArticleRepository({
      contentDir: fixture("basico"),
      mostrarExemplos: true,
      avisar: () => {},
    });
    await repositorio.list();
    const leituras = vi.mocked(fs.readFileSync).mock.calls.length;
    await repositorio.getBySlug("alfa-cronica");
    await repositorio.search("aurora");
    await repositorio.listTags();
    expect(vi.mocked(fs.readFileSync).mock.calls.length).toBe(leituras);
  });
});
