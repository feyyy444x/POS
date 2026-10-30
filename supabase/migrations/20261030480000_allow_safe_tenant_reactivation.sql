-- Allow Super Admin to resume a suspended tenant without renewing the
-- entire organization. Reactivation is only allowed while both the tenant
-- and its owning organization still have a valid activation period.
create or replace function public.set_store_tenant_status(
  p_store_id uuid,
  p_status text
)
returns public.stores
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_store public.stores;
  v_org public.owner_organizations;
begin
  if not private.is_super_admin() then
    raise exception 'Super Admin access required';
  end if;
  if not private.is_pin_verified() then
    raise exception 'Verifikasi PIN diperlukan untuk mengubah status tenant';
  end if;
  if p_status not in ('active', 'pending', 'suspended', 'deleted') then
    raise exception 'Status tenant tidak diizinkan';
  end if;

  select * into v_store
  from public.stores
  where id = p_store_id
    and status <> 'deleted'
    and deleted_at is null
  for update;

  if not found then
    raise exception 'Tenant tidak ditemukan atau sudah diarsipkan';
  end if;

  if p_status = 'active' then
    if v_store.expires_at is not null and v_store.expires_at <= now() then
      raise exception 'Masa aktivasi tenant telah berakhir. Perpanjang aktivasi perusahaan terlebih dahulu.';
    end if;

    if v_store.organization_id is not null then
      select * into v_org
      from public.owner_organizations
      where id = v_store.organization_id
      for update;

      if not found
        or v_org.status <> 'active'
        or (v_org.expires_at is not null and v_org.expires_at <= now()) then
        raise exception 'Perusahaan nonaktif atau masa sewanya berakhir. Aktifkan perusahaan terlebih dahulu.';
      end if;
    end if;
  end if;

  update public.stores
  set status = p_status,
      deleted_at = case when p_status = 'deleted' then now() else null end,
      updated_at = now()
  where id = p_store_id;

  select * into v_store from public.stores where id = p_store_id;
  return v_store;
end;
$$;

revoke all on function public.set_store_tenant_status(uuid, text) from public, anon;
grant execute on function public.set_store_tenant_status(uuid, text) to authenticated;
