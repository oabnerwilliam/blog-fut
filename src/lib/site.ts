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
