import { describe, expect, it } from "vitest";
import { criarIndiceDeRotas, rotaExiste } from "@/lib/rotas";
import { artigo, repositorioEmMemoria } from "./helpers/repositorio-em-memoria";

/**
 * Regra de 404 do Proxy (ADR 0006, extensões das histórias 05 e 14). O Proxy só chama
 * esta função, com o índice em memória; o teste usa um repositório em memória sem
 * nenhuma entrevista. Os casos são os da história 05: o índice não muda o resultado.
 */
const TACA = { slug: "taca-das-serras", rotulo: "Taça das Serras" };
const repositorio = repositorioEmMemoria([
  artigo("cronica-a", "2026-10-25", "cronica", { tags: [TACA] }),
  artigo("cronica-b", "2026-10-18", "cronica"),
]);

const indice = criarIndiceDeRotas({ repositorio: () => repositorio });

const existe = (caminho: string) =>
  rotaExiste(indice, new URL(caminho, "http://localhost"));

describe("rotaExiste", () => {
  it.each([
    "/materias/cronica-a",
    "/editorias/cronica",
    "/editorias/cronica?pagina=1",
    "/tags/taca-das-serras",
    "/tags/taca-das-serras?outro=x",
  ])("%s existe", async (caminho) => {
    expect(await existe(caminho)).toBe(true);
  });

  it.each([
    "/materias/nao-existe",
    "/materias/PSG",
    "/materias/..%2F..%2Fpackage",
    "/materias/%E0%A4%A",
    "/editorias/inexistente",
    // Da lista fechada, mas sem matéria visível neste repositório.
    "/editorias/entrevista",
    "/tags/nao-existe",
    "/tags/%C3%87%C3%87",
    "/tags/%E0%A4%A",
    "/editorias/cronica?pagina=0",
    "/editorias/cronica?pagina=abc",
    "/editorias/cronica?pagina=99",
    "/editorias/cronica?pagina=2",
    "/editorias/cronica?pagina=",
    "/editorias/cronica?pagina=1&pagina=1",
    "/tags/taca-das-serras?pagina=02",
  ])("%s não existe", async (caminho) => {
    expect(await existe(caminho)).toBe(false);
  });

  it("caminhos fora das rotas conferidas passam", async () => {
    expect(await existe("/")).toBe(true);
    expect(await existe("/sitemap.xml")).toBe(true);
  });
});
