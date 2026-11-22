import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CHAPEU,
  LINHA_FINA,
  LINK,
  TITULO_DA_MATERIA,
} from "@/components/admin/classes";
import { EditorDeMateria } from "@/components/admin/materias/EditorDeMateria";
import { SituacaoDaMateria } from "@/components/admin/materias/Marcas";
import { criarMateria, previsualizar } from "@/lib/admin/materias";
import { lerTagsExistentes } from "@/lib/admin/painel";
import {
  criarClienteDoServidor,
  exigirAdminLigado,
  obterSessaoDoAdmin,
} from "@/lib/auth/servidor";

export const metadata: Metadata = { title: "Nova matéria" };

/**
 * `/admin/materias/nova` (história 18, critério 5; README de docs/design/18-editor). O
 * segmento estático `nova` vence o dinâmico `[id]`.
 *
 * A página confere a sessão de novo (ADR 0009): admin ligado, perfil aprovado, senão
 * `notFound()`. Nada aqui roda no prerender: o `exigirAdminLigado()` espera a requisição
 * (`connection()`) antes de ler a config. As tags existentes vêm com a sessão de quem
 * está logado (o RLS só mostra todas ao admin), e o autor começa com o nome do Google.
 */
export default async function NovaMateria() {
  await exigirAdminLigado();
  const sessao = await obterSessaoDoAdmin();
  if (sessao?.perfil?.status !== "aprovado") notFound();
  const tagsExistentes = await lerTagsExistentes(
    await criarClienteDoServidor(),
  );

  return (
    <main id="conteudo" tabIndex={-1}>
      <div className="wrap pt-(--space-section)">
        <p className="label mb-5">
          <Link
            className={`inline-flex min-h-(--tap-min) items-center ${LINK}`}
            href="/admin/materias"
          >
            ← Matérias
          </Link>
        </p>
        <p className="label flex flex-wrap items-center gap-x-[0.8rem] gap-y-[0.35rem]">
          <span className={CHAPEU}>Matérias</span>
          <span>
            <SituacaoDaMateria status="rascunho" rotulo="Sai como rascunho" />
          </span>
        </p>
        <h1 className={TITULO_DA_MATERIA}>Nova matéria</h1>
        <p className={`${LINHA_FINA} max-w-[52ch]`}>
          Escreva, confira na prévia e crie o rascunho. Depois você revisa e
          publica na página de edição.
        </p>
        <EditorDeMateria
          autorPadrao={sessao.perfil.nome?.trim() ?? ""}
          criar={criarMateria}
          previsualizar={previsualizar}
          tagsExistentes={tagsExistentes}
        />
      </div>
    </main>
  );
}
