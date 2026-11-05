-- Public free registration: one real Owner and one standalone single-workspace tenant.
-- This migration is prepared for PR #22; it is not applied to production by this change.

create or replace function public.create_free_single_workspace_registration(
  p_user_id uuid,
  p_email text,
  p_owner_name text,
  p_workspace_name text,
  p_pin text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_owner_name text := btrim(coalesce(p_owner_name, ''));
  v_workspace_name text := btrim(coalesce(p_workspace_name, ''));
  v_store_id uuid;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Registration service access required';
  end if;
  if p_user_id is null or not exists (select 1 from auth.users u where u.id = p_user_id and lower(u.email) = v_email) then
    raise exception 'Akun autentikasi tidak valid';
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
  insert into public.stores(
    name, owner_name, owner_email, status, activated_at, expires_at,
    activation_days, activation_package_key, activation_location_limit,
    workspace_mode
  ) values (
    v_workspace_name, v_owner_name, v_email, 'active', now(), null,
    null, 'single_workspace', 1, 'single_workspace'
  ) returning id into v_store_id;

  insert into public.store_members(store_id, user_id, role, email, full_name, is_active)
  values (v_store_id, p_user_id, 'owner', v_email, v_owner_name, true);

  insert into public.store_settings(store_id, store_name)
  values (v_store_id, v_workspace_name);

  insert into public.user_security_pins(user_id, pin_hash)
  values (p_user_id, extensions.crypt(p_pin, extensions.gen_salt('bf')));

  return v_store_id;
end;
$function$;

revoke all on function public.create_free_single_workspace_registration(uuid,text,text,text,text) from public, anon, authenticated;
grant execute on function public.create_free_single_workspace_registration(uuid,text,text,text,text) to service_role;
