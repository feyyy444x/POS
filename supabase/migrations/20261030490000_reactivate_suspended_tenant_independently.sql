-- Reactivate one suspended tenant independently of organization renewal.
-- The organization must already be active; sibling tenant statuses and the
-- organization's activation window are not modified by this operation.
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

  if p_status = 'active' and v_store.organization_id is not null then
    select * into v_org
    from public.owner_organizations
    where id = v_store.organization_id
    for share;

    if not found
      or v_org.status <> 'active'
      or (v_org.expires_at is not null and v_org.expires_at <= now()) then
      raise exception 'Perusahaan harus aktif dan masa sewanya masih berlaku sebelum tenant dapat diaktifkan.';
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
