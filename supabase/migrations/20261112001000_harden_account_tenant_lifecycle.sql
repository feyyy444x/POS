-- Harden acoPos account deletion, employee tenant transfer, and Custom duration labeling.
-- This migration is additive and does not execute any destructive operation on existing data.

update public.site_activation_durations
set name = 'Custom',
    updated_at = now()
where duration_key = 'custom'
  and name is distinct from 'Custom';

update public.site_activation_packages
set name = 'Custom',
    updated_at = now()
where package_key = 'custom'
  and name is distinct from 'Custom';

-- Move only non-Owner employee membership into an operational destination tenant.
-- Lock account, tenant rows, and membership rows so concurrent moves/deletions cannot race.
create or replace function public.super_admin_move_user_membership(
  p_user_id uuid,
  p_source_store_id uuid,
  p_target_store_id uuid,
  p_target_role text
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_source_role text;
  v_target_status text;
  v_target_expires_at timestamptz;
  v_target_organization_id uuid;
  v_org_status text;
  v_org_expires_at timestamptz;
begin
  if not private.is_super_admin() then
    raise exception 'Super Admin access required';
  end if;
  if p_user_id is null or p_source_store_id is null or p_target_store_id is null then
    raise exception 'Akun, tenant asal, dan tenant tujuan wajib dipilih';
  end if;
  if p_user_id = (select auth.uid()) then
    raise exception 'Akun Super Admin yang sedang digunakan tidak dapat dipindahkan';
  end if;
  if p_source_store_id = p_target_store_id then
    raise exception 'Tenant asal dan tujuan tidak boleh sama';
  end if;
  if p_target_role is null or p_target_role not in ('admin', 'manager', 'cashier') then
    raise exception 'Role tujuan tidak valid; pilih Manager atau Karyawan';
  end if;
  if exists (select 1 from public.super_admins sa where sa.user_id = p_user_id) then
    raise exception 'Akun Super Admin dilindungi dan tidak dapat dipindahkan';
  end if;

  perform 1 from auth.users u where u.id = p_user_id for update;
  if not found then
    raise exception 'Akun pengguna tidak ditemukan';
  end if;

  -- Stable lock order avoids deadlocks when two operations touch the same tenants.
  perform 1
  from public.stores s
  where s.id in (p_source_store_id, p_target_store_id)
  order by s.id
  for update;
  if (select count(*) from public.stores s where s.id in (p_source_store_id, p_target_store_id)) <> 2 then
    raise exception 'Tenant asal atau tujuan tidak ditemukan';
  end if;

  select s.status, s.expires_at, s.organization_id
    into v_target_status, v_target_expires_at, v_target_organization_id
  from public.stores s
  where s.id = p_target_store_id;
  if v_target_status <> 'active' then
    raise exception 'Tenant tujuan harus berstatus aktif';
  end if;
  if v_target_expires_at is not null and v_target_expires_at <= now() then
    raise exception 'Masa aktif tenant tujuan telah berakhir';
  end if;

  if v_target_organization_id is not null then
    select o.status, o.expires_at
      into v_org_status, v_org_expires_at
    from public.owner_organizations o
    where o.id = v_target_organization_id
    for update;
    if not found or v_org_status <> 'active'
      or (v_org_expires_at is not null and v_org_expires_at <= now()) then
      raise exception 'Perusahaan tenant tujuan sedang nonaktif atau masa aktifnya berakhir';
    end if;
  end if;

  select m.role
    into v_source_role
  from public.store_members m
  where m.user_id = p_user_id
    and m.store_id = p_source_store_id
  for update;
  if not found then
    raise exception 'Keanggotaan akun di tenant asal tidak ditemukan';
  end if;
  if v_source_role = 'owner' then
    raise exception 'Role Owner tidak dapat dipindahkan melalui fitur pemindahan karyawan';
  end if;

  if exists (
    select 1 from public.cashier_shifts cs
    where cs.store_id = p_source_store_id
      and cs.cashier_id = p_user_id
      and cs.closed_at is null
  ) then
    raise exception 'Karyawan masih memiliki sesi kasir terbuka di tenant asal. Tutup sesi terlebih dahulu.';
  end if;

  perform 1
  from public.store_members m
  where m.user_id = p_user_id
    and m.store_id = p_target_store_id
  for update;

  if found then
    if exists (
      select 1 from public.store_members m
      where m.user_id = p_user_id
        and m.store_id = p_target_store_id
        and m.role = 'owner'
    ) then
      raise exception 'Keanggotaan Owner pada tenant tujuan dilindungi';
    end if;

    update public.store_members
    set role = p_target_role,
        is_active = true,
        disabled_at = null,
        disabled_by = null
    where user_id = p_user_id and store_id = p_target_store_id;

    delete from public.store_members
    where user_id = p_user_id and store_id = p_source_store_id;
  else
    update public.store_members
    set store_id = p_target_store_id,
        role = p_target_role,
        is_active = true,
        disabled_at = null,
        disabled_by = null
    where user_id = p_user_id and store_id = p_source_store_id;
  end if;
end;
$function$;

revoke all on function public.super_admin_move_user_membership(uuid, uuid, uuid, text) from public, anon;
grant execute on function public.super_admin_move_user_membership(uuid, uuid, uuid, text) to authenticated;

-- Keep the existing deletion implementation, but refuse to delete an Auth account
-- while it still owns Storage objects. Storage cleanup must use the Storage API.
do $$
begin
  if to_regprocedure('public.super_admin_delete_user(uuid)') is not null
     and to_regprocedure('public.super_admin_delete_user_before_storage_guard(uuid)') is null then
    alter function public.super_admin_delete_user(uuid)
      rename to super_admin_delete_user_before_storage_guard;
  end if;
end $$;

create or replace function public.super_admin_delete_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_has_owned_objects boolean := false;
begin
  if not private.is_super_admin() then
    raise exception 'Super Admin access required';
  end if;
  if p_user_id is null or p_user_id = (select auth.uid()) then
    raise exception 'Tidak dapat menghapus akun sendiri';
  end if;
  if exists (select 1 from public.super_admins sa where sa.user_id = p_user_id) then
    raise exception 'Akun Super Admin dilindungi';
  end if;

  if to_regclass('storage.objects') is not null then
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'storage' and table_name = 'objects' and column_name = 'owner_id'
    ) then
      execute 'select exists (select 1 from storage.objects where owner_id = $1)'
        into v_has_owned_objects using p_user_id::text;
    elsif exists (
      select 1 from information_schema.columns
      where table_schema = 'storage' and table_name = 'objects' and column_name = 'owner'
    ) then
      execute 'select exists (select 1 from storage.objects where owner::text = $1)'
        into v_has_owned_objects using p_user_id::text;
    end if;
  end if;

  if v_has_owned_objects then
    raise exception 'Akun masih memiliki file Storage. Pindahkan atau hapus file melalui Storage API terlebih dahulu, lalu ulangi penghapusan akun.';
  end if;

  perform public.super_admin_delete_user_before_storage_guard(p_user_id);
end;
$function$;

revoke all on function public.super_admin_delete_user(uuid) from public, anon;
grant execute on function public.super_admin_delete_user(uuid) to authenticated;
revoke all on function public.super_admin_delete_user_before_storage_guard(uuid) from public, anon, authenticated;

-- Tenant deletion is destructive and must carry a verified Super Admin PIN.
do $$
begin
  if to_regprocedure('public.super_admin_delete_store_tenant(uuid)') is not null
     and to_regprocedure('public.super_admin_delete_store_tenant_before_pin_guard(uuid)') is null then
    alter function public.super_admin_delete_store_tenant(uuid)
      rename to super_admin_delete_store_tenant_before_pin_guard;
  end if;
end $$;

create or replace function public.super_admin_delete_store_tenant(p_store_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if not private.is_super_admin() then
    raise exception 'Super Admin access required';
  end if;
  if not private.is_pin_verified() then
    raise exception 'Verifikasi PIN diperlukan sebelum menghapus tenant secara permanen';
  end if;
  if p_store_id is null then
    raise exception 'Tenant tidak valid';
  end if;
  perform public.super_admin_delete_store_tenant_before_pin_guard(p_store_id);
end;
$function$;

revoke all on function public.super_admin_delete_store_tenant(uuid) from public, anon;
grant execute on function public.super_admin_delete_store_tenant(uuid) to authenticated;
revoke all on function public.super_admin_delete_store_tenant_before_pin_guard(uuid) from public, anon, authenticated;
