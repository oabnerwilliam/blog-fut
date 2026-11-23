# Fontes da prévia do link (T02)

O `ImageResponse` (`next/og`, Satori) não usa o `next/font`: ele precisa dos arquivos de fonte. Estas são as fontes das imagens Open Graph (`src/app/(site)/opengraph-image.tsx` e `src/app/(site)/materias/[slug]/opengraph-image.tsx`). Só `src/lib/og/fontes.ts` as lê (exceção à regra do `fs`, registrada no `CLAUDE.md`).

São TTF **estáticas** (o Satori não lida bem com fonte variável) e só os pesos que a arte da direção A usa (README do design da T02).

| Arquivo                       | Família, peso e estilo       | Uso na arte                      | Origem                                                                                                                 | Recorte                   |
| ----------------------------- | ---------------------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| `InstrumentSerif-Regular.ttf` | Instrument Serif 400         | título e wordmark                | [google/fonts](https://github.com/google/fonts/tree/main/ofl/instrumentserif) `ofl/instrumentserif/`, commit `06bfe0d` | nenhum (arquivo original) |
| `InstrumentSerif-Italic.ttf`  | Instrument Serif 400 itálico | "_Mista_" do wordmark            | idem                                                                                                                   | nenhum (arquivo original) |
| `InstrumentSans-SemiBold.ttf` | Instrument Sans 600          | editorias da imagem padrão       | [Instrument/instrument-sans](https://github.com/Instrument/instrument-sans) `fonts/ttf/`, commit `7fa2230`             | latino                    |
| `GeistMono-Medium.ttf`        | Geist Mono 500               | número da editoria, slogan, data | [vercel/geist-font](https://github.com/vercel/geist-font) `fonts/GeistMono/ttf/`, commit `ef2597c`                     | latino                    |
| `GeistMono-SemiBold.ttf`      | Geist Mono 600               | editoria e selo "Exemplo"        | idem                                                                                                                   | latino                    |

As três famílias já têm TTF estáticas nos repositórios oficiais: nenhuma instância foi gerada a partir de fonte variável.

## Recorte (subset)

A Instrument Serif vai inteira, porque desenha o título, que é texto livre. A Instrument Sans e a Geist Mono só desenham textos fixos (rótulos, slogan, data, "Exemplo"), então foram recortadas para o alfabeto latino, o que corta cerca de metade do peso. O recorte foi feito com o [fontTools](https://github.com/fonttools/fonttools) 4.62:

```sh
pyftsubset <original>.ttf \
  --unicodes="U+0020-007E,U+00A0-017F,U+2010-2027,U+2030-203A,U+20AC" \
  --layout-features='*' \
  --output-file=<arquivo>.ttf
```

Faixas: ASCII, Latin-1 e Latin Extended-A (todos os acentos do português), pontuação geral (travessões, aspas curvas, reticências) e o euro. Os losangos ◇ e ◆ não estão em nenhuma dessas fontes: a arte os desenha em SVG.

Total na pasta: cerca de 357 KB.

## Licença

As três famílias são licenciadas pela SIL Open Font License 1.1, que permite usar, recortar e redistribuir as fontes junto com o software. Nenhuma delas declara Reserved Font Name. As licenças estão nesta pasta:

- `OFL-InstrumentSerif.txt`
- `OFL-InstrumentSans.txt`
- `OFL-Geist.txt`
