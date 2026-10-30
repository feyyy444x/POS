-- Reactivate one suspended tenant without renewing the organization.
-- Preserve organization entitlement, tenant expiry, and package quota checks.
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
  if p_status not in ('active', 'pending', 'suspended') then
    raise exception 'Status tenant tidak diizinkan';
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

  select * into v_org
  from public.owner_organizations
  where id = v_store.organization_id
  for update;

  if not found then
    raise exception 'Organisasi Owner tidak ditemukan';
  end if;

  if p_status = 'active' then
    if v_org.status <> 'active'
      or (v_org.expires_at is not null and v_org.expires_at <= now()) then
      raise exception 'Perusahaan harus aktif dan masa sewanya masih berlaku sebelum tenant dapat diaktifkan.';
    end if;

    if v_store.expires_at is not null and v_store.expires_at <= now() then
      raise exception 'Masa sewa tenant telah berakhir. Perbarui aktivasi perusahaan terlebih dahulu.';
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
      deleted_at = null,
      updated_at = now()
  where id = p_store_id
  returning * into v_store;

  return v_store;
end;
$function$;

revoke all on function public.set_store_tenant_status(uuid, text) from public, anon;
grant execute on function public.set_store_tenant_status(uuid, text) to authenticated;
