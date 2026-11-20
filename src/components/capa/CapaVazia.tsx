/** Capa sem nenhuma matéria visível (ex.: MOSTRAR_EXEMPLOS=false só com fictícias). */
export function CapaVazia() {
  return (
    <div className="wrap pt-(--space-section)">
      <p
        className="max-w-(--layout-measure) font-text text-dek leading-normal text-pretty"
        data-capa-vazia=""
      >
        As primeiras matérias estão sendo preparadas.
      </p>
    </div>
  );
}
