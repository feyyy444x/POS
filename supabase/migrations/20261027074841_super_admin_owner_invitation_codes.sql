-- Super Admin can create and reissue one-time activation codes for tenant Owners.
drop function if exists public.register_store_tenant(text, text, text);

create or replace function public.register_store_tenant(
  p_store_name text,
  p_owner_name text,
  p_owner_email text,
  p_activation_code text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_store_id uuid;
  v_email text;
  v_code text := lower(trim(coalesce(p_activation_code, '')));
begin
  if not private.is_super_admin() then
    raise exception 'Super Admin access required';
  end if;
  if nullif(trim(p_store_name), '') is null or nullif(trim(p_owner_name), '') is null then
    raise exception 'Nama toko dan nama pemilik wajib diisi';
  end if;
  v_email := lower(trim(p_owner_email));
  if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Format email pemilik tidak valid';
  end if;
  if v_code !~ '^[a-f0-9]{32}$' then
    raise exception 'Kode aktivasi tidak valid';
  end if;

  insert into public.stores(name, owner_name, owner_email, status)
  values(trim(p_store_name), trim(p_owner_name), v_email, 'pending')
  returning id into v_store_id;

  insert into public.store_settings(store_id, store_name)
  values(v_store_id, trim(p_store_name));

  insert into public.store_invites(store_id, email, full_name, role, invited_by, activation_code_hash)
  values(v_store_id, v_email, trim(p_owner_name), 'owner', (select auth.uid()),
         encode(extensions.digest(v_code, 'sha256'), 'hex'));

  return v_store_id;
end;
$$;
revoke all on function public.register_store_tenant(text, text, text, text) from public, anon;
grant execute on function public.register_store_tenant(text, text, text, text) to authenticated;

create or replace function public.super_admin_regenerate_owner_invite(
  p_store_id uuid,
  p_activation_code text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_store public.stores;
  v_code text := lower(trim(coalesce(p_activation_code, '')));
  v_invite_id uuid;
begin
  if not private.is_super_admin() then
    raise exception 'Super Admin access required';
  end if;
  if v_code !~ '^[a-f0-9]{32}$' then
    raise exception 'Kode aktivasi tidak valid';
  end if;

  select * into v_store
  from public.stores
  where id = p_store_id and status <> 'deleted' and deleted_at is null
  for update;
  if not found then
    raise exception 'Tenant tidak ditemukan atau sudah dihapus';
  end if;
  if nullif(trim(v_store.owner_email), '') is null then
    raise exception 'Email Owner belum terdaftar pada tenant';
  end if;

  delete from public.store_invites
  where store_id = p_store_id
    and lower(email) = lower(v_store.owner_email)
    and role = 'owner'
    and accepted_at is null;

  insert into public.store_invites(
    store_id, email, full_name, role, invited_by, activation_code_hash
  ) values (
    p_store_id, lower(trim(v_store.owner_email)), trim(coalesce(v_store.owner_name, '')),
    'owner', (select auth.uid()), encode(extensions.digest(v_code, 'sha256'), 'hex')
  ) returning id into v_invite_id;

  return v_invite_id;
end;
$$;
revoke all on function public.super_admin_regenerate_owner_invite(uuid, text) from public, anon;
grant execute on function public.super_admin_regenerate_owner_invite(uuid, text) to authenticated;
