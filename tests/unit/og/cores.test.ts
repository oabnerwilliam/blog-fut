import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CORES_DA_PREVIA } from "@/lib/og/cores";
import { extrairBloco, lerVariaveis, removerComentarios } from "../helpers/css";

const RAIZ = path.resolve(__dirname, "../../..");
const tokensCss = removerComentarios(
  readFileSync(path.join(RAIZ, "src/styles/tokens.css"), "utf8"),
);
const claro = lerVariaveis(extrairBloco(tokensCss, ":root"));
const escuro = lerVariaveis(
  extrairBloco(tokensCss, ':root[data-theme="dark"]'),
);

/**
 * O `ImageResponse` não lê CSS: as cores da prévia são literais em `src/lib/og/cores.ts`.
 * Cada uma é a cópia de um token (README do design da T02, "Notas para implementar").
 */
const ORIGEM: Record<keyof typeof CORES_DA_PREVIA, string | undefined> = {
  noite: claro["--color-night"],
  noiteClara: escuro["--color-night"],
  marfim: claro["--color-night-ink"],
  cinza: claro["--color-night-ink-muted"],
  ambar: claro["--color-amber"],
  filete: claro["--color-night-rule"],
  tintaDoSelo: claro["--color-badge-ink"],
};

describe("cores da prévia", () => {
  it.each(Object.entries(ORIGEM))("%s é a cópia do token", (nome, token) => {
    expect(token).toBeDefined();
    expect(
      CORES_DA_PREVIA[nome as keyof typeof CORES_DA_PREVIA].toLowerCase(),
    ).toBe(token!.toLowerCase());
  });
});
