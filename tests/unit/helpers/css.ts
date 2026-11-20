/**
 * Utilitários só de teste para ler CSS e procurar cores literais.
 * Não são usados pelo app.
 */

/** Troca comentários por espaços, preservando as quebras de linha (para manter os números de linha). */
function apagarMantendoLinhas(trecho: string): string {
  return trecho.replace(/[^\n]/g, " ");
}

/** Remove comentários `/* … *\/` (CSS e TS) e `// …` (só TS). Preserva os números de linha. */
export function removerComentarios(
  codigo: string,
  tipo: "css" | "ts" = "css",
): string {
  if (tipo === "css")
    return codigo.replace(/\/\*[\s\S]*?\*\//g, apagarMantendoLinhas);
  // Em TS, percorre respeitando strings, para não tratar "https://" como comentário.
  let saida = "";
  let i = 0;
  while (i < codigo.length) {
    const c = codigo[i];
    const prox = codigo[i + 1];
    if (c === '"' || c === "'" || c === "`") {
      let j = i + 1;
      while (j < codigo.length && codigo[j] !== c)
        j += codigo[j] === "\\" ? 2 : 1;
      saida += codigo.slice(i, j + 1);
      i = j + 1;
    } else if (c === "/" && prox === "*") {
      const fim = codigo.indexOf("*/", i + 2);
      const j = fim === -1 ? codigo.length : fim + 2;
      saida += apagarMantendoLinhas(codigo.slice(i, j));
      i = j;
    } else if (c === "/" && prox === "/") {
      const fim = codigo.indexOf("\n", i);
      const j = fim === -1 ? codigo.length : fim;
      saida += apagarMantendoLinhas(codigo.slice(i, j));
      i = j;
    } else {
      saida += c;
      i++;
    }
  }
  return saida;
}

function escaparRegex(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Devolve o conteúdo entre chaves do primeiro bloco cujo seletor (ou at-rule) é exatamente `seletor`.
 * Lança erro se não achar.
 */
export function extrairBloco(css: string, seletor: string): string {
  const re = new RegExp(`(^|[{};\\s])${escaparRegex(seletor)}\\s*\\{`, "g");
  const achado = re.exec(css);
  if (!achado) throw new Error(`Bloco não encontrado: ${seletor}`);
  const inicio = achado.index + achado[0].length;
  let profundidade = 1;
  let i = inicio;
  while (i < css.length && profundidade > 0) {
    if (css[i] === "{") profundidade++;
    else if (css[i] === "}") profundidade--;
    i++;
  }
  if (profundidade !== 0) throw new Error(`Bloco sem fechamento: ${seletor}`);
  return css.slice(inicio, i - 1);
}

/** Lê as propriedades customizadas (`--nome: valor;`) do nível de cima de um bloco. */
export function lerVariaveis(bloco: string): Record<string, string> {
  const vars: Record<string, string> = {};
  let profundidade = 0;
  let nivelZero = "";
  for (const c of bloco) {
    if (c === "{") profundidade++;
    if (profundidade === 0) nivelZero += c;
    if (c === "}") profundidade--;
  }
  for (const m of nivelZero.matchAll(/(--[\w-]+)\s*:\s*([^;]+);?/g)) {
    vars[m[1]] = m[2].trim().replace(/\s+/g, " ");
  }
  return vars;
}

/** Nomes de cor do CSS Color 4 (exceto `transparent` e `currentcolor`, que são permitidos). */
export const NOMES_DE_COR = [
  "aliceblue",
  "antiquewhite",
  "aqua",
  "aquamarine",
  "azure",
  "beige",
  "bisque",
  "black",
  "blanchedalmond",
  "blue",
  "blueviolet",
  "brown",
  "burlywood",
  "cadetblue",
  "chartreuse",
  "chocolate",
  "coral",
  "cornflowerblue",
  "cornsilk",
  "crimson",
  "cyan",
  "darkblue",
  "darkcyan",
  "darkgoldenrod",
  "darkgray",
  "darkgreen",
  "darkgrey",
  "darkkhaki",
  "darkmagenta",
  "darkolivegreen",
  "darkorange",
  "darkorchid",
  "darkred",
  "darksalmon",
  "darkseagreen",
  "darkslateblue",
  "darkslategray",
  "darkslategrey",
  "darkturquoise",
  "darkviolet",
  "deeppink",
  "deepskyblue",
  "dimgray",
  "dimgrey",
  "dodgerblue",
  "firebrick",
  "floralwhite",
  "forestgreen",
  "fuchsia",
  "gainsboro",
  "ghostwhite",
  "gold",
  "goldenrod",
  "gray",
  "green",
  "greenyellow",
  "grey",
  "honeydew",
  "hotpink",
  "indianred",
  "indigo",
  "ivory",
  "khaki",
  "lavender",
  "lavenderblush",
  "lawngreen",
  "lemonchiffon",
  "lightblue",
  "lightcoral",
  "lightcyan",
  "lightgoldenrodyellow",
  "lightgray",
  "lightgreen",
  "lightgrey",
  "lightpink",
  "lightsalmon",
  "lightseagreen",
  "lightskyblue",
  "lightslategray",
  "lightslategrey",
  "lightsteelblue",
  "lightyellow",
  "lime",
  "limegreen",
  "linen",
  "magenta",
  "maroon",
  "mediumaquamarine",
  "mediumblue",
  "mediumorchid",
  "mediumpurple",
  "mediumseagreen",
  "mediumslateblue",
  "mediumspringgreen",
  "mediumturquoise",
  "mediumvioletred",
  "midnightblue",
  "mintcream",
  "mistyrose",
  "moccasin",
  "navajowhite",
  "navy",
  "oldlace",
  "olive",
  "olivedrab",
  "orange",
  "orangered",
  "orchid",
  "palegoldenrod",
  "palegreen",
  "paleturquoise",
  "palevioletred",
  "papayawhip",
  "peachpuff",
  "peru",
  "pink",
  "plum",
  "powderblue",
  "purple",
  "rebeccapurple",
  "red",
  "rosybrown",
  "royalblue",
  "saddlebrown",
  "salmon",
  "sandybrown",
  "seagreen",
  "seashell",
  "sienna",
  "silver",
  "skyblue",
  "slateblue",
  "slategray",
  "slategrey",
  "snow",
  "springgreen",
  "steelblue",
  "tan",
  "teal",
  "thistle",
  "tomato",
  "turquoise",
  "violet",
  "wheat",
  "white",
  "whitesmoke",
  "yellow",
  "yellowgreen",
] as const;

const RE_FUNCAO_DE_COR =
  /(?<![\w-])(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/gi;
const RE_NOME_DE_COR = new RegExp(
  `(?<![\\w-])(${NOMES_DE_COR.join("|")})(?![\\w-])`,
  "gi",
);
const RE_HEX_CSS = /#[0-9a-fA-F]{3,8}\b/g;
const RE_HEX_EM_STRING = /(?:^|[\s(,:])(#[0-9a-fA-F]{3,8})(?![\w-])/g;
const RE_STRING = /(["'`])((?:\\.|(?!\1)[^\\])*)\1/g;

function linhaDe(codigo: string, indice: number): number {
  let linha = 1;
  for (let i = 0; i < indice; i++) if (codigo[i] === "\n") linha++;
  return linha;
}

function trechoDaLinha(codigo: string, linha: number): string {
  return codigo.split("\n")[linha - 1].trim();
}

/**
 * Procura cores literais (hex, funções de cor, nomes de cor) e devolve "linha: trecho" de cada achado.
 * Exceções: `transparent`, `currentColor`, `inherit`, `initial`, `unset` (nunca casam).
 */
export function encontrarCoresLiterais(
  codigo: string,
  tipo: "css" | "ts",
): string[] {
  const limpo = removerComentarios(codigo, tipo);
  const linhas = new Set<number>();
  const anotar = (indice: number) => linhas.add(linhaDe(limpo, indice));

  if (tipo === "css") {
    // Declarações: depois de `{` ou `;`, `prop: valor` terminado por `;` ou `}` (não por `{`, que seria seletor).
    const reDeclaracao =
      /([{;]\s*)(--[\w-]+|[a-zA-Z-]+)(\s*:\s*)([^;{}]*)(?=[;}])/g;
    for (const d of limpo.matchAll(reDeclaracao)) {
      const inicioValor = d.index + d[1].length + d[2].length + d[3].length;
      // Tira strings e nomes de variáveis antes de procurar nomes de cor.
      const valor = d[4]
        .replace(RE_STRING, (s) => " ".repeat(s.length))
        .replace(/--[\w-]+/g, (s) => " ".repeat(s.length));
      for (const re of [RE_HEX_CSS, RE_FUNCAO_DE_COR, RE_NOME_DE_COR]) {
        for (const m of valor.matchAll(re)) anotar(inicioValor + m.index);
      }
    }
  } else {
    for (const m of limpo.matchAll(RE_FUNCAO_DE_COR)) anotar(m.index);
    for (const s of limpo.matchAll(RE_STRING)) {
      for (const m of s[2].matchAll(RE_HEX_EM_STRING))
        anotar(s.index + 1 + m.index);
    }
    // Nomes de cor dentro de style={{ … }}.
    for (const estilo of limpo.matchAll(/style=\{\{([\s\S]*?)\}\}/g)) {
      const inicio = estilo.index + "style={{".length;
      for (const s of estilo[1].matchAll(RE_STRING)) {
        for (const m of s[2].matchAll(RE_NOME_DE_COR))
          anotar(inicio + s.index + 1 + m.index);
      }
    }
  }

  return [...linhas]
    .sort((a, b) => a - b)
    .map((l) => `${l}: ${trechoDaLinha(codigo, l)}`);
}

function luminancia(hex: string): number {
  const h = hex.replace("#", "");
  const completo = h.length === 3 ? [...h].map((c) => c + c).join("") : h;
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(completo.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Razão de contraste WCAG 2.x entre duas cores hex (#rgb ou #rrggbb). */
export function razaoDeContraste(hexA: string, hexB: string): number {
  const [a, b] = [luminancia(hexA), luminancia(hexB)].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
}

/* ---------- Classes Tailwind (história 11, ADR 0007) ---------- */

/** Utilitários do Tailwind que recebem cor. */
const PREFIXOS_DE_COR =
  "bg|text|border(?:-[xytrblse])?|outline|ring(?:-offset)?|inset-ring|fill|stroke|decoration|from|via|to|shadow|inset-shadow|drop-shadow|text-shadow|accent|caret|divide|placeholder";

/** Paletas padrão do Tailwind v4. `amber` sozinho é token do portal; `amber-500` não. */
const PALETAS = [
  "red",
  "orange",
  "amber",
  "yellow",
  "lime",
  "green",
  "emerald",
  "teal",
  "cyan",
  "sky",
  "blue",
  "indigo",
  "violet",
  "purple",
  "fuchsia",
  "pink",
  "rose",
  "slate",
  "gray",
  "zinc",
  "neutral",
  "stone",
  "taupe",
  "mauve",
  "mist",
  "olive",
];

/** `-red-500`, `-slate-50`: paleta com tom, em qualquer utilitário. */
const RE_PALETA_COM_TOM = new RegExp(
  `-(?:${PALETAS.join("|")})-(?:50|[1-9]00|950)(?![\\w-])`,
  "g",
);

/** `bg-slate`, `text-white`, `bg-black/50`: paleta sem tom (exceto o token `amber`), preto e branco. */
const RE_PALETA_SEM_TOM = new RegExp(
  `(?<![\\w-])(?:${PREFIXOS_DE_COR})-(?:${[
    ...PALETAS.filter((p) => p !== "amber"),
    "black",
    "white",
  ].join("|")})(?![\\w-])`,
  "g",
);

/**
 * Valor arbitrário: `bg-[…]` (colchete logo depois de `-`) ou propriedade/variante
 * arbitrária `[prop:valor]` (colchete no início da classe, com `:` dentro).
 */
const RE_VALOR_ARBITRARIO = /(-\[|(?<=^|[\s"'`{:!])\[)([^[\]\s]+)\]/g;
/**
 * Sintaxe curta do v4 com fallback: `bg-(--x,#fff)`, `border-(color:--x,white)`. A variável é
 * permitida; o fallback (grupo 1) não pode ser cor literal.
 */
const RE_VARIAVEL_COM_FALLBACK = /-\((?:[a-z-]+:)?--[\w-]+,([^\s"'`]+)\)/g;
const RE_HEX_ARBITRARIO = /#[0-9a-fA-F]{3,8}(?![0-9a-zA-Z])/;
const RE_NOME_DE_COR_ARBITRARIO = new RegExp(
  `(?<![a-zA-Z0-9-])(?:${NOMES_DE_COR.join("|")})(?![a-zA-Z0-9-])`,
  "i",
);

function valorArbitrarioTemCor(valor: string): boolean {
  const limpo = valor
    .replace(/(["'])(?:\\.|(?!\1)[^\\])*\1/g, " ")
    .replace(/--[\w-]+/g, " ");
  return (
    RE_HEX_ARBITRARIO.test(limpo) ||
    new RegExp(RE_FUNCAO_DE_COR.source, "i").test(limpo) ||
    RE_NOME_DE_COR_ARBITRARIO.test(limpo)
  );
}

/**
 * Procura, em código TS/TSX, classes do Tailwind com cor fora dos tokens: valor arbitrário
 * com hex, função de cor ou nome de cor (`bg-[#fff]`, `[color:white]`), fallback literal de
 * variável (`bg-(--x,#fff)`) e paletas padrão
 * (`bg-red-500`, `text-slate-900`, `text-white`). Devolve "linha: trecho" de cada achado.
 * Cor de token entra só pelo nome do tema (`bg-bg`) ou por variável (`bg-(--color-bg)`).
 */
export function encontrarCoresArbitrariasEmClasses(codigo: string): string[] {
  const limpo = removerComentarios(codigo, "ts");
  const linhas = new Set<number>();
  const anotar = (indice: number) => linhas.add(linhaDe(limpo, indice));

  for (const re of [RE_PALETA_COM_TOM, RE_PALETA_SEM_TOM]) {
    for (const m of limpo.matchAll(re)) anotar(m.index);
  }
  for (const m of limpo.matchAll(RE_VALOR_ARBITRARIO)) {
    const ehPropriedade = m[1] === "[";
    if (ehPropriedade && !m[2].includes(":")) continue;
    if (valorArbitrarioTemCor(m[2])) anotar(m.index);
  }
  for (const m of limpo.matchAll(RE_VARIAVEL_COM_FALLBACK)) {
    if (valorArbitrarioTemCor(m[1])) anotar(m.index);
  }

  return [...linhas]
    .sort((a, b) => a - b)
    .map((l) => `${l}: ${trechoDaLinha(codigo, l)}`);
}
