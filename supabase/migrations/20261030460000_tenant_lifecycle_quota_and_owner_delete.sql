-- Enforce tenant quota on active operations while preserving inactive tenant data.
-- Package activation is blocked until Admin/Super Admin has selected an allowed active set.
create or replace function public.activate_store_tenant(
  p_store_id uuid,
  p_duration_days integer,
  p_package_key text
)
returns public.stores
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_store public.stores;
  v_package public.site_activation_packages;
  v_org public.owner_organizations;
  v_expiry timestamptz;
  v_active_tenants integer;
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

  select * into v_store
  from public.stores
  where id = p_store_id and status <> 'deleted' and deleted_at is null
  for update;
  if not found then
    raise exception 'Tenant tidak ditemukan atau sudah diarsipkan';
  end if;

  select * into v_org
  from public.owner_organizations
  where id = v_store.organization_id
  for update;
  if not found then
    raise exception 'Organisasi Owner tidak ditemukan';
  end if;

  select * into v_package
  from public.site_activation_packages
  where package_key = p_package_key and is_active = true;
  if not found then
    raise exception 'Paket aktivasi tidak ditemukan atau sedang nonaktif';
  end if;

  select count(*)::integer into v_active_tenants
  from public.stores s
  where s.organization_id = v_org.id
    and s.is_primary_workspace = false
    and s.status = 'active'
    and s.deleted_at is null;

  if v_active_tenants > v_package.location_limit then
    raise exception 'Penyesuaian tenant diperlukan sebelum aktivasi %. Saat ini % tenant aktif, sedangkan kuota paket hanya %. Admin/Super Admin harus menonaktifkan tenant yang tidak dipilih terlebih dahulu.',
      v_package.name, v_active_tenants, v_package.location_limit;
  end if;

  v_expiry := now() + make_interval(days => p_duration_days);

  update public.owner_organizations
  set activation_package_key = v_package.package_key,
      activation_location_limit = v_package.location_limit,
      status = 'active',
      activated_at = now(),
      expires_at = v_expiry,
      activation_days = p_duration_days,
      updated_at = now()
  where id = v_org.id;

  -- Preserve each tenant's Admin-selected status. Inactive tenants stay retained
  -- and can be reactivated individually after the organization activation succeeds.
  update public.stores
  set activated_at = now(),
      expires_at = v_expiry,
      activation_days = p_duration_days,
      activation_package_key = v_package.package_key,
      activation_location_limit = v_package.location_limit
  where organization_id = v_org.id
    and status <> 'deleted'
    and deleted_at is null;

  select * into v_store from public.stores where id = p_store_id;
  return v_store;
end;
$function$;

revoke all on function public.activate_store_tenant(uuid, integer, text) from public, anon;
grant execute on function public.activate_store_tenant(uuid, integer, text) to authenticated;

-- Admin NexaPos and Super Admin can enable/disable an individual tenant.
-- Reactivation is serialized on the organization row and cannot exceed its active quota.
create or replace function public.set_store_tenant_status(p_store_id uuid, p_status text)
returns public.stores
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_store public.stores;
  v_org public.owner_organizations;
  v_active_tenants integer;
begin
  if not private.is_super_admin() then
    raise exception 'Super Admin access required';
  end if;
  if not private.is_pin_verified() then
    raise exception 'Verifikasi PIN diperlukan untuk mengubah status tenant';
  end if;
  if p_status not in ('active','pending','suspended') then
    raise exception 'Status tenant tidak diizinkan';
  end if;

  select * into v_store
  from public.stores
  where id = p_store_id and status <> 'deleted' and deleted_at is null
  for update;
  if not found then
    raise exception 'Tenant tidak ditemukan atau sudah dihapus permanen';
  end if;

  select * into v_org
  from public.owner_organizations
  where id = v_store.organization_id
  for update;
  if not found then
    raise exception 'Organisasi Owner tidak ditemukan';
  end if;

  if p_status = 'active' then
    if v_org.status <> 'active' or (v_org.expires_at is not null and v_org.expires_at <= now()) then
      raise exception 'Aktivasi tenant ditolak. Aktifkan masa sewa organisasi melalui Custom Aktivasi terlebih dahulu.';
    end if;
    if v_store.expires_at is not null and v_store.expires_at <= now() then
      raise exception 'Masa sewa tenant telah berakhir. Perbarui Custom Aktivasi organisasi terlebih dahulu.';
    end if;

    if not v_store.is_primary_workspace then
      select count(*)::integer into v_active_tenants
      from public.stores s
      where s.organization_id = v_org.id
        and s.is_primary_workspace = false
        and s.status = 'active'
        and s.deleted_at is null
        and s.id <> v_store.id;
      if v_active_tenants >= v_org.activation_location_limit then
        raise exception 'Kuota tenant aktif paket % sudah penuh (% tenant). Nonaktifkan tenant lain terlebih dahulu sebelum mengaktifkan tenant ini.',
          v_org.activation_package_key, v_org.activation_location_limit;
      end if;
    end if;
  end if;

  update public.stores
  set status = p_status,
      deleted_at = null
  where id = p_store_id
  returning * into v_store;

  return v_store;
end;
$function$;

revoke all on function public.set_store_tenant_status(uuid, text) from public, anon;
grant execute on function public.set_store_tenant_status(uuid, text) to authenticated;

-- Owner can permanently remove an inactive tenant without deleting the Owner organization.
-- Active tenants must first be disabled by Admin/Super Admin.
create or replace function public.owner_delete_store_tenant(p_store_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_store public.stores;
  v_org public.owner_organizations;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  select * into v_store
  from public.stores
  where id = p_store_id
    and status <> 'deleted'
    and deleted_at is null
  for update;
  if not found then
    raise exception 'Tenant tidak ditemukan atau sudah dihapus permanen';
  end if;

  if not private.is_store_owner(p_store_id) then
    raise exception 'Hanya Owner organisasi pemilik tenant yang dapat menghapus tenant ini';
  end if;

  select * into v_org
  from public.owner_organizations
  where id = v_store.organization_id;

  if v_store.status = 'active'
    and (v_store.expires_at is null or v_store.expires_at > now())
    and v_org.status = 'active'
    and (v_org.expires_at is null or v_org.expires_at > now()) then
    raise exception 'Tenant masih aktif. Minta Admin/Super Admin menonaktifkan tenant terlebih dahulu sebelum menghapusnya.';
  end if;

  perform private.delete_store_tenant_data(p_store_id);
end;
$function$;

revoke all on function public.owner_delete_store_tenant(uuid) from public, anon;
grant execute on function public.owner_delete_store_tenant(uuid) to authenticated;

-- Keep lifecycle records available to authorized clients for realtime refresh.
do $$
declare
  t text;
begin
  foreach t in array array['stores','owner_organizations','store_settings','store_members','platform_audit_logs']
  loop
    if to_regclass('public.' || t) is not null
      and not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = t
      ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
