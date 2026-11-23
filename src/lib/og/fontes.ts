import { readFileSync } from "node:fs";
import path from "node:path";

/*
 * Fontes da prévia do link (T02). O `ImageResponse` (Satori) não usa o `next/font`: ele
 * precisa dos arquivos TTF. Este é o ÚNICO módulo do app, fora de `src/lib/content/`, que
 * pode usar `node:fs` (exceção registrada no CLAUDE.md), e ele só lê `assets/fontes/`.
 *
 * A leitura é síncrona, feita uma vez e guardada: o valor não depende da requisição, e o
 * prerender das rotas de imagem não para numa leitura assíncrona (guia "Caching",
 * "Predictable values"). Ela só acontece na primeira imagem gerada, e não no carregamento
 * do módulo: a página da matéria também importa a rota de imagem (para ler `size` e
 * `contentType`) e não precisa das fontes. Só os pesos que as artes usam (README do
 * design da T02). A origem e o recorte de cada arquivo estão em `assets/fontes/README.md`.
 */

/** Nomes de família usados no `fontFamily` das artes. */
export const FAMILIA = {
  serifa: "Instrument Serif",
  sans: "Instrument Sans",
  mono: "Geist Mono",
} as const;

interface Fonte {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 500 | 600;
  style: "normal" | "italic";
}

const ARQUIVOS: readonly (Omit<Fonte, "data"> & { arquivo: string })[] = [
  {
    arquivo: "InstrumentSerif-Regular.ttf",
    name: FAMILIA.serifa,
    weight: 400,
    style: "normal",
  },
  {
    arquivo: "InstrumentSerif-Italic.ttf",
    name: FAMILIA.serifa,
    weight: 400,
    style: "italic",
  },
  {
    arquivo: "InstrumentSans-SemiBold.ttf",
    name: FAMILIA.sans,
    weight: 600,
    style: "normal",
  },
  {
    arquivo: "GeistMono-Medium.ttf",
    name: FAMILIA.mono,
    weight: 500,
    style: "normal",
  },
  {
    arquivo: "GeistMono-SemiBold.ttf",
    name: FAMILIA.mono,
    weight: 600,
    style: "normal",
  },
];

function ler(arquivo: string): ArrayBuffer {
  const buffer = readFileSync(
    path.join(process.cwd(), "assets", "fontes", arquivo),
  );
  // Cópia num ArrayBuffer próprio: o Buffer do Node pode ser uma fatia de um pool maior.
  return Uint8Array.from(buffer).buffer;
}

let carregadas: Fonte[] | undefined;

/** As fontes no formato da opção `fonts` do `ImageResponse`. */
export function fontesDaPrevia(): Fonte[] {
  carregadas ??= ARQUIVOS.map(({ arquivo, ...fonte }) => ({
    ...fonte,
    data: ler(arquivo),
  }));
  return carregadas;
}
