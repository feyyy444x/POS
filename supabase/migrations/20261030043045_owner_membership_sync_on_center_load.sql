-- Opening the Owner organization center also repairs/synchronizes Owner memberships
-- across every active tenant, so tenant-scoped RLS works before the first tenant switch.
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
  v_org_status text;
  v_seed_store_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select o.id, o.status into v_org_id, v_org_status
  from public.owner_organizations o
  where o.owner_user_id = v_user_id
  order by o.created_at asc
  limit 1;
  if v_org_id is null then
    raise exception 'Organisasi Owner tidak ditemukan';
  end if;

  if v_org_status = 'active' and private.is_pin_verified() then
    select s.id into v_seed_store_id
    from public.stores s
    where s.organization_id = v_org_id
      and s.status = 'active'
      and s.deleted_at is null
    order by s.is_primary_workspace desc, s.created_at asc
    limit 1;

    if v_seed_store_id is not null then
      perform public.owner_enter_store_tenant(v_seed_store_id);
    end if;
  end if;

  return query
  select s.id, s.name, s.status, s.expires_at,
    s.activation_package_key, s.activation_location_limit,
    s.deleted_at, s.created_at,
    exists (
      select 1 from public.store_members m
      where m.store_id = s.id and m.user_id = v_user_id
        and m.is_active = true and m.disabled_at is null
    ) as has_membership,
    s.is_primary_workspace
  from public.stores s
  where s.organization_id = v_org_id
  order by s.created_at desc;
end;
$function$;

revoke all on function public.owner_list_organization_tenants() from public, anon;
grant execute on function public.owner_list_organization_tenants() to authenticated;
