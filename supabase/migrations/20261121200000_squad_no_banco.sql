-- História 15: o squad-fut entrega no banco (spec v2 §7.5 e U6; ADR 0008).
-- `pnpm materia:enviar` grava a matéria como rascunho + revisão 1 (enviar_materia_do_squad)
-- e `pnpm materia:publicar` copia a revisão em edição para o que o site lê (publicar_revisao).
-- O webhook da história 14 passa a avisar o site só quando uma matéria pública muda.

-- ---------------------------------------------------------------------------
-- Envio do squad: tags que faltam + matéria em rascunho + revisão 1, numa transação só
-- ---------------------------------------------------------------------------
-- `dados` vem de scripts/lib/materias.ts (dadosDoEnvio), já validado pelo parser da v1:
--   slug, titulo, titulo_seo, linha_fina, editoria, tags (lista na ordem do frontmatter),
--   meta_description, palavras_chave, publicado_em (AAAA-MM-DD), autor, ficticio, origem,
--   corpo_md (literal) e rotulos ({ "<slug da tag>": "<rótulo humanizado>" }).
-- Uma chamada RPC é uma transação: qualquer exceção desfaz tudo, inclusive as tags novas.
create function public.enviar_materia_do_squad(dados jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_slug text := dados->>'slug';
  v_tags text[];
  v_palavras text[];
  v_id uuid;
begin
  if coalesce(v_slug, '') = '' then
    raise exception 'enviar_materia_do_squad: dados sem slug' using errcode = 'P0001';
  end if;

  -- Reenvio é decisão do painel (história 17): slug existente é recusado sem gravar nada.
  if exists (select 1 from public.articles a where a.slug = v_slug) then
    raise exception 'Já existe uma matéria com o slug %.', v_slug
      using errcode = 'P0001', hint = 'materia_ja_existe';
  end if;

  select coalesce(array_agg(t.valor order by t.posicao), '{}')
    into v_tags
    from jsonb_array_elements_text(coalesce(dados->'tags', '[]')) with ordinality as t (valor, posicao);
  select coalesce(array_agg(p.valor order by p.posicao), '{}')
    into v_palavras
    from jsonb_array_elements_text(coalesce(dados->'palavras_chave', '[]')) with ordinality as p (valor, posicao);

  -- Tags antes da matéria: o trigger de articles usa o rótulo na busca_normalizada.
  -- Tag que já existe fica como está (o rótulo dela pode ter sido escolhido à mão).
  insert into public.tags (slug, rotulo)
  select t.slug, coalesce(dados->'rotulos'->>t.slug, replace(t.slug, '-', ' '))
    from unnest(v_tags) as t (slug)
  on conflict (slug) do nothing;

  begin
    insert into public.articles (
      slug, titulo, titulo_seo, linha_fina, editoria, tags, meta_description,
      palavras_chave, publicado_em, autor, ficticio, origem, corpo_md,
      status, fonte, revisao_publicada, revisao_em_edicao
    ) values (
      v_slug,
      dados->>'titulo',
      dados->>'titulo_seo',
      dados->>'linha_fina',
      dados->>'editoria',
      v_tags,
      dados->>'meta_description',
      v_palavras,
      (dados->>'publicado_em')::date,
      dados->>'autor',
      (dados->>'ficticio')::boolean,
      dados->>'origem',
      dados->>'corpo_md',
      'rascunho',
      'squad',
      null,
      1
    )
    returning id into v_id;
  exception
    -- Dois envios do mesmo slug ao mesmo tempo: o segundo cai aqui, com a mesma mensagem.
    when unique_violation then
      raise exception 'Já existe uma matéria com o slug %.', v_slug
        using errcode = 'P0001', hint = 'materia_ja_existe';
  end;

  -- Revisão 1: o texto literal da entrega do squad. Nunca é alterada (só inserção).
  insert into public.article_revisions (
    article_id, numero, titulo, titulo_seo, linha_fina, editoria, tags,
    meta_description, palavras_chave, publicado_em, autor, ficticio, corpo_md,
    autor_id, origem_da_revisao
  )
  select a.id, 1, a.titulo, a.titulo_seo, a.linha_fina, a.editoria, a.tags,
         a.meta_description, a.palavras_chave, a.publicado_em, a.autor, a.ficticio,
         a.corpo_md, null, 'squad'
    from public.articles a
   where a.id = v_id;

  return v_id;
end;
$$;

comment on function public.enviar_materia_do_squad(jsonb) is
  'pnpm materia:enviar: tags que faltam + matéria em rascunho (fonte squad) + revisão 1 literal.';

-- ---------------------------------------------------------------------------
-- Publicar: a revisão em edição vira a que o site lê
-- ---------------------------------------------------------------------------
-- Campos editoriais do snapshot (migração _articles.sql, article_revisions): titulo,
-- titulo_seo, linha_fina, editoria, tags, meta_description, palavras_chave, publicado_em,
-- autor, ficticio e corpo_md. A `origem` não faz parte do snapshot e fica como está.
--
-- `publicado_em` é a data editorial (spec v2 §7.1): na primeira publicação ela vem da
-- revisão (a data do frontmatter, nunca "hoje"); numa matéria que já foi publicada antes,
-- ela não muda.
--
-- História 16: esta função é security definer, e a história 16 abre o execute para
-- `authenticated` (o painel da 17 reaproveita esta função). Quando isso acontecer, a
-- primeira linha do corpo precisa ser `if not public.eh_admin() then raise exception ...`,
-- senão qualquer conta logada publicaria matérias.
create function public.publicar_revisao(p_article_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_artigo public.articles%rowtype;
  v_revisao public.article_revisions%rowtype;
begin
  -- for update: duas publicações ao mesmo tempo não se atropelam
  select * into v_artigo from public.articles a where a.id = p_article_id for update;
  if not found then
    raise exception 'Matéria % não encontrada.', p_article_id
      using errcode = 'P0001', hint = 'materia_inexistente';
  end if;

  select * into v_revisao
    from public.article_revisions r
   where r.article_id = p_article_id and r.numero = v_artigo.revisao_em_edicao;
  if not found then
    raise exception 'A revisão % da matéria % não existe.', v_artigo.revisao_em_edicao, v_artigo.slug
      using errcode = 'P0001', hint = 'revisao_inexistente';
  end if;

  update public.articles a
     set titulo = v_revisao.titulo,
         titulo_seo = v_revisao.titulo_seo,
         linha_fina = v_revisao.linha_fina,
         editoria = v_revisao.editoria,
         tags = v_revisao.tags,
         meta_description = v_revisao.meta_description,
         palavras_chave = v_revisao.palavras_chave,
         publicado_em = case
           when v_artigo.revisao_publicada is null then v_revisao.publicado_em
           else v_artigo.publicado_em
         end,
         autor = v_revisao.autor,
         ficticio = v_revisao.ficticio,
         corpo_md = v_revisao.corpo_md,
         revisao_publicada = v_artigo.revisao_em_edicao,
         status = 'publicado'
   where a.id = p_article_id;
end;
$$;

comment on function public.publicar_revisao(uuid) is
  'pnpm materia:publicar (e o painel, história 17): copia a revisao_em_edicao para articles e publica.';

-- ---------------------------------------------------------------------------
-- Webhook só para o que é público (sugestão do PR #17)
-- ---------------------------------------------------------------------------
-- Igual à versão da história 14, mais uma regra: em articles, só avisa quando a matéria
-- era publicada (old) ou passou a ser (new). Em delete, só o old conta. Gravar um
-- rascunho não invalida o cache do site. As tags são todas públicas: sempre avisam.
-- `create or replace` mantém o dono, os grants e os triggers da história 14.
create or replace function public.avisar_revalidacao()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_segredo text;
  v_slug text;
  v_slug_antigo text;
  v_era_publica boolean := false;
  v_ficou_publica boolean := false;
begin
  -- update que não mudou nada (ex.: o recálculo da busca que deu o mesmo texto)
  if tg_op = 'UPDATE' and row(new.*) is not distinct from row(old.*) then
    return null;
  end if;

  if tg_table_name = 'articles' then
    if tg_op in ('UPDATE', 'DELETE') then
      v_era_publica := old.status = 'publicado';
    end if;
    if tg_op in ('INSERT', 'UPDATE') then
      v_ficou_publica := new.status = 'publicado';
    end if;
    if not (v_era_publica or v_ficou_publica) then
      return null;
    end if;
  end if;

  select s.decrypted_secret into v_url
    from vault.decrypted_secrets s
   where s.name = 'url_revalidar'
   limit 1;
  select s.decrypted_secret into v_segredo
    from vault.decrypted_secrets s
   where s.name = 'segredo_revalidar'
   limit 1;
  -- Sem configuração no Vault (ambiente novo, testes): não faz nada e não quebra.
  if coalesce(btrim(v_url), '') = '' or coalesce(v_segredo, '') = '' then
    return null;
  end if;

  if tg_op = 'DELETE' then
    v_slug := old.slug;
  else
    v_slug := new.slug;
    -- slug_antigo só quando o slug mudou
    if tg_op = 'UPDATE' and old.slug is distinct from new.slug then
      v_slug_antigo := old.slug;
    end if;
  end if;

  perform net.http_post(
    url := v_url,
    body := jsonb_strip_nulls(jsonb_build_object(
      'tabela', tg_table_name,
      'slug', v_slug,
      'slug_antigo', v_slug_antigo
    )),
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-revalidate-secret', v_segredo
    ),
    timeout_milliseconds := 5000
  );
  return null;
exception
  -- O aviso nunca derruba a gravação editorial. O erro fica no log do Postgres, sem
  -- o segredo (sqlerrm não inclui os argumentos).
  when others then
    raise warning 'avisar_revalidacao: o aviso ao site falhou (%)', sqlerrm;
    return null;
end;
$$;

-- ---------------------------------------------------------------------------
-- Permissões: só a service_role (os comandos locais) executa as duas funções novas
-- ---------------------------------------------------------------------------
revoke execute on function public.enviar_materia_do_squad(jsonb) from public, anon, authenticated;
revoke execute on function public.publicar_revisao(uuid) from public, anon, authenticated;
grant execute on function public.enviar_materia_do_squad(jsonb) to service_role;
grant execute on function public.publicar_revisao(uuid) to service_role;
-- O create or replace mantém o revoke da história 14; repetido aqui por clareza.
revoke execute on function public.avisar_revalidacao() from public, anon, authenticated;
