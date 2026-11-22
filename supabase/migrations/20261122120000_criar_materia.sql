-- História 18: editor de texto (spec v2 §7.7 e O1; ADRs 0008 e 0009).
-- O painel cria matérias novas: rascunho com fonte 'painel' + revisão 1, numa transação.
--
-- Não destrutiva: a produção já tem matérias. Esta migração só cria uma função nova e dá
-- execute a ela. Nada é apagado nem alterado nas tabelas, e nenhuma função existente muda.

-- ---------------------------------------------------------------------------
-- Criar: uma matéria nova do painel, em rascunho
-- ---------------------------------------------------------------------------
-- `campos` vem de src/lib/admin/tipos.ts (camposDaCriacaoSchema), já validado pelo zod no
-- servidor: slug, titulo, titulo_seo, linha_fina, editoria, tags, meta_description,
-- palavras_chave, autor, ficticio e corpo_md. Chaves a mais são ignoradas.
--
-- A checagem de admin é a mesma da história 17 (migração _painel.sql), na primeira linha:
-- service_role (testes e comandos locais) ou o perfil aprovado (`eh_admin()`); pendente,
-- recusado, revogado e a conexão sem JWT recebem 42501 e nada é gravado.
--
-- O que a função grava:
-- - articles: fonte 'painel', origem nula, status 'rascunho', revisao_publicada nula e
--   revisao_em_edicao 1. O anon não lê rascunho (RLS da história 13), e o webhook não
--   avisa o site (a matéria não é pública), então nada muda no cache;
-- - article_revisions: a revisão 1, com origem_da_revisao 'painel' e autor_id = auth.uid()
--   (nulo quando quem chama é a service_role).
--
-- `publicado_em` não vem do painel: é a data de hoje em São Paulo (a redação está no
-- Brasil; às 22h de Brasília já é amanhã em UTC). A primeira publicação copia a data da
-- revisão (publicar_revisao, regra da história 15), então a data editorial é a da
-- criação.
--
-- As tags novas não entram em public.tags: como no salvar_revisao da 17, o site mostra o
-- rótulo humanizado do slug, e quem dá rótulo a uma tag é a importação.
--
-- Slug existente é recusado com o hint `slug_ja_existe`, sem gravar nada. Dois pedidos
-- com o mesmo slug ao mesmo tempo: o segundo cai no unique de articles.slug e recebe a
-- mesma recusa. Uma chamada RPC é uma transação: qualquer exceção desfaz tudo.
create function public.criar_materia(campos jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_slug text := campos->>'slug';
  v_tags text[];
  v_palavras text[];
  v_id uuid;
begin
  if auth.role() is distinct from 'service_role' and not public.eh_admin() then
    raise exception 'Só um admin aprovado cria matérias.'
      using errcode = '42501', hint = 'nao_autorizado';
  end if;

  -- O zod do servidor já validou; isto segura quem chama a RPC direto. As mesmas regras
  -- do salvar_revisao, mais o formato do slug e das tags (os checks de articles e de
  -- tags.slug). Os outros campos caem nos checks e not null de articles, tratados abaixo.
  if v_slug is null or v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'O slug precisa estar em kebab-case minúsculo (a-z, 0-9 e -).'
      using errcode = 'P0001', hint = 'campos_invalidos';
  end if;
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
  select coalesce(array_agg(t.valor order by t.posicao), '{}')
    into v_tags
    from jsonb_array_elements_text(campos->'tags') with ordinality as t (valor, posicao);
  select coalesce(array_agg(p.valor order by p.posicao), '{}')
    into v_palavras
    from jsonb_array_elements_text(coalesce(campos->'palavras_chave', '[]')) with ordinality as p (valor, posicao);
  if exists (select 1 from unnest(v_tags) as t (slug) where t.slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$') then
    raise exception 'Cada tag precisa estar em kebab-case minúsculo (a-z, 0-9 e -).'
      using errcode = 'P0001', hint = 'campos_invalidos';
  end if;

  if exists (select 1 from public.articles a where a.slug = v_slug) then
    raise exception 'Já existe uma matéria com o slug %.', v_slug
      using errcode = 'P0001', hint = 'slug_ja_existe';
  end if;

  begin
    insert into public.articles (
      slug, titulo, titulo_seo, linha_fina, editoria, tags, meta_description,
      palavras_chave, publicado_em, autor, ficticio, corpo_md,
      status, fonte, origem, revisao_publicada, revisao_em_edicao
    ) values (
      v_slug,
      campos->>'titulo',
      campos->>'titulo_seo',
      campos->>'linha_fina',
      campos->>'editoria',
      v_tags,
      campos->>'meta_description',
      v_palavras,
      (now() at time zone 'America/Sao_Paulo')::date,
      campos->>'autor',
      (campos->>'ficticio')::boolean,
      campos->>'corpo_md',
      'rascunho', 'painel', null, null, 1
    )
    returning id into v_id;
  exception
    -- Outro pedido gravou o mesmo slug entre o exists acima e este insert.
    when unique_violation then
      raise exception 'Já existe uma matéria com o slug %.', v_slug
        using errcode = 'P0001', hint = 'slug_ja_existe';
    -- Título, linha fina ou autor vazios, editoria fora da lista: os checks de articles.
    when check_violation or not_null_violation then
      raise exception 'Algum campo obrigatório está vazio ou fora da lista.'
        using errcode = 'P0001', hint = 'campos_invalidos';
  end;

  -- Revisão 1: o snapshot do que acabou de entrar em articles, assinado por quem criou.
  insert into public.article_revisions (
    article_id, numero, titulo, titulo_seo, linha_fina, editoria, tags,
    meta_description, palavras_chave, publicado_em, autor, ficticio, corpo_md,
    autor_id, origem_da_revisao
  )
  select a.id, 1, a.titulo, a.titulo_seo, a.linha_fina, a.editoria, a.tags,
         a.meta_description, a.palavras_chave, a.publicado_em, a.autor, a.ficticio,
         a.corpo_md, auth.uid(), 'painel'
    from public.articles a
   where a.id = v_id;

  return v_id;
end;
$$;

comment on function public.criar_materia(jsonb) is
  'Editor do painel (história 18): matéria em rascunho (fonte painel, origem nula) + revisão 1 assinada por auth.uid(). Só service_role ou admin aprovado.';

-- ---------------------------------------------------------------------------
-- Permissões
-- ---------------------------------------------------------------------------
-- authenticated executa; quem barra o não aprovado é a primeira linha da função. O anon
-- fica sem execute.
revoke execute on function public.criar_materia(jsonb) from public, anon;
grant execute on function public.criar_materia(jsonb) to authenticated, service_role;
