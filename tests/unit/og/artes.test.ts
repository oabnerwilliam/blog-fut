import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { ImageResponse } from "next/og";
import { createElement, type ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { ArteDaMateria, ArtePadrao } from "@/lib/og/artes";
import { fontesDaPrevia } from "@/lib/og/fontes";
import { TAMANHO_DA_PREVIA, type TextosDaPrevia } from "@/lib/og/previa";

/*
 * Renderiza as artes da prévia (T02) com o mesmo `ImageResponse` das rotas, sem subir o
 * Next: confere que as fontes carregam, que o PNG sai em 1200 × 630 e abaixo dos 300 KB do
 * WhatsApp, inclusive nos títulos que o acervo ainda não tem (pior caso e acima de 160
 * caracteres). Os PNGs ficam em test-results/og/ para conferência visual.
 */

const PASTA = path.join(process.cwd(), "test-results", "og");
const LIMITE_DO_WHATSAPP = 300 * 1024;

const BASE: TextosDaPrevia = {
  numero: "01",
  editoria: "Análise",
  titulo: "",
  data: "19.11.2026",
  ficticio: false,
  rodape: "Futebol depois do apito",
};

async function renderizar(arte: ReactElement, nome: string): Promise<Buffer> {
  const resposta = new ImageResponse(arte, {
    ...TAMANHO_DA_PREVIA,
    fonts: fontesDaPrevia(),
  });
  const png = Buffer.from(await resposta.arrayBuffer());
  mkdirSync(PASTA, { recursive: true });
  writeFileSync(path.join(PASTA, `${nome}.png`), png);
  return png;
}

function conferirPng(png: Buffer) {
  expect(png.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  expect(png.readUInt32BE(16)).toBe(1200);
  expect(png.readUInt32BE(20)).toBe(630);
  expect(png.byteLength).toBeLessThan(LIMITE_DO_WHATSAPP);
}

describe("artes da prévia", () => {
  it.each([
    [
      "pior-caso-80",
      "Kvaratskhelia e Mönchengladbach: WWW, Dembélé e Marquinhos no elenco",
    ],
    [
      "acima-de-160",
      "O mercado enxuto do PSG deu certo até aqui, mas as lesões de Kvaratskhelia, Dembélé e Marquinhos testam o elenco curto de Luis Enrique na reta final da fase de liga da Champions e na Ligue 1",
    ],
  ])(
    "matéria %s renderiza dentro do limite",
    async (nome, titulo) => {
      conferirPng(
        await renderizar(
          createElement(ArteDaMateria, { textos: { ...BASE, titulo } }),
          `unit-${nome}`,
        ),
      );
    },
    30_000,
  );

  it("fictícia e padrão renderizam dentro do limite", async () => {
    conferirPng(
      await renderizar(
        createElement(ArteDaMateria, {
          textos: {
            ...BASE,
            titulo: "Como o Atlético Ventania aprendeu a defender com a bola",
            ficticio: true,
            rodape: "Conteúdo fictício de demonstração",
          },
        }),
        "unit-ficticia",
      ),
    );
    conferirPng(await renderizar(createElement(ArtePadrao), "unit-padrao"));
  }, 30_000);
});
