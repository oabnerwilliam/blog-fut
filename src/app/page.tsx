import { CapaVazia } from "@/components/capa/CapaVazia";
import { DestaqueDaCapa } from "@/components/capa/DestaqueDaCapa";
import { EditoriasDaCapa } from "@/components/capa/EditoriasDaCapa";
import { FaixaDaEditoria } from "@/components/capa/FaixaDaEditoria";
import { UltimasDaCapa } from "@/components/capa/UltimasDaCapa";
import { montarCapa } from "@/lib/capa";
import { getRepository } from "@/lib/content";

/**
 * Capa (mockup variacao-2/capa.html). Estática: o conteúdo só muda a cada build.
 * O h1 é visualmente oculto; cada seção tem seu h2, e o título do destaque é o h2 dele.
 */
export default async function Capa() {
  const { destaque, ultimas, editorias, faixas } =
    await montarCapa(getRepository());

  return (
    <main id="conteudo" tabIndex={-1}>
      <h1 className="sr-only">Zona Mista: futebol depois do apito</h1>
      {destaque ? (
        <>
          <DestaqueDaCapa materia={destaque} />
          <UltimasDaCapa materias={ultimas} />
          <EditoriasDaCapa editorias={editorias} />
          {faixas.map((faixa) => (
            <FaixaDaEditoria faixa={faixa} key={faixa.editoria.slug} />
          ))}
        </>
      ) : (
        <CapaVazia />
      )}
    </main>
  );
}
