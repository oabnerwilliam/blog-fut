-- História 14: webhook de invalidação do cache (spec v2 §7.4 e U13; ADR 0008, §7).
-- Toda gravação em articles e tags avisa o site (POST /api/revalidar), que invalida as
-- etiquetas do cache. A URL e o segredo ficam no Vault, gravados por ambiente com
-- `pnpm db:vault` (scripts/configurar-vault.ts). Nada de URL nem segredo neste arquivo.

-- pg_net: HTTP assíncrono. O pedido entra numa fila e sai depois do commit, por um
-- worker em segundo plano; a gravação não espera a resposta do site.
create extension if not exists pg_net with schema extensions;

-- ---------------------------------------------------------------------------
-- Trigger: monta o payload e enfileira o POST
-- ---------------------------------------------------------------------------
-- security definer: quem grava (service_role nos comandos, admin na história 16) não
-- lê o Vault nem chama net.http_post direto. search_path vazio: tudo qualificado.
create function public.avisar_revalidacao()
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
begin
  -- update que não mudou nada (ex.: o recálculo da busca que deu o mesmo texto)
  if tg_op = 'UPDATE' and row(new.*) is not distinct from row(old.*) then
    return null;
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

comment on function public.avisar_revalidacao() is
  'Webhook de invalidação do cache: POST em url_revalidar (Vault) com x-revalidate-secret.';

create trigger articles_avisar_revalidacao
  after insert or update or delete on public.articles
  for each row execute function public.avisar_revalidacao();

create trigger tags_avisar_revalidacao
  after insert or update or delete on public.tags
  for each row execute function public.avisar_revalidacao();

revoke execute on function public.avisar_revalidacao() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Configuração do Vault por ambiente (pnpm db:vault)
-- ---------------------------------------------------------------------------
-- Grava ou atualiza url_revalidar e segredo_revalidar. Só a service_role executa.
-- As mensagens de erro nunca citam o segredo.
create function public.configurar_revalidacao(p_url text, p_segredo text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if p_url is null or p_url !~ '^https?://[^\s]+/api/revalidar$' then
    raise exception 'url_revalidar inválida: precisa ser http(s)://<base>/api/revalidar';
  end if;
  if p_segredo is null or length(p_segredo) < 16 then
    raise exception 'segredo_revalidar ausente ou curto demais (mínimo de 16 caracteres)';
  end if;

  select s.id into v_id from vault.secrets s where s.name = 'url_revalidar';
  if v_id is null then
    perform vault.create_secret(p_url, 'url_revalidar', 'Destino do webhook de invalidação do cache');
  else
    perform vault.update_secret(v_id, p_url);
  end if;

  v_id := null;
  select s.id into v_id from vault.secrets s where s.name = 'segredo_revalidar';
  if v_id is null then
    perform vault.create_secret(p_segredo, 'segredo_revalidar', 'Header x-revalidate-secret do webhook');
  else
    perform vault.update_secret(v_id, p_segredo);
  end if;
end;
$$;

-- Apaga os dois segredos: o webhook volta a não fazer nada (usado no fim do e2e de banco).
create function public.remover_revalidacao()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from vault.secrets where name in ('url_revalidar', 'segredo_revalidar');
$$;

revoke execute on function public.configurar_revalidacao(text, text) from public, anon, authenticated;
revoke execute on function public.remover_revalidacao() from public, anon, authenticated;
grant execute on function public.configurar_revalidacao(text, text) to service_role;
grant execute on function public.remover_revalidacao() to service_role;
