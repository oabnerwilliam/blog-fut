-- História 17: painel com histórico (spec v2 §7.7, U7 e U9; ADRs 0008 e 0009).
-- O painel salva revisões novas, publica a revisão em edição e despublica.
--
-- Não destrutiva: a produção já tem matérias. Nada é apagado nem alterado nas tabelas.
-- A única função trocada é `publicar_revisao` (create or replace, mesma assinatura), que
-- ganha a checagem de admin antes de ser aberta para `authenticated`.
--
-- A checagem das três funções é a mesma, e é a primeira linha de cada corpo:
--   if auth.role() is distinct from 'service_role' and not public.eh_admin() then raise
-- - service_role: os comandos locais (`pnpm materia:publicar`) continuam publicando;
-- - authenticated: só o perfil aprovado (`eh_admin()`); pendente, recusado e revogado
--   recebem erro 42501 e nada é gravado;
-- - `is distinct from`, e não `<>`: sem JWT (conexão direta ao banco), auth.role() é
--   nulo, e o `<>` deixaria passar. Aqui, sem JWT também é recusado.
-- O anon nem chega ao corpo: não tem `execute`.

-- ---------------------------------------------------------------------------
-- Publicar: a revisão em edição vira a que o site lê (agora também pelo painel)
-- ---------------------------------------------------------------------------
-- Igual à versão da história 15, mais a checagem de admin na primeira linha.
-- `create or replace` mantém o dono e os grants; o execute para authenticated vem no fim.
create or replace function public.publicar_revisao(p_article_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_artigo public.articles%rowtype;
  v_revisao public.article_revisions%rowtype;
begin
  if auth.role() is distinct from 'service_role' and not public.eh_admin() then
    raise exception 'Só um admin aprovado publica matérias.'
      using errcode = '42501', hint = 'nao_autorizado';
  end if;

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
  'pnpm materia:publicar e o painel (história 17): copia a revisao_em_edicao para articles e publica. Só service_role ou admin aprovado.';

-- ---------------------------------------------------------------------------
-- Despublicar: a matéria sai do site, e o histórico fica
-- ---------------------------------------------------------------------------
-- Só muda o status. `revisao_publicada` continua apontando para a última revisão que
-- esteve no ar (o check articles_publicada_tem_revisao_ck vale só para publicadas). Os
-- campos de articles também ficam: o anon não lê rascunho, e publicar de novo copia a
-- revisão em edição por cima. O webhook avisa o site (a matéria era pública).
create function public.despublicar_materia(p_article_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.role() is distinct from 'service_role' and not public.eh_admin() then
    raise exception 'Só um admin aprovado despublica matérias.'
      using errcode = '42501', hint = 'nao_autorizado';
  end if;

  perform 1 from public.articles a where a.id = p_article_id for update;
  if not found then
    raise exception 'Matéria % não encontrada.', p_article_id
      using errcode = 'P0001', hint = 'materia_inexistente';
  end if;

  -- Já em rascunho: nada muda (o trigger do webhook ignora update sem mudança).
  update public.articles a
     set status = 'rascunho'
   where a.id = p_article_id
     and a.status <> 'rascunho';
end;
$$;

comment on function public.despublicar_materia(uuid) is
  'Painel (história 17): status → rascunho, mantém revisao_publicada e o histórico. Só service_role ou admin aprovado.';

-- ---------------------------------------------------------------------------
-- Salvar: uma revisão nova do painel, sem tocar no que o site lê (U9)
-- ---------------------------------------------------------------------------
-- `campos` vem de src/lib/admin/tipos.ts (camposEditoriais), já validado pelo zod no
-- servidor: titulo, titulo_seo, linha_fina, editoria, tags, meta_description,
-- palavras_chave, autor, ficticio e corpo_md. Chaves a mais são ignoradas.
--
-- `publicado_em` não vem do painel: a data editorial não muda depois da primeira
-- publicação (spec v2 §7.1). O snapshot copia a data da matéria.
--
-- Uma chamada RPC é uma transação. O `for update` na linha da matéria enfileira dois
-- salvamentos ao mesmo tempo: o segundo espera o primeiro e lê o `max(numero)` novo. Uma
-- revisão inserida por outro caminho (o insert direto que o RLS do admin permite) não
-- passa pelo lock; nesse caso o `unique (article_id, numero)` recusa e a função devolve
-- um erro claro, sem sobrescrever nada.
--
-- Salvar sem mudar nada em relação à revisão em edição não cria revisão: devolve o número
-- dela (dois cliques em "Salvar" não poluem o histórico).
--
-- Só `revisao_em_edicao` muda em articles. Como a matéria pública não muda de status
-- nem de conteúdo, o webhook avisa o site, mas o site mostra o mesmo texto.
create function public.salvar_revisao(p_article_id uuid, campos jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_artigo public.articles%rowtype;
  v_atual public.article_revisions%rowtype;
  v_numero integer;
  v_titulo text := campos->>'titulo';
  v_titulo_seo text := campos->>'titulo_seo';
  v_linha_fina text := campos->>'linha_fina';
  v_editoria text := campos->>'editoria';
  v_meta text := campos->>'meta_description';
  v_autor text := campos->>'autor';
  v_ficticio boolean;
  v_corpo text := campos->>'corpo_md';
  v_tags text[];
  v_palavras text[];
begin
  if auth.role() is distinct from 'service_role' and not public.eh_admin() then
    raise exception 'Só um admin aprovado salva revisões.'
      using errcode = '42501', hint = 'nao_autorizado';
  end if;

  select * into v_artigo from public.articles a where a.id = p_article_id for update;
  if not found then
    raise exception 'Matéria % não encontrada.', p_article_id
      using errcode = 'P0001', hint = 'materia_inexistente';
  end if;

  -- O zod do servidor já validou; isto segura quem chama a RPC direto. Os outros campos
  -- caem nos not null de article_revisions, e o publicar, nos checks de articles.
  if jsonb_typeof(campos->'tags') is distinct from 'array'
     or jsonb_typeof(coalesce(campos->'palavras_chave', '[]')) is distinct from 'array'
     or jsonb_typeof(campos->'ficticio') is distinct from 'boolean' then
    raise exception 'tags e palavras_chave precisam ser listas, e ficticio, true ou false.'
      using errcode = 'P0001', hint = 'campos_invalidos';
  end if;
  if jsonb_array_length(campos->'tags') = 0 then
    raise exception 'A matéria precisa de pelo menos uma tag.'
      using errcode = 'P0001', hint = 'campos_invalidos';
  end if;
  v_ficticio := (campos->>'ficticio')::boolean;
  select coalesce(array_agg(t.valor order by t.posicao), '{}')
    into v_tags
    from jsonb_array_elements_text(campos->'tags') with ordinality as t (valor, posicao);
  select coalesce(array_agg(p.valor order by p.posicao), '{}')
    into v_palavras
    from jsonb_array_elements_text(coalesce(campos->'palavras_chave', '[]')) with ordinality as p (valor, posicao);

  -- A mesma regra de articles_origem_ck: matéria real do squad precisa de origem. Sem
  -- esta checagem, a revisão seria salva e só falharia ao publicar.
  if v_ficticio is false and v_artigo.fonte = 'squad' and coalesce(btrim(v_artigo.origem), '') = '' then
    raise exception 'Uma matéria do squad sem origem precisa continuar fictícia.'
      using errcode = 'P0001', hint = 'origem_obrigatoria';
  end if;

  select * into v_atual
    from public.article_revisions r
   where r.article_id = p_article_id and r.numero = v_artigo.revisao_em_edicao;
  if found
     and v_atual.titulo is not distinct from v_titulo
     and v_atual.titulo_seo is not distinct from v_titulo_seo
     and v_atual.linha_fina is not distinct from v_linha_fina
     and v_atual.editoria is not distinct from v_editoria
     and v_atual.tags is not distinct from v_tags
     and v_atual.meta_description is not distinct from v_meta
     and v_atual.palavras_chave is not distinct from v_palavras
     and v_atual.autor is not distinct from v_autor
     and v_atual.ficticio is not distinct from v_ficticio
     and v_atual.corpo_md is not distinct from v_corpo then
    return v_atual.numero;
  end if;

  select coalesce(max(r.numero), 0) + 1 into v_numero
    from public.article_revisions r
   where r.article_id = p_article_id;

  begin
    insert into public.article_revisions (
      article_id, numero, titulo, titulo_seo, linha_fina, editoria, tags,
      meta_description, palavras_chave, publicado_em, autor, ficticio, corpo_md,
      autor_id, origem_da_revisao
    ) values (
      p_article_id, v_numero, v_titulo, v_titulo_seo, v_linha_fina, v_editoria, v_tags,
      v_meta, v_palavras, v_artigo.publicado_em, v_autor, v_ficticio, v_corpo,
      auth.uid(), 'painel'
    );
  exception
    when unique_violation then
      raise exception 'Outra revisão da matéria foi salva ao mesmo tempo. Recarregue e salve de novo.'
        using errcode = 'P0001', hint = 'revisao_concorrente';
  end;

  update public.articles a
     set revisao_em_edicao = v_numero
   where a.id = p_article_id;

  return v_numero;
end;
$$;

comment on function public.salvar_revisao(uuid, jsonb) is
  'Painel (história 17): insere a revisão max(numero)+1 (origem painel, autor auth.uid()) e muda só revisao_em_edicao. Só service_role ou admin aprovado.';

-- ---------------------------------------------------------------------------
-- Permissões
-- ---------------------------------------------------------------------------
-- authenticated executa as três; quem barra o não aprovado é a primeira linha de cada
-- uma. O anon continua sem execute em nenhuma.
revoke execute on function public.publicar_revisao(uuid) from public, anon;
revoke execute on function public.despublicar_materia(uuid) from public, anon;
revoke execute on function public.salvar_revisao(uuid, jsonb) from public, anon;
grant execute on function public.publicar_revisao(uuid) to authenticated, service_role;
grant execute on function public.despublicar_materia(uuid) to authenticated, service_role;
grant execute on function public.salvar_revisao(uuid, jsonb) to authenticated, service_role;
