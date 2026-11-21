/**
 * Suíte de contrato do ArticleRepository (história 13, ADR 0008).
 *
 * As duas implementações recebem o MESMO conteúdo (tests/fixtures/content/contrato) e
 * precisam dar os MESMOS resultados: o FileArticleRepository roda em `pnpm test`, e o
 * SupabaseArticleRepository em `pnpm test:db`, depois de importar a fixture.
 *
 * A fixture cobre: empate de data com desempate por slug (inclusive `zulu-c` × `zulub`,
 * que só sai certo com collate "C"), tag sem rótulo (`caravana-azul`, `copa-do-litoral`,
 * `ligue-1`), fictícias, acento ("São Paulo"), `%` e `_` no texto.
 */
import path from "node:path";
import { describe, expect, it } from "vitest";
import { readingTime } from "@/lib/content/reading-time";
import type { ArticleRepository } from "@/lib/content/repository";

export const FIXTURE_DO_CONTRATO = path.resolve(
  __dirname,
  "../fixtures/content/contrato",
);

export type CriarRepositorio = (opcoes: {
  mostrarExemplos: boolean;
}) => ArticleRepository | Promise<ArticleRepository>;

const TODAS = [
  "alfa-cronica",
  "bravo-analise",
  "charlie-cronica",
  "delta-noticia",
  "eco-perfil",
  "foxtrot-porcentagem",
  "golf-quinhentos",
  "zulu-c",
  "zulub",
];
const REAIS = ["alfa-cronica", "bravo-analise", "delta-noticia"];

const slugs = (itens: readonly { slug: string }[]) => itens.map((a) => a.slug);

export function descreverContratoDoRepositorio(
  nome: string,
  criar: CriarRepositorio,
): void {
  const comExemplos = () => criar({ mostrarExemplos: true });
  const semExemplos = () => criar({ mostrarExemplos: false });

  describe(`contrato do ArticleRepository: ${nome}`, () => {
    describe("list", () => {
      it("ordena por data decrescente e desempata por slug crescente (code point)", async () => {
        const lista = await (await comExemplos()).list();
        expect(slugs(lista.itens)).toEqual(TODAS);
        expect(lista).toMatchObject({ pagina: 1, totalPaginas: 1, total: 9 });
      });

      it("filtra por editoria e por tag", async () => {
        const repo = await comExemplos();
        expect(slugs((await repo.list({ editoria: "cronica" })).itens)).toEqual(
          ["alfa-cronica", "charlie-cronica"],
        );
        const porTag = await repo.list({ tag: "caravana-azul" });
        expect(slugs(porTag.itens)).toEqual([
          "golf-quinhentos",
          "zulu-c",
          "zulub",
        ]);
        expect(porTag.total).toBe(3);
        expect(
          slugs(
            (await repo.list({ editoria: "reportagem", tag: "fc-aurora" }))
              .itens,
          ),
        ).toEqual(["foxtrot-porcentagem"]);
      });

      it("editoria ou tag sem matéria (ou fora do formato) → lista vazia, sem erro", async () => {
        const repo = await comExemplos();
        for (const opts of [
          { editoria: "entrevista" },
          { editoria: "opiniao" },
          { tag: "nao-existe" },
          { tag: "fc-aurora,ligue-1" },
          { tag: "{fc-aurora}" },
        ]) {
          expect(await repo.list(opts), JSON.stringify(opts)).toEqual({
            itens: [],
            pagina: 1,
            totalPaginas: 0,
            total: 0,
          });
        }
      });

      it("pagina com pageSize e devolve página além da última vazia, com o total", async () => {
        const repo = await comExemplos();
        const segunda = await repo.list({ page: 2, pageSize: 2 });
        expect(slugs(segunda.itens)).toEqual([
          "charlie-cronica",
          "delta-noticia",
        ]);
        expect(segunda).toMatchObject({ pagina: 2, totalPaginas: 5, total: 9 });
        const ultima = await repo.list({ page: 5, pageSize: 2 });
        expect(slugs(ultima.itens)).toEqual(["zulub"]);
        const alem = await repo.list({ page: 6, pageSize: 2 });
        expect(alem).toEqual({
          itens: [],
          pagina: 6,
          totalPaginas: 5,
          total: 9,
        });
        const muitoAlem = await repo.list({ tag: "fc-aurora", page: 40 });
        expect(muitoAlem).toEqual({
          itens: [],
          pagina: 40,
          totalPaginas: 1,
          total: 4,
        });
      });

      it.each([
        [
          { page: 0 },
          'list(): "page" precisa ser um inteiro ≥ 1 (recebido: 0)',
        ],
        [
          { page: 1.5 },
          'list(): "page" precisa ser um inteiro ≥ 1 (recebido: 1.5)',
        ],
        [
          { pageSize: 0 },
          'list(): "pageSize" precisa ser um inteiro ≥ 1 (recebido: 0)',
        ],
        [
          { pageSize: -3 },
          'list(): "pageSize" precisa ser um inteiro ≥ 1 (recebido: -3)',
        ],
      ])("RangeError em %j", async (opts, mensagem) => {
        const repo = await comExemplos();
        const promessa = repo.list(opts);
        await expect(promessa).rejects.toThrow(RangeError);
        await expect(repo.list(opts)).rejects.toThrow(mensagem);
      });

      it("o resumo traz tags com rótulo (humanizado quando falta) e o tempo de leitura", async () => {
        const [alfa] = (await (await comExemplos()).list({ pageSize: 1 }))
          .itens;
        expect(alfa).toEqual({
          slug: "alfa-cronica",
          titulo: "A noite em que o FC Aurora virou o jogo",
          linha_fina:
            "Crônica de uma virada no último minuto da Copa do Litoral",
          editoria: { slug: "cronica", rotulo: "Crônica" },
          tags: [
            { slug: "fc-aurora", rotulo: "FC Aurora" },
            { slug: "copa-do-litoral", rotulo: "Copa do Litoral" },
          ],
          publicado_em: "2026-10-20",
          autor: "Squad Fut",
          ficticio: false,
          tempo_de_leitura: 1,
        });
        expect(Object.keys(alfa)).not.toContain("corpo_md");
      });
    });

    describe("getBySlug", () => {
      it("devolve a matéria completa, com o corpo exatamente como no arquivo", async () => {
        const repo = await comExemplos();
        const corpo = "O anúncio foi feito no centro de treinamento.\n";
        expect(await repo.getBySlug("delta-noticia")).toEqual({
          slug: "delta-noticia",
          titulo: "FC Aurora anuncia novo treinador",
          linha_fina: "O clube confirmou a contratação nesta manhã",
          editoria: { slug: "noticia", rotulo: "Notícia" },
          tags: [{ slug: "fc-aurora", rotulo: "FC Aurora" }],
          publicado_em: "2026-10-01",
          autor: "Squad Fut",
          ficticio: false,
          tempo_de_leitura: readingTime(corpo),
          titulo_seo: null,
          meta_description: null,
          palavras_chave: [],
          origem: "squad-fut/textos/delta-noticia",
          corpo_md: corpo,
        });
        expect(await repo.getBySlug("bravo-analise")).toMatchObject({
          titulo_seo: "FC Aurora e o bloco médio",
          meta_description: "Análise tática do FC Aurora.",
          palavras_chave: ["tática", "bloco médio"],
          tags: [
            { slug: "fc-aurora", rotulo: "FC Aurora" },
            { slug: "ligue-1", rotulo: "Ligue 1" },
          ],
        });
        expect((await repo.getBySlug("charlie-cronica"))?.origem).toBeNull();
      });

      it("inexistente ou malformado → null", async () => {
        const repo = await comExemplos();
        for (const slug of [
          "nao-existe",
          "",
          "Alfa-Cronica",
          "../alfa-cronica",
          "alfa_cronica",
          "alfa-cronica ",
          "a%",
        ]) {
          expect(await repo.getBySlug(slug), JSON.stringify(slug)).toBeNull();
        }
      });
    });

    describe("search", () => {
      it.each(["sao paulo", "SÃO PAULO", "São Paulo", "  são   paulo  "])(
        "ignora acento, caixa e espaços: %j",
        async (consulta) => {
          const repo = await comExemplos();
          expect(slugs(await repo.search(consulta))).toEqual([
            "charlie-cronica",
          ]);
        },
      );

      it("todos os termos precisam aparecer (E lógico), na ordem da lista", async () => {
        const repo = await comExemplos();
        expect(slugs(await repo.search("aurora"))).toEqual([
          "alfa-cronica",
          "bravo-analise",
          "delta-noticia",
          "foxtrot-porcentagem",
        ]);
        expect(slugs(await repo.search("aurora virou"))).toEqual([
          "alfa-cronica",
        ]);
        expect(slugs(await repo.search("aurora treinador"))).toEqual([
          "delta-noticia",
        ]);
        expect(await repo.search("aurora inexistente")).toEqual([]);
      });

      it("acha pelo slug e pelo rótulo humanizado da tag", async () => {
        const repo = await comExemplos();
        expect(slugs(await repo.search("caravana azul"))).toEqual([
          "golf-quinhentos",
          "zulu-c",
          "zulub",
        ]);
        expect(slugs(await repo.search("ligue 1"))).toEqual(["bravo-analise"]);
      });

      it("% e _ são caracteres literais, não curingas", async () => {
        const repo = await comExemplos();
        expect(slugs(await repo.search("50%"))).toEqual([
          "foxtrot-porcentagem",
        ]);
        expect(slugs(await repo.search("1_000"))).toEqual([
          "foxtrot-porcentagem",
        ]);
        // Sozinhos, só acham o texto que tem o caractere (um curinga acharia tudo).
        expect(slugs(await repo.search("%"))).toEqual(["foxtrot-porcentagem"]);
        expect(slugs(await repo.search("_"))).toEqual(["foxtrot-porcentagem"]);
        expect(await repo.search("|")).toEqual([]);
      });

      it("vazio ou só espaços → []", async () => {
        const repo = await comExemplos();
        expect(await repo.search("")).toEqual([]);
        expect(await repo.search("   \t ")).toEqual([]);
      });
    });

    describe("listEditorias e listTags", () => {
      it("editorias na ordem da lista fechada, com os totais (inclusive zero)", async () => {
        expect(await (await comExemplos()).listEditorias()).toEqual([
          { slug: "analise", rotulo: "Análise", total: 1 },
          { slug: "cronica", rotulo: "Crônica", total: 2 },
          { slug: "noticia", rotulo: "Notícia", total: 1 },
          { slug: "coluna", rotulo: "Coluna", total: 2 },
          { slug: "perfil", rotulo: "Perfil", total: 1 },
          { slug: "entrevista", rotulo: "Entrevista", total: 0 },
          { slug: "reportagem", rotulo: "Reportagem", total: 2 },
        ]);
      });

      it("tags por total decrescente e rótulo (pt-BR), com rótulo humanizado", async () => {
        expect(await (await comExemplos()).listTags()).toEqual([
          { slug: "fc-aurora", rotulo: "FC Aurora", total: 4 },
          { slug: "caravana-azul", rotulo: "Caravana Azul", total: 3 },
          { slug: "copa-do-litoral", rotulo: "Copa do Litoral", total: 1 },
          { slug: "liga-da-serra", rotulo: "Liga da Serra", total: 1 },
          { slug: "ligue-1", rotulo: "Ligue 1", total: 1 },
          { slug: "sao-paulo-do-vale", rotulo: "São Paulo do Vale", total: 1 },
        ]);
      });
    });

    describe("MOSTRAR_EXEMPLOS=false", () => {
      it("esconde as fictícias em todas as consultas", async () => {
        const repo = await semExemplos();
        const lista = await repo.list();
        expect(slugs(lista.itens)).toEqual(REAIS);
        expect(lista.total).toBe(3);
        expect(await repo.list({ tag: "caravana-azul" })).toMatchObject({
          itens: [],
          total: 0,
        });
        expect(await repo.getBySlug("charlie-cronica")).toBeNull();
        expect(await repo.search("sao paulo")).toEqual([]);
        expect(slugs(await repo.search("aurora"))).toEqual(REAIS);
        expect(
          (await repo.listEditorias()).map((e) => [e.slug, e.total]),
        ).toEqual([
          ["analise", 1],
          ["cronica", 1],
          ["noticia", 1],
          ["coluna", 0],
          ["perfil", 0],
          ["entrevista", 0],
          ["reportagem", 0],
        ]);
        expect(await repo.listTags()).toEqual([
          { slug: "fc-aurora", rotulo: "FC Aurora", total: 3 },
          { slug: "copa-do-litoral", rotulo: "Copa do Litoral", total: 1 },
          { slug: "ligue-1", rotulo: "Ligue 1", total: 1 },
        ]);
      });
    });
  });
}
