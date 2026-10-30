-- Owner navigation must be read-only: entering a tenant and loading NexaSpace
-- must never create/update store_members. Tenant membership is provisioned when
-- a tenant is created; existing membership is only checked here for RLS access.
create or replace function public.owner_enter_store_tenant(p_store_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_org_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;
  if not private.is_pin_verified() then
    raise exception 'Verifikasi PIN diperlukan untuk membuka tenant';
  end if;

  select o.id into v_org_id
  from public.owner_organizations o
  where o.owner_user_id = v_user_id
  order by o.created_at asc
  limit 1;

  if v_org_id is null then
    raise exception 'Organisasi Owner tidak ditemukan atau bukan milik akun ini';
  end if;

  -- Deliberately do not reject suspended/expired organization or tenant status:
  -- Owner is allowed to inspect retained data in read-only mode.
  if not exists (
    select 1
    from public.stores s
    where s.id = p_store_id
      and s.organization_id = v_org_id
      and s.status <> 'deleted'
      and s.deleted_at is null
  ) then
    raise exception 'Tenant tidak ditemukan dalam organisasi ini';
  end if;

  -- No INSERT/UPDATE/DELETE here. The membership row is provisioned by the
  -- tenant-creation flow and must already exist for tenant-scoped RLS reads.
  if not exists (
    select 1
    from public.store_members m
    where m.store_id = p_store_id
      and m.user_id = v_user_id
      and m.role = 'owner'
      and m.is_active = true
      and m.disabled_at is null
  ) then
    raise exception 'Akses baca Owner untuk tenant ini belum terhubung. Hubungi Admin NexaPos.';
  end if;

  return true;
end;
$function$;

revoke all on function public.owner_enter_store_tenant(uuid) from public, anon;
grant execute on function public.owner_enter_store_tenant(uuid) to authenticated;

-- Listing NexaSpace tenants is also a pure read. Older implementations called
-- owner_enter_store_tenant() as a side effect to synchronize memberships.
create or replace function public.owner_list_organization_tenants()
returns table (
  id uuid,
  name text,
  status text,
  expires_at timestamptz,
  activation_package_key text,
  activation_location_limit integer,
  deleted_at timestamptz,
  created_at timestamptz,
  has_membership boolean,
  is_primary_workspace boolean
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_org_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select o.id into v_org_id
  from public.owner_organizations o
  where o.owner_user_id = v_user_id
  order by o.created_at asc
  limit 1;

  if v_org_id is null then
    raise exception 'Organisasi Owner tidak ditemukan';
  end if;

  return query
  select s.id, s.name, s.status, s.expires_at,
    s.activation_package_key, s.activation_location_limit,
    s.deleted_at, s.created_at,
    exists (
      select 1 from public.store_members m
      where m.store_id = s.id
        and m.user_id = v_user_id
        and m.is_active = true
        and m.disabled_at is null
    ) as has_membership,
    s.is_primary_workspace
  from public.stores s
  where s.organization_id = v_org_id
    and s.status <> 'deleted'
  order by s.created_at desc;
end;
$function$;

revoke all on function public.owner_list_organization_tenants() from public, anon;
grant execute on function public.owner_list_organization_tenants() to authenticated;
