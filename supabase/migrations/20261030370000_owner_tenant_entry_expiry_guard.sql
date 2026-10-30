-- Enforce expiry consistently when entering tenants and synchronizing Owner memberships.
create or replace function public.owner_enter_store_tenant(p_store_id uuid)
returns boolean
language plpgsql security definer set search_path = ''
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_org_id uuid;
  v_org_status text;
  v_org_expires_at timestamptz;
  v_store_status text;
  v_store_expires_at timestamptz;
  v_deleted_at timestamptz;
  v_email text;
  v_owner_name text;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if not private.is_pin_verified() then raise exception 'Verifikasi PIN diperlukan untuk membuka tenant'; end if;
  select o.id,o.status,o.expires_at,o.owner_name,lower(u.email)
    into v_org_id,v_org_status,v_org_expires_at,v_owner_name,v_email
  from public.owner_organizations o
  left join auth.users u on u.id=v_user_id
  where o.owner_user_id=v_user_id order by o.created_at asc limit 1;
  if v_org_id is null then raise exception 'Organisasi Owner tidak ditemukan atau bukan milik akun ini'; end if;
  if v_org_status <> 'active' or (v_org_expires_at is not null and v_org_expires_at <= now()) then
    raise exception 'Organisasi Owner tidak aktif atau masa aktivasinya telah berakhir';
  end if;
  select s.status,s.deleted_at,s.expires_at into v_store_status,v_deleted_at,v_store_expires_at
  from public.stores s where s.id=p_store_id and s.organization_id=v_org_id;
  if not found then raise exception 'Tenant tidak ditemukan dalam organisasi ini'; end if;
  if v_store_status <> 'active' or v_deleted_at is not null
    or (v_store_expires_at is not null and v_store_expires_at <= now()) then
    raise exception 'Tenant tidak aktif, masa aktivasinya berakhir, atau telah diarsipkan';
  end if;
  insert into public.store_members(store_id,user_id,role,email,full_name,is_active)
  select s.id,v_user_id,'owner',coalesce(v_email,''),coalesce(v_owner_name,''),true
  from public.stores s
  where s.organization_id=v_org_id and s.status='active' and s.deleted_at is null
    and (s.expires_at is null or s.expires_at > now())
  on conflict (store_id,user_id) do update
    set role='owner',email=excluded.email,full_name=excluded.full_name,is_active=true,disabled_at=null;
  return true;
end;
$function$;

create or replace function public.owner_list_organization_tenants()
returns table(id uuid,name text,status text,expires_at timestamptz,activation_package_key text,
  activation_location_limit integer,deleted_at timestamptz,created_at timestamptz,
  has_membership boolean,is_primary_workspace boolean)
language plpgsql security definer set search_path = ''
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_org_id uuid;
  v_org_status text;
  v_org_expires_at timestamptz;
  v_seed_store_id uuid;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  select o.id,o.status,o.expires_at into v_org_id,v_org_status,v_org_expires_at
  from public.owner_organizations o where o.owner_user_id=v_user_id
  order by o.created_at asc limit 1;
  if v_org_id is null then raise exception 'Organisasi Owner tidak ditemukan'; end if;
  if v_org_status='active' and (v_org_expires_at is null or v_org_expires_at > now())
    and private.is_pin_verified() then
    select s.id into v_seed_store_id from public.stores s
    where s.organization_id=v_org_id and s.status='active' and s.deleted_at is null
      and (s.expires_at is null or s.expires_at > now())
    order by s.is_primary_workspace desc,s.created_at asc limit 1;
    if v_seed_store_id is not null then perform public.owner_enter_store_tenant(v_seed_store_id); end if;
  end if;
  return query
  select s.id,s.name,s.status,s.expires_at,s.activation_package_key,s.activation_location_limit,
    s.deleted_at,s.created_at,
    exists(select 1 from public.store_members m where m.store_id=s.id and m.user_id=v_user_id
      and m.is_active=true and m.disabled_at is null),
    s.is_primary_workspace
  from public.stores s where s.organization_id=v_org_id order by s.created_at desc;
end;
$function$;
revoke all on function public.owner_enter_store_tenant(uuid) from public,anon;
grant execute on function public.owner_enter_store_tenant(uuid) to authenticated;
revoke all on function public.owner_list_organization_tenants() from public,anon;
grant execute on function public.owner_list_organization_tenants() to authenticated;
