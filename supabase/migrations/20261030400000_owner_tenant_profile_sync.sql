-- Read-only Owner tenant profile feed.
-- Unlike owner_list_organization_tenants(), this function has no workspace-entry side effects.
create or replace function public.owner_list_organization_tenant_profiles()
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
  is_primary_workspace boolean,
  address text,
  phone text,
  logo_url text,
  settings_updated_at timestamptz
)
language sql
security definer
set search_path = ''
as $function$
  select
    s.id,
    coalesce(nullif(btrim(ss.store_name), ''), s.name) as name,
    s.status,
    s.expires_at,
    s.activation_package_key,
    s.activation_location_limit,
    s.deleted_at,
    s.created_at,
    exists (
      select 1
      from public.store_members m
      where m.store_id = s.id
        and m.user_id = (select auth.uid())
        and m.is_active = true
        and m.disabled_at is null
    ) as has_membership,
    s.is_primary_workspace,
    coalesce(ss.address, '') as address,
    coalesce(ss.phone, '') as phone,
    ss.logo_url,
    ss.updated_at as settings_updated_at
  from public.owner_organizations o
  join public.stores s on s.organization_id = o.id
  left join public.store_settings ss on ss.store_id = s.id
  where o.owner_user_id = (select auth.uid())
  order by s.created_at desc;
$function$;

revoke all on function public.owner_list_organization_tenant_profiles() from public;
revoke all on function public.owner_list_organization_tenant_profiles() from anon;
grant execute on function public.owner_list_organization_tenant_profiles() to authenticated;
