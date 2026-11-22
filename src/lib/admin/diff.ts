/**
 * Diff de linhas para comparar duas revisões no histórico (história 17, critério 5).
 *
 * Função pura, sem dependência nova e sem `server-only` (a tela pode usar no cliente).
 * O algoritmo é a maior subsequência comum (LCS): as linhas que ficam iguais são o
 * máximo possível, e o resto vira remoção (da versão antiga) ou adição (da nova).
 *
 * Regras do texto:
 * - `\r\n` e `\r` contam como `\n`: o fim de linha sozinho não é mudança;
 * - a quebra no fim do texto não cria uma linha vazia a mais;
 * - fora isso, a comparação é literal (espaço no fim da linha é diferença).
 */

export type TipoDaLinha = "igual" | "adicionada" | "removida";

export interface LinhaDoDiff {
  readonly tipo: TipoDaLinha;
  readonly texto: string;
  /** O número da linha na versão antiga; nulo numa adição. */
  readonly linhaAntes: number | null;
  /** O número da linha na versão nova; nulo numa remoção. */
  readonly linhaDepois: number | null;
}

/**
 * Teto da tabela da LCS (linhas diferentes da antiga × da nova). Acima disso, o trecho do
 * meio sai como "tudo removido, depois tudo adicionado": correto, só menos fino. Uma
 * matéria tem centenas de linhas; o teto só protege o servidor de um corpo absurdo.
 */
const MAXIMO_DE_CELULAS = 16_000_000;

function linhasDe(texto: string): string[] {
  if (texto === "") return [];
  const linhas = texto.replace(/\r\n?/g, "\n").split("\n");
  if (linhas[linhas.length - 1] === "") linhas.pop();
  return linhas;
}

export function diffDeLinhas(antes: string, depois: string): LinhaDoDiff[] {
  const a = linhasDe(antes);
  const b = linhasDe(depois);
  const saida: LinhaDoDiff[] = [];

  const igual = (i: number, j: number) =>
    saida.push({
      tipo: "igual",
      texto: a[i],
      linhaAntes: i + 1,
      linhaDepois: j + 1,
    });
  const removida = (i: number) =>
    saida.push({
      tipo: "removida",
      texto: a[i],
      linhaAntes: i + 1,
      linhaDepois: null,
    });
  const adicionada = (j: number) =>
    saida.push({
      tipo: "adicionada",
      texto: b[j],
      linhaAntes: null,
      linhaDepois: j + 1,
    });

  // O começo e o fim iguais ficam fora da tabela: numa edição comum, quase tudo é igual.
  let inicio = 0;
  while (inicio < a.length && inicio < b.length && a[inicio] === b[inicio]) {
    inicio++;
  }
  let fimA = a.length;
  let fimB = b.length;
  while (fimA > inicio && fimB > inicio && a[fimA - 1] === b[fimB - 1]) {
    fimA--;
    fimB--;
  }

  for (let k = 0; k < inicio; k++) igual(k, k);

  const n = fimA - inicio;
  const m = fimB - inicio;
  if (n * m > MAXIMO_DE_CELULAS) {
    for (let i = inicio; i < fimA; i++) removida(i);
    for (let j = inicio; j < fimB; j++) adicionada(j);
  } else {
    // tabela[i][j] = tamanho da LCS de a[inicio+i..fimA) e b[inicio+j..fimB).
    const largura = m + 1;
    const tabela = new Uint32Array((n + 1) * largura);
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        tabela[i * largura + j] =
          a[inicio + i] === b[inicio + j]
            ? tabela[(i + 1) * largura + j + 1] + 1
            : Math.max(
                tabela[(i + 1) * largura + j],
                tabela[i * largura + j + 1],
              );
      }
    }
    // Caminha do começo: no empate, a remoção vem antes da adição.
    let i = 0;
    let j = 0;
    while (i < n && j < m) {
      if (a[inicio + i] === b[inicio + j]) {
        igual(inicio + i, inicio + j);
        i++;
        j++;
      } else if (tabela[(i + 1) * largura + j] >= tabela[i * largura + j + 1]) {
        removida(inicio + i);
        i++;
      } else {
        adicionada(inicio + j);
        j++;
      }
    }
    for (; i < n; i++) removida(inicio + i);
    for (; j < m; j++) adicionada(inicio + j);
  }

  for (let k = 0; k < a.length - fimA; k++) igual(fimA + k, fimB + k);
  return saida;
}

/** "+2 −1" do cabeçalho da comparação. */
export function resumoDoDiff(linhas: readonly LinhaDoDiff[]): {
  adicionadas: number;
  removidas: number;
} {
  let adicionadas = 0;
  let removidas = 0;
  for (const linha of linhas) {
    if (linha.tipo === "adicionada") adicionadas++;
    else if (linha.tipo === "removida") removidas++;
  }
  return { adicionadas, removidas };
}

/** Um trecho de linhas iguais escondido: "⋯ 38 linhas iguais (16–53), até o fim". */
export interface TrechoIgual {
  readonly tipo: "pulo";
  readonly quantidade: number;
  /** Primeira e última linha escondidas, na numeração da versão nova. */
  readonly de: number;
  readonly ate: number;
  readonly ateOFim: boolean;
}

export type ItemDoDiff = LinhaDoDiff | TrechoIgual;

/**
 * Esconde os trechos longos de linhas iguais, deixando `contexto` linhas antes e depois
 * de cada mudança (README do design: 2). Um trecho só some se esconder pelo menos 2
 * linhas: trocar 1 linha por "⋯ 1 linha igual" não economiza nada.
 */
export function comContexto(
  linhas: readonly LinhaDoDiff[],
  contexto = 2,
): ItemDoDiff[] {
  const mudou = linhas.map((l) => l.tipo !== "igual");
  if (!mudou.includes(true)) return [...linhas];
  const visivel = linhas.map((_, i) => {
    for (let k = Math.max(0, i - contexto); k <= i + contexto; k++) {
      if (mudou[k]) return true;
    }
    return false;
  });
  const saida: ItemDoDiff[] = [];
  let i = 0;
  while (i < linhas.length) {
    if (visivel[i]) {
      saida.push(linhas[i]);
      i++;
      continue;
    }
    let fim = i;
    while (fim < linhas.length && !visivel[fim]) fim++;
    const quantidade = fim - i;
    if (quantidade < 2) {
      saida.push(...linhas.slice(i, fim));
    } else {
      saida.push({
        tipo: "pulo",
        quantidade,
        de: linhas[i].linhaDepois ?? 0,
        ate: linhas[fim - 1].linhaDepois ?? 0,
        ateOFim: fim === linhas.length,
      });
    }
    i = fim;
  }
  return saida;
}
