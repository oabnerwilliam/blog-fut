import { describe, expect, it, vi } from "vitest";
import { montarBusca } from "@/lib/busca";
import { FileArticleRepository } from "@/lib/content/file-repository";
import { fixture } from "./content/helpers";

/**
 * "Foco de revisão" 1 da história 06: a busca não diferencia acento nem maiúsculas.
 * Contra o repositório de arquivos de verdade, com a fixture "basico" (charlie-cronica
 * cita São Paulo). As grafias de "São Ciríaco", do conteúdo real, ficam em
 * `content/conteudo-real.test.ts`, o único teste que lê o content/.
 */
const repositorio = () =>
  new FileArticleRepository({
    contentDir: fixture("basico"),
    mostrarExemplos: true,
    avisar: vi.fn(),
  });

const slugsDa = async (termo: string) => {
  const busca = await montarBusca(repositorio(), termo);
  return busca.estado === "com-resultado"
    ? busca.itens.map((item) => item.slug)
    : busca.estado;
};

describe("busca contra o FileRepository", () => {
  it("'sao paulo', 'SÃO PAULO' e 'São Paulo' devolvem a mesma lista", async () => {
    const listas = await Promise.all(
      ["sao paulo", "SÃO PAULO", "São Paulo"].map(slugsDa),
    );
    expect(listas[0]).toEqual(["charlie-cronica"]);
    expect(listas[1]).toEqual(listas[0]);
    expect(listas[2]).toEqual(listas[0]);
  });

  it("termo que não aparece: sem-resultado", async () => {
    expect(await slugsDa("zzzzqqq")).toBe("sem-resultado");
  });
});
