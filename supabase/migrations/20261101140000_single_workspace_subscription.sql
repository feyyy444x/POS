-- Single Workspace subscription model.
-- This is additive: existing NexaSpace organizations and their tenants remain unchanged.

alter table public.stores
  add column if not exists workspace_mode text not null default 'nexaspace'
  check (workspace_mode in ('nexaspace', 'single_workspace'));

alter table public.site_activation_packages
  drop constraint if exists site_activation_packages_package_key_check;
alter table public.site_activation_packages
  add constraint site_activation_packages_package_key_check
  check (package_key in ('starter','growth','business','enterprise','custom','special','single_workspace'));

-- Keep the existing internal Custom and Khusus activation keys valid for the
-- stores/owner_organizations foreign keys. They are not public homepage offers.
insert into public.site_activation_packages
  (package_key, name, location_limit, note, prices, features, is_popular, is_active, sort_order)
values
  ('special', 'Khusus', 1, 'Paket internal; kuota ditentukan Super Admin saat aktivasi.', '{}'::jsonb, '{}'::text[], false, true, 998)
on conflict (package_key) do update
set is_active = true,
    note = excluded.note,
    updated_at = now();

insert into public.site_activation_packages
  (package_key, name, location_limit, note, prices, features, is_popular, is_active, sort_order)
values
  ('single_workspace', 'Single Workspace', 1,
   'Satu workspace mandiri untuk Owner yang mengelola seluruh operasional bisnisnya sendiri.',
   '{"daily":5000,"weekly":15000,"monthly":49000,"yearly":490000}'::jsonb,
   array[
     'Satu workspace POS mandiri',
     'Owner memiliki akses penuh ke seluruh fitur',
     'Manajemen Manager dan Karyawan',
     'Produk, stok, transaksi, dan laporan',
     'Antrean, pengaturan, dan struk'
   ]::text[],
   false, false, 0)
on conflict (package_key) do update
set name = excluded.name,
    note = excluded.note,
    features = excluded.features,
    location_limit = 1,
    updated_at = now();

-- A Single Workspace must never be auto-attached to an Owner organization.
create or replace function private.assign_store_organization()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_email text;
  v_org public.owner_organizations;
  v_count integer;
  v_has_primary boolean;
begin
  if new.workspace_mode = 'single_workspace' then
    new.organization_id := null;
    new.is_primary_workspace := false;
    return new;
  end if;

  if new.organization_id is null then
    v_email := coalesce(nullif(lower(trim(new.owner_email)), ''),
      'tenant-' || new.id::text || '@nexapos.invalid');
    select * into v_org
    from public.owner_organizations
    where owner_email = v_email
    for update;

    if not found then
      insert into public.owner_organizations (
        owner_email, owner_name, activation_package_key, activation_location_limit, status
      )
      values (
        v_email, coalesce(new.owner_name, ''), 'starter', 3, 'pending'
      )
      returning * into v_org;
    end if;
    new.organization_id := v_org.id;
  else
    select * into v_org
    from public.owner_organizations
    where id = new.organization_id
    for update;
    if not found then
      raise exception 'Organisasi Owner tidak ditemukan';
    end if;
  end if;

  select exists (
    select 1 from public.stores s
    where s.organization_id = v_org.id
      and s.is_primary_workspace = true
      and s.status <> 'deleted' and s.deleted_at is null
      and (tg_op <> 'UPDATE' or s.id <> new.id)
  ) into v_has_primary;

  new.is_primary_workspace := not v_has_primary;

  select count(*)::integer into v_count
  from public.stores s
  where s.organization_id = v_org.id
    and s.is_primary_workspace = false
    and s.status <> 'deleted'
    and s.deleted_at is null
    and (tg_op <> 'UPDATE' or s.id <> new.id);

  if not new.is_primary_workspace and v_count >= v_org.activation_location_limit then
    raise exception 'Kuota tenant tambahan paket % sudah penuh (% tenant tambahan). Tingkatkan paket sebelum menambah tenant.',
      v_org.activation_package_key, v_org.activation_location_limit;
  end if;

  new.activation_package_key := v_org.activation_package_key;
  new.activation_location_limit := v_org.activation_location_limit;
  new.activated_at := v_org.activated_at;
  new.expires_at := v_org.expires_at;
  new.activation_days := v_org.activation_days;
  if v_org.status = 'active' and (v_org.expires_at is null or v_org.expires_at > now()) then
    new.status := 'active';
    new.deleted_at := null;
  elsif v_org.status = 'expired' or (v_org.expires_at is not null and v_org.expires_at <= now()) then
    new.status := 'expired';
  elsif v_org.status in ('suspended','deleted') then
    new.status := v_org.status;
  else
    new.status := 'pending';
  end if;
  return new;
end;
$function$;

revoke all on function private.assign_store_organization() from public, anon, authenticated;

-- Create a standalone Owner invitation without creating owner_organizations.
create or replace function public.register_single_workspace(
  p_store_name text,
  p_owner_name text,
  p_owner_email text,
  p_activation_code text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_store_id uuid;
  v_email text;
  v_code text := lower(trim(coalesce(p_activation_code, '')));
begin
  if not private.is_super_admin() then
    raise exception 'Super Admin access required';
  end if;
  if not private.is_pin_verified() then
    raise exception 'Verifikasi PIN diperlukan untuk mendaftarkan Owner';
  end if;
  if nullif(trim(p_store_name), '') is null or char_length(trim(p_store_name)) > 120
     or nullif(trim(p_owner_name), '') is null or char_length(trim(p_owner_name)) > 120 then
    raise exception 'Nama workspace dan nama Owner wajib diisi (maksimal 120 karakter)';
  end if;
  v_email := lower(trim(p_owner_email));
  if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Format email Owner tidak valid';
  end if;
  if v_code !~ '^[a-f0-9]{32}$' then
    raise exception 'Kode aktivasi tidak valid';
  end if;

  insert into public.stores(
    name, owner_name, owner_email, status, workspace_mode,
    activation_package_key, activation_location_limit
  ) values (
    trim(p_store_name), trim(p_owner_name), v_email, 'pending', 'single_workspace',
    'single_workspace', 1
  ) returning id into v_store_id;

  insert into public.store_settings(store_id, store_name)
  values(v_store_id, trim(p_store_name));

  insert into public.store_invites(store_id, email, full_name, role, invited_by, activation_code_hash)
  values(v_store_id, v_email, trim(p_owner_name), 'owner', (select auth.uid()),
         encode(extensions.digest(v_code, 'sha256'), 'hex'));

  return v_store_id;
end;
$function$;

revoke all on function public.register_single_workspace(text,text,text,text) from public, anon;
grant execute on function public.register_single_workspace(text,text,text,text) to authenticated;

-- Standalone activation is independent of organization activation and tenant quotas.
create or replace function public.activate_single_workspace(
  p_store_id uuid,
  p_duration_days integer
) returns public.stores
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_store public.stores;
begin
  if not private.is_super_admin() then
    raise exception 'Super Admin access required';
  end if;
  if not private.is_pin_verified() then
    raise exception 'Verifikasi PIN diperlukan untuk mengubah aktivasi';
  end if;
  if p_duration_days is null or p_duration_days < 1 or p_duration_days > 36500 then
    raise exception 'Durasi harus 1 sampai 36500 hari';
  end if;

  update public.stores
  set status = 'active',
      workspace_mode = 'single_workspace',
      organization_id = null,
      activation_package_key = 'single_workspace',
      activation_location_limit = 1,
      activated_at = now(),
      expires_at = now() + make_interval(days => p_duration_days),
      activation_days = p_duration_days,
      deleted_at = null
  where id = p_store_id
    and workspace_mode = 'single_workspace'
    and status <> 'deleted'
    and deleted_at is null
  returning * into v_store;

  if not found then
    raise exception 'Single Workspace tidak ditemukan atau sudah diarsipkan';
  end if;
  return v_store;
end;
$function$;

revoke all on function public.activate_single_workspace(uuid,integer) from public, anon;
grant execute on function public.activate_single_workspace(uuid,integer) to authenticated;

notify pgrst, 'reload schema';
