-- História 13: o Supabase como fonte das matérias (spec v2 §7.1 e §7.2; ADR 0008).
-- Leitura pública só de matérias publicadas e de tags. As políticas de admin chegam na história 16.

-- ---------------------------------------------------------------------------
-- Normalização da busca: espelho de normalizarParaBusca (src/lib/content/search.ts).
-- O JS faz: NFD → remove as marcas (\p{M}) → minúsculas → colapsa espaços (\s+) → apara.
-- O `unaccent` não é usado: ele também troca pontuação e ligaduras (“ → ", œ → oe, ½ → 1/2),
-- e o termo que chega do JS continuaria com o caractere original (ADR 0008).
-- ---------------------------------------------------------------------------
create function public.normalizar_busca(texto text)
returns text
language sql
immutable
strict
parallel safe
set search_path = ''
as $$
  select btrim(
    regexp_replace(
      lower(
        regexp_replace(
          normalize(texto, NFD),
          -- marcas combinantes (\p{M}) que aparecem em texto latino, grego e cirílico
          '[̀-ͯ҃-҉᪰-᫿᷀-᷿⃐-⃿︠-︯]',
          '',
          'g'
        )
      ),
      -- o \s do JavaScript: espaços ASCII, NBSP e os espaços Unicode
      '[\u0009-\u000d    -     　﻿]+',
      ' ',
      'g'
    ),
    ' '
  )
$$;

comment on function public.normalizar_busca(text) is
  'Espelho de normalizarParaBusca (JS): sem acento, minúsculas e espaços colapsados.';

-- ---------------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------------
create table public.tags (
  -- collate "C": a mesma ordem do JS (comparação por code point)
  slug text collate "C" primary key
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  rotulo text not null check (btrim(rotulo) <> '')
);

create table public.articles (
  id uuid primary key default gen_random_uuid(),
  -- collate "C": "ordem publicado_em desc, slug asc" igual ao `<` do JS (compararArtigos)
  slug text collate "C" not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  titulo text not null check (btrim(titulo) <> ''),
  titulo_seo text,
  linha_fina text not null check (btrim(linha_fina) <> ''),
  -- espelho de src/lib/editorias.ts
  editoria text not null check (editoria in ('analise', 'cronica', 'noticia', 'coluna', 'perfil', 'entrevista', 'reportagem')),
  -- slugs de tag na ordem do frontmatter; o rótulo vem de public.tags
  tags text[] not null check (cardinality(tags) >= 1),
  meta_description text,
  palavras_chave text[] not null default '{}',
  publicado_em date not null,
  autor text not null check (btrim(autor) <> ''),
  ficticio boolean not null,
  origem text,
  corpo_md text not null,
  status text not null default 'rascunho' check (status in ('rascunho', 'publicado')),
  fonte text not null check (fonte in ('squad', 'painel', 'importacao')),
  -- nula enquanto a matéria nunca foi publicada
  revisao_publicada integer check (revisao_publicada >= 1),
  revisao_em_edicao integer not null default 1 check (revisao_em_edicao >= 1),
  -- mantida pelo trigger articles_antes_de_gravar; nunca gravada pelo app
  busca_normalizada text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- matéria real entregue pelo squad precisa de origem (spec v2 §7.1)
  constraint articles_origem_ck check (ficticio or fonte <> 'squad' or coalesce(btrim(origem), '') <> ''),
  constraint articles_publicada_tem_revisao_ck check (status <> 'publicado' or revisao_publicada is not null)
);

create index articles_publicadas_idx on public.articles (publicado_em desc, slug) where status = 'publicado';
create index articles_tags_idx on public.articles using gin (tags);

-- Somente inserção: nenhuma política permite update ou delete (spec v2 §7.1).
create table public.article_revisions (
  id uuid primary key default gen_random_uuid(),
  -- restrict: apagar a matéria não apaga o histórico por acidente
  article_id uuid not null references public.articles (id) on delete restrict,
  numero integer not null check (numero >= 1),
  -- snapshot completo dos campos editoriais
  titulo text not null,
  titulo_seo text,
  linha_fina text not null,
  editoria text not null,
  tags text[] not null,
  meta_description text,
  palavras_chave text[] not null default '{}',
  publicado_em date not null,
  autor text not null,
  ficticio boolean not null,
  corpo_md text not null,
  -- nulo quando a revisão veio do squad ou da importação
  autor_id uuid references auth.users (id) on delete set null,
  origem_da_revisao text not null check (origem_da_revisao in ('squad', 'painel', 'importacao')),
  created_at timestamptz not null default now(),
  unique (article_id, numero)
);

-- ---------------------------------------------------------------------------
-- busca_normalizada: espelho de textoBuscavel (src/lib/content/search.ts).
-- Título, linha fina, para cada tag o slug com "-" virando espaço e o rótulo, e o corpo,
-- cada um normalizado, um por linha. Tag sem rótulo em public.tags usa o slug com espaços,
-- que é o rótulo humanizado (humanizarTag) depois de normalizado.
-- ---------------------------------------------------------------------------
create function public.calcular_busca_normalizada(
  p_titulo text,
  p_linha_fina text,
  p_tags text[],
  p_corpo text
)
returns text
language plpgsql
stable
set search_path = ''
as $$
declare
  partes text[] := array[p_titulo, p_linha_fina];
  v_slug text;
  v_rotulo text;
begin
  foreach v_slug in array p_tags loop
    select t.rotulo into v_rotulo from public.tags t where t.slug = v_slug;
    partes := partes
      || replace(v_slug, '-', ' ')
      || coalesce(v_rotulo, replace(v_slug, '-', ' '));
  end loop;
  partes := partes || p_corpo;
  return (
    select string_agg(public.normalizar_busca(parte), E'\n' order by posicao)
    from unnest(partes) with ordinality as u (parte, posicao)
  );
end;
$$;

create function public.articles_antes_de_gravar()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.busca_normalizada := public.calcular_busca_normalizada(
    new.titulo, new.linha_fina, new.tags, new.corpo_md
  );
  -- updated_at só anda quando algo mudou de fato
  if tg_op = 'UPDATE' then
    if row(new.*) is distinct from row(old.*) then
      new.updated_at := now();
    end if;
  end if;
  return new;
end;
$$;

create trigger articles_antes_de_gravar
  before insert or update on public.articles
  for each row execute function public.articles_antes_de_gravar();

-- Rótulo novo, alterado ou removido: recalcula a busca das matérias que usam a tag.
-- security definer: o recálculo acontece mesmo que quem editou a tag não grave articles.
create function public.tags_depois_de_gravar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  slugs text[];
begin
  if tg_op = 'INSERT' then
    slugs := array[new.slug::text];
  elsif tg_op = 'UPDATE' then
    slugs := array[old.slug::text, new.slug::text];
  else
    slugs := array[old.slug::text];
  end if;
  update public.articles a
     set busca_normalizada = public.calcular_busca_normalizada(a.titulo, a.linha_fina, a.tags, a.corpo_md)
   where a.tags && slugs;
  return null;
end;
$$;

create trigger tags_depois_de_gravar
  after insert or update or delete on public.tags
  for each row execute function public.tags_depois_de_gravar();

-- ---------------------------------------------------------------------------
-- Busca por RPC (ADR 0008): todo termo precisa aparecer como substring literal.
-- strpos, e não ilike: no ilike, "%" e "_" são curingas. Os termos chegam normalizados
-- por termosDaBusca (JS). security invoker: o RLS de articles vale aqui também.
-- ---------------------------------------------------------------------------
create function public.buscar_artigos(termos text[])
returns setof public.articles
language sql
stable
security invoker
set search_path = ''
as $$
  select a.*
    from public.articles a
   where cardinality(termos) > 0
     and not exists (
       select 1
         from unnest(termos) as t (termo)
        where t.termo is null or strpos(a.busca_normalizada, t.termo) = 0
     )
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.articles enable row level security;
alter table public.article_revisions enable row level security;
alter table public.tags enable row level security;

create policy "leitura pública das matérias publicadas"
  on public.articles for select
  to anon, authenticated
  using (status = 'publicado');

create policy "leitura pública das tags"
  on public.tags for select
  to anon, authenticated
  using (true);

-- O visitante anônimo só lê, mesmo que uma política futura erre (defesa em profundidade).
revoke all on table public.articles, public.article_revisions, public.tags from anon;
grant select on table public.articles, public.tags to anon;

-- Funções internas dos triggers não ficam expostas como RPC.
revoke execute on function public.articles_antes_de_gravar() from public, anon, authenticated;
revoke execute on function public.tags_depois_de_gravar() from public, anon, authenticated;
