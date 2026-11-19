-- RASCUNHO DE DOCUMENTAÇÃO: não é executado na v1. Ver spec 6.3 (docs/superpowers/specs/2026-11-19-blog-fut-design.md).
--
-- Espelha o frontmatter de content/materias/*.md (spec 6.2), com os mesmos nomes
-- de campo, para que o futuro SupabaseArticleRepository mapeie linha por linha.
-- Nenhum script, teste de banco ou código da v1 aplica esta migração.

create table articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  titulo text not null,
  titulo_seo text,
  linha_fina text not null,
  -- espelho de src/lib/editorias.ts
  editoria text not null check (editoria in ('analise', 'cronica', 'noticia', 'coluna', 'perfil', 'entrevista', 'reportagem')),
  tags text[] not null check (cardinality(tags) >= 1),
  meta_description text,
  palavras_chave text[] not null default '{}',
  publicado_em date not null,
  autor text not null,
  ficticio boolean not null,
  origem text,
  corpo_md text not null,
  created_at timestamptz not null default now(),
  -- matéria real precisa de origem não vazia (decisão do usuário 3 da história 02)
  constraint articles_origem_ck check (ficticio or coalesce(btrim(origem), '') <> '')
);

-- Busca full-text em português sobre título, linha fina e corpo.
-- Ignorar acentos no Supabase exige a extensão unaccent dentro de um wrapper
-- immutable; a decisão fica para o ADR do Supabase.
create index articles_busca_idx on articles using gin (to_tsvector('portuguese', coalesce(titulo,'') || ' ' || coalesce(linha_fina,'') || ' ' || coalesce(corpo_md,'')));
