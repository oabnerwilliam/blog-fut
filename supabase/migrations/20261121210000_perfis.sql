-- História 16: login Google e solicitações de acesso (spec v2 §7.1, §7.2 e §7.6; ADR 0009).
-- Perfis criados no primeiro login, public.eh_admin() e as políticas do admin.
--
-- Não destrutiva: a produção já tem matérias. Nada é apagado nem alterado nas tabelas da
-- história 13. A única coisa trocada é a política de leitura das tags, que passa a
-- esconder as tags usadas só por rascunhos (sugestão do PR #19).

-- ---------------------------------------------------------------------------
-- Perfis
-- ---------------------------------------------------------------------------
create table public.perfis (
  user_id uuid primary key references auth.users (id) on delete cascade,
  -- vem do Google; nulo só se o provedor não mandar e-mail
  email text,
  nome text,
  avatar_url text,
  status text not null default 'pendente' check (status in ('pendente', 'aprovado', 'recusado', 'revogado')),
  -- um papel só por enquanto; o check deixa explícito o que existe
  papel text not null default 'admin' check (papel in ('admin')),
  -- set null: apagar quem decidiu não apaga a decisão
  decidido_por uuid references auth.users (id) on delete set null,
  decidido_em timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.perfis is
  'Quem já entrou no /admin. status decide o acesso; o primeiro admin vem do pnpm admin:promover.';

-- Primeiro login (insert em auth.users) → perfil pendente, com nome e avatar do Google.
-- security definer: quem insere em auth.users é o serviço do Auth, que não tem acesso a
-- public.perfis. search_path vazio: tudo qualificado.
create function public.criar_perfil_do_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfis (user_id, email, nome, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(
      nullif(btrim(new.raw_user_meta_data->>'full_name'), ''),
      nullif(btrim(new.raw_user_meta_data->>'name'), '')
    ),
    coalesce(
      nullif(btrim(new.raw_user_meta_data->>'avatar_url'), ''),
      nullif(btrim(new.raw_user_meta_data->>'picture'), '')
    )
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger perfis_ao_criar_usuario
  after insert on auth.users
  for each row execute function public.criar_perfil_do_usuario();

revoke execute on function public.criar_perfil_do_usuario() from public, anon, authenticated;

-- Quem já existia em auth.users antes desta migração também ganha um perfil pendente.
insert into public.perfis (user_id, email, nome, avatar_url)
select
  u.id,
  u.email,
  coalesce(
    nullif(btrim(u.raw_user_meta_data->>'full_name'), ''),
    nullif(btrim(u.raw_user_meta_data->>'name'), '')
  ),
  coalesce(
    nullif(btrim(u.raw_user_meta_data->>'avatar_url'), ''),
    nullif(btrim(u.raw_user_meta_data->>'picture'), '')
  )
from auth.users u
on conflict (user_id) do nothing;

-- ---------------------------------------------------------------------------
-- eh_admin(): o perfil de quem chama está aprovado
-- ---------------------------------------------------------------------------
-- security definer: lê perfis como dono da tabela, sem passar pelo RLS de perfis (que
-- usa esta função; sem isso, a política chamaria a si mesma). stable: o resultado não
-- muda dentro da mesma consulta, e o Postgres pode avaliar uma vez só.
create function public.eh_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.perfis p
     where p.user_id = (select auth.uid())
       and p.status = 'aprovado'
       and p.papel = 'admin'
  )
$$;

comment on function public.eh_admin() is
  'Verdadeira quando o perfil de auth.uid() está aprovado. Base de todas as políticas do admin.';

-- Só authenticated: as políticas que chamam eh_admin() são todas "to authenticated", então
-- o anon nunca a avalia.
revoke execute on function public.eh_admin() from public, anon;
grant execute on function public.eh_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
-- (select ...) em volta de auth.uid() e eh_admin(): o Postgres avalia uma vez por
-- consulta, e não uma vez por linha.

alter table public.perfis enable row level security;

create policy "cada usuário lê o próprio perfil"
  on public.perfis for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "admin lê todos os perfis"
  on public.perfis for select
  to authenticated
  using ((select public.eh_admin()));

-- Nunca o próprio perfil: o painel não pode ficar sem dono (spec v2 §7.2). E quem decide
-- assina a decisão: decidido_por é sempre quem está logado.
create policy "admin decide o acesso de outro usuário"
  on public.perfis for update
  to authenticated
  using ((select public.eh_admin()) and user_id <> (select auth.uid()))
  with check (
    (select public.eh_admin())
    and user_id <> (select auth.uid())
    and decidido_por = (select auth.uid())
  );

-- Matérias: o admin lê todas (inclusive rascunhos), cria e altera. Nunca apaga.
create policy "admin lê todas as matérias"
  on public.articles for select
  to authenticated
  using ((select public.eh_admin()));

create policy "admin cria matérias"
  on public.articles for insert
  to authenticated
  with check ((select public.eh_admin()));

create policy "admin altera matérias"
  on public.articles for update
  to authenticated
  using ((select public.eh_admin()))
  with check ((select public.eh_admin()));

-- Revisões: só leitura e inserção (spec v2 §7.1). A revisão do painel é sempre assinada
-- por quem está logado; as do squad e da importação só entram pela service_role.
create policy "admin lê as revisões"
  on public.article_revisions for select
  to authenticated
  using ((select public.eh_admin()));

create policy "admin cria revisões do painel"
  on public.article_revisions for insert
  to authenticated
  with check (
    (select public.eh_admin())
    and origem_da_revisao = 'painel'
    and autor_id = (select auth.uid())
  );

-- Tags: o público vê só as usadas por alguma matéria publicada. Uma tag nova de um
-- rascunho não vaza o assunto antes da publicação. O subselect passa pelo RLS de
-- articles de quem lê, que para o anon já é "só publicadas".
drop policy "leitura pública das tags" on public.tags;

create policy "leitura pública das tags de matérias publicadas"
  on public.tags for select
  to anon, authenticated
  using (
    exists (
      select 1
        from public.articles a
       where a.status = 'publicado'
         and a.tags @> array[tags.slug::text]
    )
  );

create policy "admin lê todas as tags"
  on public.tags for select
  to authenticated
  using ((select public.eh_admin()));

-- ---------------------------------------------------------------------------
-- Grants mínimos (defesa em profundidade: mesmo uma política errada não abre delete)
-- ---------------------------------------------------------------------------
-- O Supabase dá "all" a anon e authenticated em toda tabela nova do schema public. O anon
-- já foi limitado na história 13 e não ganha nada aqui.
revoke all on table public.perfis from anon;
revoke all on table public.articles, public.article_revisions, public.tags, public.perfis from authenticated;
grant select, insert, update on table public.articles to authenticated;
grant select, insert on table public.article_revisions to authenticated;
grant select on table public.tags to authenticated;
grant select on table public.perfis to authenticated;
-- Só as colunas da decisão: nem o admin muda e-mail, nome, papel ou created_at de alguém.
grant update (status, decidido_por, decidido_em) on table public.perfis to authenticated;
