import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CHAPEU, LINHA_FINA, TITULO } from "@/components/admin/classes";
import { FiltrosDaLista } from "@/components/admin/materias/FiltrosDaLista";
import { ListaDeMaterias } from "@/components/admin/materias/ListaDeMaterias";
import { listarMateriasDoPainel } from "@/lib/admin/materias";
import {
  filtrarMaterias,
  lerFiltros,
  plural,
  resumirLista,
} from "@/lib/admin/telas";
import { exigirAdminLigado, obterSessaoDoAdmin } from "@/lib/auth/servidor";

export const metadata: Metadata = { title: "Matérias" };

/**
 * `/admin/materias` (história 17, critério 4): todas as matérias do banco, publicadas ou
 * não, com filtros por status, editoria e fonte num `<form method="get">` (README de
 * docs/design/17-painel, "Lista").
 *
 * A página confere a sessão de novo (ADR 0009): o layout do `(painel)` sozinho não
 * protege uma página. A lista vem inteira e é filtrada aqui, para o resumo e a contagem
 * ("Mostrando N de 9") saírem da mesma leitura.
 */
export default async function Materias({
  searchParams,
}: PageProps<"/admin/materias">) {
  await exigirAdminLigado();
  const sessao = await obterSessaoDoAdmin();
  if (sessao?.perfil?.status !== "aprovado") notFound();

  const resultado = await listarMateriasDoPainel({});
  if (!resultado.ok) throw new Error(resultado.mensagem);
  const todas = resultado.materias;
  const filtros = lerFiltros(await searchParams);
  const materias = filtrarMaterias(todas, filtros);
  const resumo = resumirLista(todas);

  return (
    <main id="conteudo" tabIndex={-1}>
      <div className="wrap pt-(--space-section)">
        <p className={CHAPEU}>Admin</p>
        <h1 className={TITULO}>Matérias</h1>
        <p className={LINHA_FINA}>
          Tudo o que está no banco, publicado ou não. Salvar cria uma revisão
          nova; o site só muda quando você publica.
        </p>
        <p className="label mt-5 text-ink-muted [&_b]:font-semibold [&_b]:text-ink">
          <b>{resumo.total}</b> {plural(resumo.total, "matéria", "matérias")} ·{" "}
          <b>{resumo.publicadas}</b>{" "}
          {plural(resumo.publicadas, "publicada", "publicadas")} ·{" "}
          <b>{resumo.rascunhos}</b>{" "}
          {plural(resumo.rascunhos, "rascunho", "rascunhos")} ·{" "}
          <b>{resumo.comAlteracoes}</b> com alterações não publicadas
        </p>
        <FiltrosDaLista filtros={filtros} />
        <ListaDeMaterias
          filtros={filtros}
          materias={materias}
          total={todas.length}
        />
      </div>
    </main>
  );
}
