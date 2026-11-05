-- Secure public registration for one standalone free workspace.
-- The auth account is created through Supabase signUp and must verify its email.
-- A short-lived server-only intent stores a bcrypt PIN hash until first verified login.

create table if not exists private.free_workspace_registration_intents (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  owner_name text not null,
  workspace_name text not null,
  pin_hash text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days')
);

revoke all on table private.free_workspace_registration_intents from public, anon, authenticated;
grant select, insert, delete on table private.free_workspace_registration_intents to service_role;

create or replace function public.prepare_free_single_workspace_registration(
  p_user_id uuid,
  p_email text,
  p_owner_name text,
  p_workspace_name text,
  p_pin text
) returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_owner_name text := btrim(coalesce(p_owner_name, ''));
  v_workspace_name text := btrim(coalesce(p_workspace_name, ''));
  v_auth_email text;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'Registration service access required';
  end if;
  if p_user_id is null then
    raise exception 'Akun autentikasi tidak valid';
  end if;
  select lower(u.email) into v_auth_email
  from auth.users u
  where u.id = p_user_id;
  if not found or v_auth_email is distinct from v_email then
    raise exception 'Email akun autentikasi tidak cocok';
  end if;
  if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then
    raise exception 'Format email tidak valid';
  end if;
  if length(v_owner_name) < 2 or length(v_owner_name) > 120 then
    raise exception 'Nama Owner harus 2 sampai 120 karakter';
  end if;
  if length(v_workspace_name) < 2 or length(v_workspace_name) > 120 then
    raise exception 'Nama workspace harus 2 sampai 120 karakter';
  end if;
  if p_pin !~ '^[0-9]{4}$' then
    raise exception 'PIN harus tepat 4 angka';
  end if;
  if exists (select 1 from public.store_members m where m.user_id = p_user_id and m.is_active) then
    raise exception 'Akun ini sudah terhubung ke workspace';
  end if;
  if exists (select 1 from public.user_security_pins p where p.user_id = p_user_id) then
    raise exception 'Akun ini sudah memiliki PIN keamanan';
  end if;

  delete from private.free_workspace_registration_intents
  where expires_at <= now();

  insert into private.free_workspace_registration_intents(
    user_id, email, owner_name, workspace_name, pin_hash, expires_at
  ) values (
    p_user_id, v_email, v_owner_name, v_workspace_name,
    extensions.crypt(p_pin, extensions.gen_salt('bf')),
    now() + interval '30 days'
  )
  on conflict (user_id) do nothing;

  if not found then
    raise exception 'Pendaftaran workspace untuk akun ini sudah disiapkan';
  end if;
  return true;
end;
$function$;

create or replace function public.complete_free_single_workspace_registration(
  p_user_id uuid
) returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_intent private.free_workspace_registration_intents;
  v_auth_email text;
  v_store_id uuid;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'Registration service access required';
  end if;
  if p_user_id is null then
    raise exception 'Akun autentikasi tidak valid';
  end if;

  select lower(u.email) into v_auth_email
  from auth.users u
  where u.id = p_user_id
    and u.email_confirmed_at is not null;
  if not found then
    raise exception 'Verifikasi email diperlukan sebelum workspace dibuat';
  end if;

  select * into v_intent
  from private.free_workspace_registration_intents i
  where i.user_id = p_user_id
  for update;
  if not found then
    return null;
  end if;
  if v_intent.expires_at <= now() then
    delete from private.free_workspace_registration_intents where user_id = p_user_id;
    raise exception 'Masa persiapan pendaftaran telah berakhir. Silakan hubungi dukungan.';
  end if;
  if v_intent.email is distinct from v_auth_email then
    raise exception 'Email terverifikasi tidak cocok dengan data pendaftaran';
  end if;
  if exists (select 1 from public.store_members m where m.user_id = p_user_id and m.is_active) then
    raise exception 'Akun ini sudah terhubung ke workspace';
  end if;

  insert into public.stores(
    name, owner_name, owner_email, status, activated_at, expires_at,
    activation_days, activation_package_key, activation_location_limit,
    workspace_mode
  ) values (
    v_intent.workspace_name, v_intent.owner_name, v_intent.email, 'active', now(), null,
    null, 'free_workspace', 1, 'single_workspace'
  ) returning id into v_store_id;

  insert into public.store_members(store_id, user_id, role, email, full_name, is_active)
  values (v_store_id, p_user_id, 'owner', v_intent.email, v_intent.owner_name, true);

  insert into public.store_settings(store_id, store_name)
  values (v_store_id, v_intent.workspace_name);

  insert into public.user_security_pins(user_id, pin_hash)
  values (p_user_id, v_intent.pin_hash);

  delete from private.free_workspace_registration_intents where user_id = p_user_id;
  return v_store_id;
end;
$function$;

revoke all on function public.prepare_free_single_workspace_registration(uuid,text,text,text,text) from public, anon, authenticated;
revoke all on function public.complete_free_single_workspace_registration(uuid) from public, anon, authenticated;
grant execute on function public.prepare_free_single_workspace_registration(uuid,text,text,text,text) to service_role;
grant execute on function public.complete_free_single_workspace_registration(uuid) to service_role;
