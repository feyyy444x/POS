-- Permanent, tenant-scoped deletion for Owners and organization-wide deletion for Owner accounts.
-- All operations run in one PostgreSQL transaction (the function call itself).

create or replace function private.is_platform_staff_user(p_user_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_exists boolean := false;
begin
  if to_regclass('public.platform_staff_roles') is not null then
    execute 'select exists (select 1 from public.platform_staff_roles where user_id = $1)'
      into v_exists using p_user_id;
  end if;
  return coalesce(v_exists, false);
end;
$function$;
revoke all on function private.is_platform_staff_user(uuid) from public, anon, authenticated;

create or replace function private.delete_store_tenant_data(p_store_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_organization_id uuid;
  v_member_ids uuid[];
begin
  select s.organization_id
    into v_organization_id
  from public.stores s
  where s.id = p_store_id
  for update;

  if not found then
    raise exception 'Tenant tidak ditemukan';
  end if;

  if exists (
    select 1
    from public.cashier_shifts cs
    where cs.store_id = p_store_id
      and cs.closed_at is null
  ) then
    raise exception 'Tenant masih memiliki sesi kasir terbuka. Tutup seluruh sesi kasir terlebih dahulu.';
  end if;

  select coalesce(array_agg(distinct m.user_id), '{}'::uuid[])
    into v_member_ids
  from public.store_members m
  where m.store_id = p_store_id
    and m.user_id is not null;

  -- Remove tenant-scoped audit entries before deleting the tenant.
  delete from public.platform_audit_logs
  where store_id = p_store_id;

  -- Store foreign keys are configured with ON DELETE CASCADE for tenant-owned records:
  -- products, orders/items, queue, settings, invites, memberships, shifts, TV and cashier monitoring.
  delete from public.stores
  where id = p_store_id;

  -- Do not remove a login still used by another tenant, Owner organization, or platform role.
  delete from auth.users u
  where u.id = any(v_member_ids)
    and not exists (select 1 from public.store_members m where m.user_id = u.id)
    and not exists (select 1 from public.super_admins sa where sa.user_id = u.id)
    and not private.is_platform_staff_user(u.id)
    and not exists (select 1 from public.owner_organizations o where o.owner_user_id = u.id);
end;
$function$;

revoke all on function private.delete_store_tenant_data(uuid) from public, anon, authenticated;

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
  if p_store_id is null then
    raise exception 'Tenant tidak valid';
  end if;
  perform private.delete_store_tenant_data(p_store_id);
end;
$function$;

revoke all on function public.super_admin_delete_store_tenant(uuid) from public, anon;
grant execute on function public.super_admin_delete_store_tenant(uuid) to authenticated;

create or replace function public.owner_delete_store_tenant(p_store_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;
  if p_store_id is null or not private.is_store_owner(p_store_id) then
    raise exception 'Hanya Owner tenant yang dapat menghapus tenant ini';
  end if;
  perform private.delete_store_tenant_data(p_store_id);
end;
$function$;

revoke all on function public.owner_delete_store_tenant(uuid) from public, anon;
grant execute on function public.owner_delete_store_tenant(uuid) to authenticated;

create or replace function private.delete_owner_account_and_organization(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_email text;
  v_organization_ids uuid[];
  v_store_ids uuid[];
  v_member_ids uuid[];
begin
  if not private.is_super_admin() then
    raise exception 'Super Admin access required';
  end if;
  if p_user_id is null or p_user_id = (select auth.uid()) then
    raise exception 'Target akun Owner tidak valid';
  end if;
  if exists (select 1 from public.super_admins sa where sa.user_id = p_user_id) then
    raise exception 'Akun Super Admin dilindungi';
  end if;
  if private.is_platform_staff_user(p_user_id) then
    raise exception 'Akun staf platform tidak dapat dihapus melalui penghapusan Owner';
  end if;

  select u.email into v_email
  from auth.users u
  where u.id = p_user_id;
  if v_email is null then
    raise exception 'Akun Owner tidak ditemukan';
  end if;

  -- Resolve both current links and legacy organizations created from the Owner email.
  select
    coalesce(array_agg(distinct o.id), '{}'::uuid[]),
    coalesce(array_agg(distinct s.id) filter (where s.id is not null), '{}'::uuid[])
  into v_organization_ids, v_store_ids
  from public.owner_organizations o
  left join public.stores s on s.organization_id = o.id
  where o.owner_user_id = p_user_id
     or lower(o.owner_email) = lower(v_email)
     or exists (
       select 1
       from public.stores owner_store
       join public.store_members owner_member on owner_member.store_id = owner_store.id
       where owner_store.organization_id = o.id
         and owner_member.user_id = p_user_id
         and owner_member.role = 'owner'
     );

  if cardinality(v_organization_ids) = 0 then
    raise exception 'Organisasi Owner tidak ditemukan. Periksa tautan akun dan organisasi terlebih dahulu.';
  end if;

  if not exists (
    select 1
    from public.store_members m
    join public.stores s on s.id = m.store_id
    where s.organization_id = any(v_organization_ids)
      and m.user_id = p_user_id
      and m.role = 'owner'
  ) and not exists (
    select 1 from public.owner_organizations o
    where o.id = any(v_organization_ids) and o.owner_user_id = p_user_id
  ) then
    raise exception 'Akun ini tidak terverifikasi sebagai Owner organisasi tersebut';
  end if;

  if exists (
    select 1 from public.cashier_shifts cs
    where cs.store_id = any(v_store_ids)
      and cs.closed_at is null
  ) then
    raise exception 'Organisasi masih memiliki sesi kasir terbuka. Tutup seluruh sesi kasir sebelum menghapus akun Owner.';
  end if;

  -- Prevent deleting a login that is also attached to a tenant outside this organization.
  if exists (
    select 1
    from public.store_members m
    where m.user_id = p_user_id
      and not (m.store_id = any(v_store_ids))
  ) then
    raise exception 'Akun Owner masih terhubung ke tenant lain di luar organisasinya. Selesaikan keterkaitan tersebut terlebih dahulu.';
  end if;

  select coalesce(array_agg(distinct m.user_id), '{}'::uuid[])
    into v_member_ids
  from public.store_members m
  where m.store_id = any(v_store_ids)
    and m.user_id is not null;

  -- Remove the organization and its tenant audit trail; the platform-level deletion
  -- remains atomic with all operational data removal.
  delete from public.platform_audit_logs
  where organization_id = any(v_organization_ids)
     or store_id = any(v_store_ids);

  delete from public.stores
  where organization_id = any(v_organization_ids);

  delete from public.owner_organizations
  where id = any(v_organization_ids);

  delete from public.store_invites
  where lower(email) = lower(v_email);

  delete from auth.users
  where id = p_user_id;

  -- Remove employee logins that became orphaned when all organization tenants were deleted.
  delete from auth.users u
  where u.id = any(v_member_ids)
    and u.id <> p_user_id
    and not exists (select 1 from public.store_members m where m.user_id = u.id)
    and not exists (select 1 from public.super_admins sa where sa.user_id = u.id)
    and not private.is_platform_staff_user(u.id)
    and not exists (select 1 from public.owner_organizations o where o.owner_user_id = u.id);
end;
$function$;

revoke all on function private.delete_owner_account_and_organization(uuid) from public, anon, authenticated;

create or replace function public.super_admin_delete_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
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

  if exists (
    select 1 from public.store_members m
    where m.user_id = p_user_id and m.role = 'owner'
  ) or exists (
    select 1 from public.owner_organizations o
    where o.owner_user_id = p_user_id
  ) then
    perform private.delete_owner_account_and_organization(p_user_id);
    return;
  end if;

  if exists (
    select 1 from public.store_members m
    where m.user_id = p_user_id and m.is_active = true and m.disabled_at is null
  ) then
    raise exception 'Nonaktifkan atau hapus semua keanggotaan tenant aktif terlebih dahulu';
  end if;
  if exists (
    select 1 from public.cashier_shifts cs
    where cs.cashier_id = p_user_id and cs.closed_at is null
  ) then
    raise exception 'Akun masih memiliki sesi kasir terbuka. Tutup sesi kasir terlebih dahulu.';
  end if;

  delete from public.store_invites si
  where lower(si.email) = lower((select u.email from auth.users u where u.id = p_user_id));
  delete from public.store_members where user_id = p_user_id;
  delete from auth.users where id = p_user_id;
  if not found then
    raise exception 'Akun tidak ditemukan';
  end if;
end;
$function$;

revoke all on function public.super_admin_delete_user(uuid) from public, anon;
grant execute on function public.super_admin_delete_user(uuid) to authenticated;
