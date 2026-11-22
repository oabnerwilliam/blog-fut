/**
 * Risco 5 (história 17): o corpo e os campos de uma revisão vêm do usuário (o painel) ou
 * do squad. No histórico, a revisão aberta e a comparação mostram esse texto cru, linha a
 * linha: tudo precisa sair escapado, nunca como HTML. Um `<script>` ou um `<img onerror>`
 * no corpo aparece como texto.
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// As actions reais puxam a sessão e o cache do Next; aqui só importa a marcação.
vi.mock("@/lib/admin/materias", () => ({
  restaurarRevisao: vi.fn(async () => ({ ok: true, numero: 3 })),
}));

const { PainelDaRevisao, PainelDeComparacao } =
  await import("@/components/admin/materias/Historico");
const { RetornoDasAcoes } = await import("@/components/admin/RetornoDasAcoes");

import type {
  CamposDaRevisao,
  HistoricoDaMateria,
  RevisaoCompleta,
} from "@/lib/admin/tipos";

const HOSTIL_SCRIPT = `<script>alert("xss")</script>`;
const HOSTIL_IMG = `<img src=x onerror="alert(1)">`;

const CAMPOS_BASE: CamposDaRevisao = {
  titulo: "Título antigo",
  titulo_seo: null,
  linha_fina: "Linha fina",
  editoria: "analise",
  tags: ["psg"],
  meta_description: null,
  palavras_chave: [],
  autor: "Redação",
  ficticio: false,
  corpo_md: "Primeira linha.\nSegunda linha.\n",
};

const HOSTIS: CamposDaRevisao = {
  ...CAMPOS_BASE,
  titulo: `Título ${HOSTIL_SCRIPT}`,
  linha_fina: `Fina ${HOSTIL_IMG}`,
  autor: `Autor ${HOSTIL_IMG}`,
  corpo_md: `Primeira linha.\n${HOSTIL_SCRIPT}\n${HOSTIL_IMG}\n`,
};

function revisao(numero: number, campos: CamposDaRevisao): RevisaoCompleta {
  return {
    numero,
    origem: numero === 1 ? "squad" : "painel",
    autor: campos.autor,
    criadaEm: "2026-11-21T12:00:00.000Z",
    titulo: campos.titulo,
    editoria: campos.editoria,
    campos,
  };
}

const HISTORICO: HistoricoDaMateria = {
  id: "00000000-0000-4000-8000-000000000001",
  slug: "materia-de-teste",
  status: "publicado",
  fonte: "squad",
  origem: "squad-fut",
  publicadoEm: "2026-11-20",
  revisaoPublicada: 1,
  revisaoEmEdicao: 2,
  titulo: HOSTIS.titulo,
  editoria: "analise",
  revisoes: [revisao(2, HOSTIS), revisao(1, CAMPOS_BASE)],
};

function html(filho: ReturnType<typeof createElement>): string {
  return renderToStaticMarkup(createElement(RetornoDasAcoes, null, filho));
}

function semHtmlAtivo(saida: string) {
  // O React põe o próprio <script> de replay do formulário; o do corpo não pode aparecer.
  expect(saida).not.toContain(HOSTIL_SCRIPT);
  expect(saida).not.toContain("<script>alert");
  expect(saida).not.toMatch(/<img[^>]*onerror/i);
  expect(saida).toContain("&lt;script&gt;");
  expect(saida).toContain("&lt;img src=x onerror=");
}

describe("histórico: o texto das revisões sai escapado", () => {
  it("a comparação (diff do corpo e campos alterados) não injeta HTML", () => {
    const saida = html(
      createElement(PainelDeComparacao, {
        historico: HISTORICO,
        de: revisao(1, CAMPOS_BASE),
        para: revisao(2, HOSTIS),
      }),
    );
    semHtmlAtivo(saida);
  });

  it("a revisão aberta (ficha e corpo) não injeta HTML", () => {
    const saida = html(
      createElement(PainelDaRevisao, {
        historico: HISTORICO,
        revisao: revisao(2, HOSTIS),
      }),
    );
    semHtmlAtivo(saida);
  });
});
