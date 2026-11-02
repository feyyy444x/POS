-- Allow the named Khusus activation package to use a per-organization
-- tenant quota while retaining the package key 'special' in organization/store records.
create or replace function public.activate_store_tenant(
  p_store_id uuid,
  p_duration_days integer,
  p_package_key text,
  p_location_limit integer
) returns public.stores
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_store public.stores;
  v_package public.site_activation_packages;
  v_org public.owner_organizations;
  v_location_limit integer;
  v_expiry timestamptz;
  v_tenant_count integer;
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

  if p_package_key in ('custom', 'special') then
    if p_location_limit is null or p_location_limit < 1 or p_location_limit > 1000 then
      raise exception 'Kuota Paket Khusus harus 1 sampai 1000 tenant';
    end if;
    v_location_limit := p_location_limit;
  else
    select * into v_package
    from public.site_activation_packages
    where package_key = p_package_key and is_active = true;
    if not found then
      raise exception 'Paket aktivasi tidak ditemukan atau sedang nonaktif';
    end if;
    v_location_limit := v_package.location_limit;
    if p_location_limit is not null and p_location_limit <> v_location_limit then
      raise exception 'Kuota paket standar tidak boleh diubah melalui aktivasi Custom';
    end if;
  end if;

  select count(*)::integer into v_tenant_count
  from public.stores s
  where s.organization_id = v_org.id
    and s.is_primary_workspace = false
    and s.status <> 'deleted'
    and s.deleted_at is null;

  if v_tenant_count > v_location_limit then
    raise exception 'Penyesuaian tenant diperlukan sebelum aktivasi. Saat ini % tenant terdaftar, sedangkan kuota yang dipilih hanya %. Hapus tenant yang tidak digunakan terlebih dahulu.',
      v_tenant_count, v_location_limit;
  end if;

  v_expiry := now() + make_interval(days => p_duration_days);

  update public.owner_organizations
  set activation_package_key = p_package_key,
      activation_location_limit = v_location_limit,
      status = 'active',
      activated_at = now(),
      expires_at = v_expiry,
      activation_days = p_duration_days,
      updated_at = now()
  where id = v_org.id;

  update public.stores
  set status = 'active',
      activated_at = now(),
      expires_at = v_expiry,
      activation_days = p_duration_days,
      activation_package_key = p_package_key,
      activation_location_limit = v_location_limit
  where organization_id = v_org.id
    and status <> 'deleted'
    and deleted_at is null;

  select * into v_store from public.stores where id = p_store_id;
  return v_store;
end;
$function$;

revoke all on function public.activate_store_tenant(uuid, integer, text, integer) from public, anon;
grant execute on function public.activate_store_tenant(uuid, integer, text, integer) to authenticated;
notify pgrst, 'reload schema';
