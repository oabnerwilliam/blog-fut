import {
  Geist_Mono,
  Instrument_Sans,
  Instrument_Serif,
} from "next/font/google";

/** Títulos e wordmark (ADR 0002). O itálico é obrigatório: "Mista" e títulos de seção. */
export const fonteDisplay = Instrument_Serif({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-instrument-serif",
});

/** Texto corrido. Variável (wght 400–700) com o eixo wdth, usado pela nav (font-stretch: 92%). */
export const fonteTexto = Instrument_Sans({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-instrument-sans",
});

/** Dados: datas, rótulos, números da nav. */
export const fonteMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

/** Classes que definem as variáveis das fontes. Vão no <html>, para `:root` enxergá-las. */
export const classesDeFonte: string = [
  fonteDisplay.variable,
  fonteTexto.variable,
  fonteMono.variable,
].join(" ");
