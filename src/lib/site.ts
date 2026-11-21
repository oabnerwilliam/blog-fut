export const NOME_DO_PORTAL = "Zona Mista";
export const SLOGAN = "Futebol depois do apito";
/** Slogan longo do cabeçalho, nas duas linhas do mockup. Também compõe a `description`. */
export const SLOGAN_LONGO = [
  "Análise, crônica e reportagem",
  "apuradas pelo squad-fut",
] as const;
/** `description` dos metadados do portal, montada a partir do `SLOGAN_LONGO`. */
export const DESCRICAO_DO_PORTAL = `${SLOGAN_LONGO[0]} de futebol ${SLOGAN_LONGO[1]}.`;
/** Constante: `new Date().getFullYear()` em render quebra o prerender com `cacheComponents`. */
export const ANO_DO_COLOFAO = 2026;

/**
 * Lê `SITE_URL` (padrão `http://localhost:3000`). Valor que não seja URL http(s) absoluta é erro,
 * e também valor com algo além da origem (caminho, query, hash): o `metadataBase` e o JSON-LD
 * montam as URLs a partir da raiz, então `https://x.com/blog` geraria links errados.
 */
export function lerUrlDoSite(
  env: Readonly<Record<string, string | undefined>>,
): URL {
  const valor = env.SITE_URL ?? "http://localhost:3000";
  let url: URL | null = null;
  try {
    url = new URL(valor);
  } catch {
    url = null;
  }
  if (!url || (url.protocol !== "http:" && url.protocol !== "https:")) {
    throw new Error(
      `SITE_URL inválido: "${valor}". Use uma URL http(s) absoluta, por exemplo https://zonamista.com.br.`,
    );
  }
  // `href` guarda até um "?" ou "#" vazio; só a origem com a barra final passa.
  if (url.href !== `${url.origin}/`) {
    throw new Error(
      `SITE_URL inválido: "${valor}". Use só a origem do site (protocolo, domínio e porta), sem caminho, query ou hash, por exemplo https://zonamista.com.br.`,
    );
  }
  return url;
}

/** URL base do portal: `metadataBase` do layout e URLs absolutas do JSON-LD. */
export const SITE_URL = lerUrlDoSite(process.env);
