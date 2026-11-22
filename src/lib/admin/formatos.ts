/**
 * Formatação das telas do admin (história 16). Funções puras, sem `server-only`: os
 * componentes do admin (inclusive os de cliente) usam.
 */
import type { StatusDoPerfil } from "@/lib/auth/servidor";

/** A redação está no Brasil: "pediu em 21.11.2026 · 09:14" no horário de São Paulo. */
const FUSO = "America/Sao_Paulo";

const PARTES = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function partes(iso: string): Record<string, string> {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) {
    throw new Error(`Data inválida: "${iso}".`);
  }
  return Object.fromEntries(
    PARTES.formatToParts(data).map((p) => [p.type, p.value]),
  );
}

/** "2026-11-21T12:14:00Z" → "21.11.2026". */
export function formatarDataDoAdmin(iso: string): string {
  const p = partes(iso);
  return `${p.day}.${p.month}.${p.year}`;
}

/** "2026-11-21T12:14:00Z" → "21.11.2026 · 09:14". */
export function formatarDataEHoraDoAdmin(iso: string): string {
  const p = partes(iso);
  return `${p.day}.${p.month}.${p.year} · ${p.hour}:${p.minute}`;
}

/**
 * Iniciais do avatar sem foto: a primeira letra da primeira e da última palavra do nome.
 * Sem nome, a primeira letra do e-mail. Sem os dois, "?".
 */
export function iniciaisDe(
  nome: string | null | undefined,
  email: string | null | undefined,
): string {
  const palavras = (nome ?? "").trim().split(/\s+/).filter(Boolean);
  if (palavras.length > 0) {
    const primeira = [...palavras[0]][0];
    const ultima =
      palavras.length > 1 ? [...palavras[palavras.length - 1]][0] : "";
    return `${primeira}${ultima}`.toLocaleUpperCase("pt-BR");
  }
  const letra = [...(email ?? "").trim()][0];
  return letra ? letra.toLocaleUpperCase("pt-BR") : "?";
}

/** A palavra da situação. O símbolo (○ ● ✕ —) vem do CSS da `Situacao`. */
const ROTULOS: Record<StatusDoPerfil, string> = {
  pendente: "Pendente",
  aprovado: "Aprovado(a)",
  recusado: "Recusado",
  revogado: "Revogado(a)",
};

export function rotuloDaSituacao(status: StatusDoPerfil): string {
  return ROTULOS[status];
}

/** O nome que a tela mostra: o do Google, ou o e-mail, ou "Sem nome". */
export function nomeParaExibir(
  nome: string | null | undefined,
  email: string | null | undefined,
): string {
  return nome?.trim() || email?.trim() || "Sem nome";
}
