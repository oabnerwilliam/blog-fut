const DATA_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Formatação fixa em UTC: a data é de calendário, então o fuso do servidor não pode mudar o dia. */
const POR_EXTENSO = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** Abreviações da capa (mockup: "06 nov"). Fixas, sem o ponto que o Intl põe em pt-BR. */
const MESES_ABREVIADOS = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
] as const;

interface DataDeCalendario {
  readonly ano: number;
  /** 1 a 12. */
  readonly mes: number;
  readonly dia: number;
}

/** Lê "AAAA-MM-DD" sem passar por fuso. Lança erro se o texto não for uma data válida. */
function lerDataIso(iso: string): DataDeCalendario {
  const partes = DATA_ISO.exec(iso);
  const [ano, mes, dia] = (partes ?? []).slice(1).map(Number);
  const data = partes ? new Date(Date.UTC(ano, mes - 1, dia)) : null;
  if (!data || data.getUTCMonth() !== mes - 1 || data.getUTCDate() !== dia) {
    throw new Error(`Data inválida: "${iso}". Use AAAA-MM-DD.`);
  }
  return { ano, mes, dia };
}

const doisDigitos = (n: number) => String(n).padStart(2, "0");

/** "2026-10-20" → "20 de outubro de 2026". Lança erro se o texto não for AAAA-MM-DD válido. */
export function formatarData(iso: string): string {
  const { ano, mes, dia } = lerDataIso(iso);
  return POR_EXTENSO.format(new Date(Date.UTC(ano, mes - 1, dia)));
}

/** "2026-11-19" → "19.11.2026" (ficha do destaque da capa). */
export function formatarDataCurta(iso: string): string {
  const { ano, mes, dia } = lerDataIso(iso);
  return `${doisDigitos(dia)}.${doisDigitos(mes)}.${ano}`;
}

/** "2026-11-16" → "16.11" (linhas de Últimas na capa). */
export function formatarDiaMesCurto(iso: string): string {
  const { mes, dia } = lerDataIso(iso);
  return `${doisDigitos(dia)}.${doisDigitos(mes)}`;
}

/** "2026-11-06" → { dia: "06", mes: "nov" } (faixas de editoria na capa). */
export function formatarDiaMes(iso: string): { dia: string; mes: string } {
  const { mes, dia } = lerDataIso(iso);
  return { dia: doisDigitos(dia), mes: MESES_ABREVIADOS[mes - 1] };
}
