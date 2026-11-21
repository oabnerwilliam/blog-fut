import type { SupabaseClient } from "@supabase/supabase-js";

/** Apaga tudo das três tabelas (revisões primeiro, por causa do `on delete restrict`). */
export async function limparBanco(servico: SupabaseClient): Promise<void> {
  for (const [tabela, coluna] of [
    ["article_revisions", "id"],
    ["articles", "id"],
    ["tags", "slug"],
  ] as const) {
    const { error } = await servico
      .from(tabela)
      .delete()
      .not(coluna, "is", null);
    if (error) throw new Error(`limpar ${tabela}: ${error.message}`);
  }
}
