"use client";

import Link from "next/link";
import type { ResultadoDoPainel } from "@/lib/admin/tipos";
import { LINK, NOTA } from "../classes";
import { BotaoDeAcao } from "./BotaoDeAcao";

type AcaoDePublicacao = () => Promise<ResultadoDoPainel<{ slug: string }>>;

/**
 * "Publicar alterações" e "Despublicar" (README, "Edição"). Sem nada para publicar, o
 * botão dá lugar a "Nada a publicar.". O Publicar publica a última revisão **salva**.
 */
export function BotoesDePublicacao({
  publicar,
  despublicar,
  temAlgoParaPublicar,
  estaNoSite,
  jaFoiPublicada,
  revisaoEmEdicao,
}: {
  publicar: AcaoDePublicacao;
  despublicar: AcaoDePublicacao;
  temAlgoParaPublicar: boolean;
  estaNoSite: boolean;
  jaFoiPublicada: boolean;
  revisaoEmEdicao: number;
}) {
  return (
    <div className="mt-6 grid gap-5">
      {temAlgoParaPublicar ? (
        <BotaoDeAcao
          acao={publicar}
          cheio
          dica={`Publica a revisão ${revisaoEmEdicao}, a última salva. O que ainda não foi salvo fica de fora.`}
          idDaDica="d-publicar"
          rotulo={
            estaNoSite || jaFoiPublicada ? "Publicar alterações" : "Publicar"
          }
          sucesso={() =>
            `Alterações publicadas. A capa e a página da matéria mostram a revisão ${revisaoEmEdicao}.`
          }
        />
      ) : (
        <p className={NOTA}>Nada a publicar.</p>
      )}
      {estaNoSite && (
        <BotaoDeAcao
          acao={despublicar}
          dica="Tira a matéria do site. O texto e o histórico ficam guardados."
          idDaDica="d-despublicar"
          rotulo="Despublicar"
          sucesso={() =>
            "Matéria despublicada. Ela saiu do site; o texto e o histórico ficam guardados."
          }
        />
      )}
    </div>
  );
}

/** "Restaurar esta versão" e "Restaurar a revisão N" do histórico (README, "Histórico"). */
export function BotaoDeRestaurar({
  restaurar,
  numero,
  proximaRevisao,
  revisaoNoSite,
  linkDaEdicao,
  cheio,
  rotulo,
}: {
  restaurar: () => Promise<ResultadoDoPainel<{ numero: number }>>;
  numero: number;
  proximaRevisao: number;
  revisaoNoSite: number | null;
  linkDaEdicao: string;
  cheio?: boolean;
  rotulo: string;
}) {
  return (
    <div className="mt-5">
      <BotaoDeAcao
        acao={restaurar}
        cheio={cheio}
        dica={`Cria a revisão ${proximaRevisao} com o conteúdo da ${numero} e a deixa em edição. Nada é apagado, e o site não muda até você publicar.`}
        idDaDica={`d-restaurar-${numero}`}
        rotulo={rotulo}
        sucesso={({ numero: nova }) => (
          <>
            Revisão <strong>{numero}</strong> restaurada como revisão{" "}
            <strong>{nova}</strong>.{" "}
            {revisaoNoSite === null
              ? "A matéria continua fora do site até você publicar na "
              : `O site continua na revisão ${revisaoNoSite} até você publicar na `}
            <Link className={LINK} href={linkDaEdicao}>
              edição
            </Link>
            .
          </>
        )}
      />
    </div>
  );
}
