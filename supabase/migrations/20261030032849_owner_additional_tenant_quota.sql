-- The Super Admin-provisioned workspace is the Owner's home workspace.
-- Package quotas count additional operational tenants only, not the home workspace.
alter table public.stores
  add column if not exists is_primary_workspace boolean not null default false;

with ranked as (
  select s.id, row_number() over (
    partition by s.organization_id
    order by (s.status <> 'deleted' and s.deleted_at is null) desc, s.created_at asc, s.id
  ) as rn
  from public.stores s
  where s.organization_id is not null
)
update public.stores s
set is_primary_workspace = (ranked.rn = 1)
from ranked
where ranked.id = s.id;

create unique index if not exists stores_one_primary_workspace_per_org
  on public.stores (organization_id)
  where is_primary_workspace = true
    and status <> 'deleted' and deleted_at is null;

create or replace function private.assign_store_organization()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_email text;
  v_org public.owner_organizations;
  v_count integer;
  v_has_primary boolean;
begin
  if new.organization_id is null then
    v_email := coalesce(nullif(lower(trim(new.owner_email)), ''),
      'tenant-' || new.id::text || '@nexapos.invalid');
    select * into v_org
    from public.owner_organizations
    where owner_email = v_email
    for update;

    if not found then
      insert into public.owner_organizations (
        owner_email, owner_name, activation_package_key, activation_location_limit, status
      )
      values (
        v_email, coalesce(new.owner_name, ''), 'starter', 3, 'pending'
      )
      returning * into v_org;
    end if;
    new.organization_id := v_org.id;
  else
    select * into v_org
    from public.owner_organizations
    where id = new.organization_id
    for update;
    if not found then
      raise exception 'Organisasi Owner tidak ditemukan';
    end if;
  end if;

  select exists (
    select 1 from public.stores s
    where s.organization_id = v_org.id
      and s.is_primary_workspace = true
      and s.status <> 'deleted' and s.deleted_at is null
      and (tg_op <> 'UPDATE' or s.id <> new.id)
  ) into v_has_primary;

  new.is_primary_workspace := not v_has_primary;

  select count(*)::integer into v_count
  from public.stores s
  where s.organization_id = v_org.id
    and s.is_primary_workspace = false
    and s.status <> 'deleted'
    and s.deleted_at is null
    and (tg_op <> 'UPDATE' or s.id <> new.id);

  if not new.is_primary_workspace and v_count >= v_org.activation_location_limit then
    raise exception 'Kuota tenant tambahan paket % sudah penuh (% tenant tambahan). Tingkatkan paket sebelum menambah tenant.',
      v_org.activation_package_key, v_org.activation_location_limit;
  end if;

  new.activation_package_key := v_org.activation_package_key;
  new.activation_location_limit := v_org.activation_location_limit;
  new.activated_at := v_org.activated_at;
  new.expires_at := v_org.expires_at;
  new.activation_days := v_org.activation_days;
  if v_org.status = 'active' and (v_org.expires_at is null or v_org.expires_at > now()) then
    new.status := 'active';
    new.deleted_at := null;
  elsif v_org.status = 'expired' or (v_org.expires_at is not null and v_org.expires_at <= now()) then
    new.status := 'expired';
  elsif v_org.status in ('suspended','deleted') then
    new.status := v_org.status;
  else
    new.status := 'pending';
  end if;
  return new;
end;
$function$;

revoke all on function private.assign_store_organization() from public, anon, authenticated;
drop trigger if exists stores_assign_organization on public.stores;
create trigger stores_assign_organization
before insert on public.stores
for each row execute function private.assign_store_organization();

create or replace function public.owner_create_store_tenant(p_store_name text)
returns public.stores
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_org public.owner_organizations;
  v_store public.stores;
  v_count integer;
  v_email text;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;
  if not private.is_pin_verified() then
    raise exception 'Verifikasi PIN diperlukan untuk menambah tenant';
  end if;
  if nullif(trim(p_store_name), '') is null or char_length(trim(p_store_name)) > 120 then
    raise exception 'Nama tenant wajib diisi (maksimal 120 karakter)';
  end if;

  select * into v_org
  from public.owner_organizations
  where owner_user_id = v_user_id
  for update;
  if not found then
    raise exception 'Organisasi Owner tidak ditemukan. Hubungi Super Admin untuk menautkan akun Owner.';
  end if;
  if v_org.status <> 'active' or (v_org.expires_at is not null and v_org.expires_at <= now()) then
    raise exception 'Masa aktivasi organisasi tidak aktif atau telah berakhir';
  end if;

  select count(*)::integer into v_count
  from public.stores s
  where s.organization_id = v_org.id
    and s.is_primary_workspace = false
    and s.status <> 'deleted'
    and s.deleted_at is null;
  if v_count >= v_org.activation_location_limit then
    raise exception 'Kuota tenant tambahan paket % sudah penuh (% tenant tambahan). Tingkatkan paket melalui Super Admin.',
      v_org.activation_package_key, v_org.activation_location_limit;
  end if;

  select lower(u.email) into v_email from auth.users u where u.id = v_user_id;
  insert into public.stores (
    name, owner_name, owner_email, status, activated_at, expires_at,
    activation_days, activation_package_key, activation_location_limit, organization_id, is_primary_workspace
  ) values (
    trim(p_store_name), v_org.owner_name, coalesce(v_email, v_org.owner_email),
    'active', v_org.activated_at, v_org.expires_at, v_org.activation_days,
    v_org.activation_package_key, v_org.activation_location_limit, v_org.id, false
  ) returning * into v_store;

  insert into public.store_settings(store_id, store_name)
  values (v_store.id, trim(p_store_name));

  insert into public.store_members(store_id, user_id, role, email, full_name, is_active)
  values (v_store.id, v_user_id, 'owner', coalesce(v_email, v_org.owner_email), v_org.owner_name, true)
  on conflict (store_id, user_id) do nothing;

  return v_store;
end;
$function$;

revoke all on function public.owner_create_store_tenant(text) from public, anon;
grant execute on function public.owner_create_store_tenant(text) to authenticated;

drop function if exists public.owner_list_organization_tenants();
create function public.owner_list_organization_tenants()
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
  if v_user_id is null then raise exception 'Authentication required'; end if;
  select o.id into v_org_id
  from public.owner_organizations o
  where o.owner_user_id = v_user_id
  order by o.created_at asc
  limit 1;
  if not found then raise exception 'Organisasi Owner tidak ditemukan'; end if;

  return query
  select s.id, s.name, s.status, s.expires_at, s.activation_package_key,
    s.activation_location_limit, s.deleted_at, s.created_at,
    exists (
      select 1 from public.store_members m
      where m.store_id = s.id and m.user_id = v_user_id and m.is_active = true
    ) as has_membership,
    s.is_primary_workspace
  from public.stores s
  where s.organization_id = v_org_id
  order by s.created_at desc;
end;
$function$;

revoke all on function public.owner_list_organization_tenants() from public, anon;
grant execute on function public.owner_list_organization_tenants() to authenticated;
