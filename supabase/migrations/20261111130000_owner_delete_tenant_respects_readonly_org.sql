-- Keep the Owner's tenant deletion inside the organization read-only boundary.
-- A disabled or expired company remains inspectable, but its Owner cannot mutate it.
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

  if not private.is_pin_verified() then
    raise exception 'Verifikasi PIN diperlukan untuk menghapus tenant';
  end if;

  select * into v_org
  from public.owner_organizations
  where id = v_store.organization_id
    and owner_user_id = (select auth.uid())
  for update;
  if not found then
    raise exception 'Tenant ini bukan milik organisasi akun Owner Anda';
  end if;

  -- Company-level suspension/expiry locks every Owner mutation, including deletion.
  if v_org.status <> 'active'
    or (v_org.expires_at is not null and v_org.expires_at <= now()) then
    raise exception 'Perusahaan sedang nonaktif atau masa sewanya telah berakhir. Data hanya dapat dibaca.';
  end if;

  if v_store.status = 'active'
    and (v_store.expires_at is null or v_store.expires_at > now()) then
    raise exception 'Tenant masih aktif. Minta Admin/Super Admin menonaktifkan tenant terlebih dahulu sebelum menghapusnya.';
  end if;

  perform private.delete_store_tenant_data(p_store_id);
end;
$function$;
