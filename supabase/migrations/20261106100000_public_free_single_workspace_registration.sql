-- Public free registration: one real Owner and one standalone single-workspace tenant.
-- The zero-price package is internal to signup and is not published in the paid plan catalog.
alter table public.site_activation_packages
  drop constraint if exists site_activation_packages_package_key_check;
alter table public.site_activation_packages
  add constraint site_activation_packages_package_key_check
  check (package_key in ('starter','growth','business','enterprise','custom','special','single_workspace','free_workspace'));

insert into public.site_activation_packages
  (package_key, name, location_limit, note, prices, features, is_popular, is_active, sort_order)
values
  ('free_workspace', 'Workspace Gratis', 1,
   'Satu workspace mandiri untuk pendaftaran gratis melalui homepage.',
   '{"daily":0,"weekly":0,"monthly":0,"yearly":0}'::jsonb,
   array['Satu workspace POS mandiri','Akun Owner dengan password dan PIN pribadi','Produk, stok, transaksi, dan laporan']::text[],
   false, false, 999)
on conflict (package_key) do update
set name = excluded.name, location_limit = 1, note = excluded.note,
    prices = excluded.prices, features = excluded.features, is_active = false,
    updated_at = now();

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
    null, 'free_workspace', 1, 'single_workspace'
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
