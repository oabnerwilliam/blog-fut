const DATA_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Formatação fixa em UTC: a data é de calendário, então o fuso do servidor não pode mudar o dia. */
const POR_EXTENSO = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** "2026-10-20" → "20 de outubro de 2026". Lança erro se o texto não for AAAA-MM-DD válido. */
export function formatarData(iso: string): string {
  const partes = DATA_ISO.exec(iso);
  const [ano, mes, dia] = (partes ?? []).slice(1).map(Number);
  const data = partes ? new Date(Date.UTC(ano, mes - 1, dia)) : null;
  if (!data || data.getUTCMonth() !== mes - 1 || data.getUTCDate() !== dia) {
    throw new Error(`Data inválida: "${iso}". Use AAAA-MM-DD.`);
  }
  return POR_EXTENSO.format(data);
}
