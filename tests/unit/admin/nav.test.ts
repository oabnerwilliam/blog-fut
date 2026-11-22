/**
 * O item atual da nav do admin (história 17; README de docs/design/17-painel): `page` na
 * lista, `true` na edição e no histórico de uma matéria.
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));
const { atualDaNav } = await import("@/components/admin/NavDoAdmin");

describe("atualDaNav", () => {
  it.each([
    ["/admin", "/admin", "page"],
    ["/admin/materias", "/admin", undefined],
    ["/admin/materias", "/admin/materias", "page"],
    ["/admin/materias/abc", "/admin/materias", "true"],
    ["/admin/materias/abc/historico", "/admin/materias", "true"],
    ["/admin/materiasx", "/admin/materias", undefined],
    ["/admin/acessos", "/admin/materias", undefined],
  ])("%s, item %s: %s", (caminho, href, esperado) => {
    expect(atualDaNav(caminho, href)).toBe(esperado);
  });
});
