import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { EDITORIAS } from "@/lib/editorias";
import { AVISO_DA_FICTICIA } from "@/lib/og/previa";
import { NOME_DO_PORTAL, SLOGAN, SLOGAN_LONGO } from "@/lib/site";

/*
 * Cobertura de glifos das fontes da prévia (T02, revisão). O Satori não acusa glifo
 * ausente: cai na fonte de reserva do `next/og` (Geist Sans) e a arte sai com letras
 * misturadas, sem falhar teste nenhum. Aqui a tabela `cmap` de cada TTF é lida e conferida
 * contra o que a arte desenha: texto livre do título na Serif, textos fixos em Sans e Mono
 * (o recorte latino).
 */

const PASTA = path.join(process.cwd(), "assets", "fontes");

/** Code points mapeados pela `cmap` (subtabelas de formato 4 e 12). */
function codePoints(arquivo: string): Set<number> {
  const b = readFileSync(path.join(PASTA, arquivo));
  const numTables = b.readUInt16BE(4);
  let cmap = -1;
  for (let i = 0; i < numTables; i++) {
    const rec = 12 + i * 16;
    if (b.toString("latin1", rec, rec + 4) === "cmap") {
      cmap = b.readUInt32BE(rec + 8);
    }
  }
  if (cmap < 0) throw new Error(`${arquivo} sem cmap`);
  const pontos = new Set<number>();
  const subtabelas = b.readUInt16BE(cmap + 2);
  for (let i = 0; i < subtabelas; i++) {
    const sub = cmap + b.readUInt32BE(cmap + 4 + i * 8 + 4);
    const formato = b.readUInt16BE(sub);
    if (formato === 4) {
      const segX2 = b.readUInt16BE(sub + 6);
      const fins = sub + 14;
      const inicios = fins + segX2 + 2;
      const deltas = inicios + segX2;
      const offsets = deltas + segX2;
      for (let s = 0; s < segX2 / 2; s++) {
        const fim = b.readUInt16BE(fins + s * 2);
        const inicio = b.readUInt16BE(inicios + s * 2);
        const delta = b.readInt16BE(deltas + s * 2);
        const offset = b.readUInt16BE(offsets + s * 2);
        for (let c = inicio; c <= fim && c !== 0xffff; c++) {
          let glifo: number;
          if (offset === 0) glifo = (c + delta) & 0xffff;
          else {
            const g = b.readUInt16BE(
              offsets + s * 2 + offset + (c - inicio) * 2,
            );
            glifo = g === 0 ? 0 : (g + delta) & 0xffff;
          }
          if (glifo !== 0) pontos.add(c);
        }
      }
    } else if (formato === 12) {
      const grupos = b.readUInt32BE(sub + 12);
      for (let g = 0; g < grupos; g++) {
        const base = sub + 16 + g * 12;
        const inicio = b.readUInt32BE(base);
        const fim = b.readUInt32BE(base + 4);
        for (let c = inicio; c <= fim; c++) pontos.add(c);
      }
    }
  }
  return pontos;
}

function faltando(arquivo: string, textos: readonly string[]): string[] {
  const pontos = codePoints(arquivo);
  const chars = new Set(
    textos.flatMap((t) => [...t, ...t.toUpperCase()]).filter((c) => c !== " "),
  );
  return [...chars].filter((c) => !pontos.has(c.codePointAt(0)!));
}

/** O que um título em pt-BR costuma trazer: acentos, cedilha, trema, aspas e travessões. */
const TITULO_PT_BR = [
  "áàâãäéêëíïóôõöúüçñ",
  "ÁÀÂÃÄÉÊËÍÏÓÔÕÖÚÜÇÑ",
  "abcdefghijklmnopqrstuvwxyz0123456789",
  "“aspas” ‘simples’ «guillemets» — travessão – meia-risca … reticências",
  `!?.,;:()[]/&%$#@+*'"ºª°€`,
  "Kvaratskhelia, Mönchengladbach, Dembélé, Bayern München, Atlético-MG",
];

const ROTULOS = EDITORIAS.map((e) => e.rotulo);
const DIGITOS_E_DATA = ["0123456789.", "19.11.2026"];

describe("glifos das fontes da prévia (T02)", () => {
  it.each(["InstrumentSerif-Regular.ttf", "InstrumentSerif-Italic.ttf"])(
    "%s cobre o português e a pontuação comum dos títulos",
    (arquivo) => {
      expect(faltando(arquivo, [...TITULO_PT_BR, NOME_DO_PORTAL])).toEqual(
        [],
      );
    },
  );

  it("Geist Mono (500 e 600) cobre todos os textos fixos que desenha, em caixa alta", () => {
    const textos = [
      ...ROTULOS,
      ...DIGITOS_E_DATA,
      SLOGAN,
      ...SLOGAN_LONGO,
      AVISO_DA_FICTICIA,
      "Exemplo",
    ];
    for (const arquivo of ["GeistMono-Medium.ttf", "GeistMono-SemiBold.ttf"]) {
      expect(faltando(arquivo, textos), arquivo).toEqual([]);
    }
  });

  it("Instrument Sans 600 cobre os rótulos das editorias", () => {
    expect(faltando("InstrumentSans-SemiBold.ttf", ROTULOS)).toEqual([]);
  });

  it("o detector acusa glifo ausente (caso positivo)", () => {
    // Losango: a arte o desenha em SVG justamente porque o Geist Mono não o tem.
    expect(faltando("GeistMono-Medium.ttf", ["◇"])).toEqual(["◇"]);
  });
});
