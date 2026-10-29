-- Owner organizations and server-enforced tenant quotas.
-- Additive migration: operational data remains in place; no media or transaction tables are dropped.

create table if not exists public.owner_organizations (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references auth.users(id) on delete set null,
  owner_email text not null unique,
  owner_name text not null default '',
  activation_package_key text not null default 'starter'
    references public.site_activation_packages(package_key),
  activation_location_limit integer not null default 3
    check (activation_location_limit between 1 and 1000),
  status text not null default 'pending'
    check (status in ('pending','active','suspended','expired','deleted')),
  activated_at timestamptz,
  expires_at timestamptz,
  activation_days integer check (activation_days is null or activation_days between 1 and 36500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.stores
  add column if not exists organization_id uuid
  references public.owner_organizations(id) on delete restrict;

-- Backfill organizations by Owner email, preserving each tenant and its data.
insert into public.owner_organizations (
  owner_email, owner_name, owner_user_id, activation_package_key,
  activation_location_limit, status, activated_at, expires_at, activation_days
)
select distinct on (seed.org_email)
  seed.org_email, seed.owner_name, seed.owner_user_id, seed.package_key,
  seed.location_limit, seed.status, seed.activated_at, seed.expires_at, seed.activation_days
from (
  select
    coalesce(nullif(lower(trim(s.owner_email)), ''),
      'tenant-' || s.id::text || '@nexapos.invalid') as org_email,
    coalesce(nullif(trim(s.owner_name), ''), '') as owner_name,
    owner_member.user_id as owner_user_id,
    coalesce(s.activation_package_key, 'starter') as package_key,
    coalesce(s.activation_location_limit, p.location_limit, 3) as location_limit,
    case when s.status = 'active' and s.expires_at is not null and s.expires_at <= now()
      then 'expired' else coalesce(s.status, 'pending') end as status,
    s.activated_at, s.expires_at, s.activation_days,
    s.created_at
  from public.stores s
  left join public.site_activation_packages p
    on p.package_key = coalesce(s.activation_package_key, 'starter')
  left join lateral (
    select m.user_id
    from public.store_members m
    where m.store_id = s.id and m.role = 'owner' and m.is_active = true
    order by m.created_at desc
    limit 1
  ) owner_member on true
) seed
order by seed.org_email, (seed.status = 'active') desc, seed.expires_at desc nulls last, seed.created_at desc
on conflict (owner_email) do nothing;

update public.stores s
set organization_id = o.id
from public.owner_organizations o
where s.organization_id is null
  and o.owner_email = coalesce(nullif(lower(trim(s.owner_email)), ''),
    'tenant-' || s.id::text || '@nexapos.invalid');

-- Link existing Owner accounts and synchronize organization entitlement from the selected
-- canonical organization record. Existing stores are not deleted or re-created.
update public.owner_organizations o
set owner_user_id = owner_link.user_id,
    updated_at = now()
from (
  select distinct on (s.organization_id)
    s.organization_id, m.user_id
  from public.stores s
  join public.store_members m on m.store_id = s.id
  where s.organization_id is not null
    and m.role = 'owner' and m.is_active = true
  order by s.organization_id, m.created_at desc
) owner_link
where o.id = owner_link.organization_id
  and o.owner_user_id is null;

create index if not exists stores_organization_id_idx
  on public.stores (organization_id);
create index if not exists owner_organizations_owner_user_id_idx
  on public.owner_organizations (owner_user_id);

alter table public.owner_organizations enable row level security;
revoke all on public.owner_organizations from public, anon;
grant select on public.owner_organizations to authenticated;

drop policy if exists "Owner reads own organization" on public.owner_organizations;
create policy "Owner reads own organization"
  on public.owner_organizations for select to authenticated
  using (owner_user_id = (select auth.uid()) or private.is_super_admin());

drop policy if exists "Super Admin manages owner organizations" on public.owner_organizations;
create policy "Super Admin manages owner organizations"
  on public.owner_organizations for all to authenticated
  using (private.is_super_admin())
  with check (private.is_super_admin());

-- Automatically attach new Super Admin-created tenants to the organization identified by Owner email.
-- Lock the organization row while checking quotas to prevent concurrent tenant creation from overshooting.
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

  select count(*)::integer into v_count
  from public.stores s
  where s.organization_id = v_org.id
    and s.status <> 'deleted'
    and s.deleted_at is null
    and (tg_op <> 'UPDATE' or s.id <> new.id);

  if v_count >= v_org.activation_location_limit then
    raise exception 'Kuota tenant paket % sudah penuh (% tenant). Tingkatkan paket sebelum menambah tenant.',
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

-- When an Owner accepts an invitation, bind the organization to that authenticated account.
create or replace function private.attach_owner_account_to_organization()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_org public.owner_organizations;
  v_email text;
begin
  if new.role <> 'owner' or new.is_active is not true then
    return new;
  end if;

  select o.* into v_org
  from public.owner_organizations o
  join public.stores s on s.organization_id = o.id
  where s.id = new.store_id
  for update of o;

  if not found then
    return new;
  end if;

  select lower(u.email) into v_email
  from auth.users u
  where u.id = new.user_id;

  if v_org.owner_user_id is not null and v_org.owner_user_id <> new.user_id then
    raise exception 'Organisasi ini sudah terhubung ke akun Owner lain';
  end if;
  if v_email is not null and lower(v_org.owner_email) <> v_email then
    raise exception 'Email akun tidak cocok dengan Owner organisasi';
  end if;

  update public.owner_organizations
  set owner_user_id = new.user_id,
      owner_name = coalesce(nullif(trim(new.full_name), ''), owner_name),
      updated_at = now()
  where id = v_org.id;

  return new;
end;
$function$;

revoke all on function private.attach_owner_account_to_organization() from public, anon, authenticated;
drop trigger if exists store_members_attach_owner_organization on public.store_members;
create trigger store_members_attach_owner_organization
after insert or update of role, is_active on public.store_members
for each row execute function private.attach_owner_account_to_organization();

-- Re-activate an organization as one entitlement: all its tenants share package, quota and expiry.
create or replace function public.activate_store_tenant(
  p_store_id uuid,
  p_duration_days integer,
  p_package_key text
)
returns public.stores
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_store public.stores;
  v_package public.site_activation_packages;
  v_org public.owner_organizations;
  v_expiry timestamptz;
begin
  if not private.is_super_admin() then
    raise exception 'Super Admin access required';
  end if;
  if p_duration_days is null or p_duration_days < 1 or p_duration_days > 36500 then
    raise exception 'Durasi harus 1 sampai 36500 hari';
  end if;

  select * into v_store
  from public.stores
  where id = p_store_id and status <> 'deleted' and deleted_at is null
  for update;
  if not found then
    raise exception 'Tenant tidak ditemukan atau sudah diarsipkan';
  end if;

  select * into v_org
  from public.owner_organizations
  where id = v_store.organization_id
  for update;
  if not found then
    raise exception 'Organisasi Owner tidak ditemukan';
  end if;

  select * into v_package
  from public.site_activation_packages
  where package_key = p_package_key and is_active = true;
  if not found then
    raise exception 'Paket aktivasi tidak ditemukan atau sedang nonaktif';
  end if;

  v_expiry := now() + make_interval(days => p_duration_days);

  update public.owner_organizations
  set activation_package_key = v_package.package_key,
      activation_location_limit = v_package.location_limit,
      status = 'active',
      activated_at = now(),
      expires_at = v_expiry,
      activation_days = p_duration_days,
      updated_at = now()
  where id = v_org.id;

  update public.stores
  set status = case when status = 'suspended' then 'suspended' else 'active' end,
      activated_at = now(),
      expires_at = v_expiry,
      activation_days = p_duration_days,
      activation_package_key = v_package.package_key,
      activation_location_limit = v_package.location_limit,
      deleted_at = null
  where organization_id = v_org.id
    and status <> 'deleted'
    and deleted_at is null;

  select * into v_store from public.stores where id = p_store_id;
  return v_store;
end;
$function$;

revoke all on function public.activate_store_tenant(uuid, integer, text) from public, anon;
grant execute on function public.activate_store_tenant(uuid, integer, text) to authenticated;

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
    and s.status <> 'deleted'
    and s.deleted_at is null;
  if v_count >= v_org.activation_location_limit then
    raise exception 'Kuota tenant paket % sudah penuh (% tenant). Tingkatkan paket melalui Super Admin.',
      v_org.activation_package_key, v_org.activation_location_limit;
  end if;

  select lower(u.email) into v_email from auth.users u where u.id = v_user_id;
  insert into public.stores (
    name, owner_name, owner_email, status, activated_at, expires_at,
    activation_days, activation_package_key, activation_location_limit, organization_id
  ) values (
    trim(p_store_name), v_org.owner_name, coalesce(v_email, v_org.owner_email),
    'active', v_org.activated_at, v_org.expires_at, v_org.activation_days,
    v_org.activation_package_key, v_org.activation_location_limit, v_org.id
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

-- Keep organization package and quota in sync when Super Admin explicitly changes status.
create or replace function public.set_store_tenant_status(p_store_id uuid, p_status text)
returns public.stores
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_store public.stores;
begin
  if not private.is_super_admin() then
    raise exception 'Super Admin access required';
  end if;
  if p_status not in ('pending','suspended','deleted') then
    raise exception 'Status tidak diizinkan; gunakan aktivasi untuk mengaktifkan tenant';
  end if;
  select * into v_store from public.stores
  where id = p_store_id and status <> 'deleted' and deleted_at is null
  for update;
  if not found then
    raise exception 'Tenant tidak ditemukan atau sudah diarsipkan';
  end if;

  -- Suspension/archive is tenant-scoped; it must not disable sibling tenants in the organization.
  update public.stores
  set status = p_status,
      deleted_at = case when p_status = 'deleted' then now() else null end
  where id = p_store_id;

  select * into v_store from public.stores where id = p_store_id;
  return v_store;
end;
$function$;

revoke all on function public.set_store_tenant_status(uuid, text) from public, anon;
grant execute on function public.set_store_tenant_status(uuid, text) to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'owner_organizations'
  ) then
    alter publication supabase_realtime add table public.owner_organizations;
  end if;
end $$;
