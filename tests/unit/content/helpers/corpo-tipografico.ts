/**
 * Corpo com tudo o que um plugin tipográfico ou um formatador alteraria.
 * É o corpo exato de tests/fixtures/content/basico/materias/alfa-cronica.md (critérios 17 e 37).
 * Os espaços duplos ficam no meio das linhas (no fim, em CommonMark, virariam <br>).
 */
export const CORPO_TIPOGRAFICO = [
  "Ele chegou às 9h -- ou quase -- e disse: “não vou sair”.",
  "",
  'A torcida respondeu com "aspas retas" e um silêncio de 1,5 segundo...',
  "",
  "## Intertítulo da crônica",
  "",
  "O placar marcava 2 a 1 — e o  tempo  corria.",
  "",
  "> Quem não faz, toma... dizia o velho técnico.",
  "",
  "- primeiro item com **negrito**",
  "- segundo item, com *ênfase* & símbolo",
  "",
  "Última linha.",
  "",
  "",
].join("\n");

/** Texto visível esperado no HTML, linha a linha, sem a marcação markdown. */
export const LINHAS_VISIVEIS_ESPERADAS: string[] = [
  "Ele chegou às 9h -- ou quase -- e disse: “não vou sair”.",
  'A torcida respondeu com "aspas retas" e um silêncio de 1,5 segundo...',
  "Intertítulo da crônica",
  "O placar marcava 2 a 1 — e o  tempo  corria.",
  "Quem não faz, toma... dizia o velho técnico.",
  "primeiro item com negrito",
  "segundo item, com ênfase & símbolo",
  "Última linha.",
];
