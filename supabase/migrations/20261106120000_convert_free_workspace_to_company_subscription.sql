-- Convert a standalone Workspace Only into a subscribed NexaSpace company.
-- The conversion keeps the original store row and every operational relation intact.
-- No owner approval is required; platform Admin/Super Admin must pass PIN verification.

-- A permanently free Workspace Only must not be converted into a timed
-- Single Workspace subscription by the ordinary activation/renewal button.
create or replace function public.activate_single_workspace(
  p_store_id uuid,
  p_duration_days integer
) returns public.stores
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_store public.stores;
begin
  if not private.is_super_admin() then
    raise exception 'Super Admin access required';
  end if;
  if not private.is_pin_verified() then
    raise exception 'Verifikasi PIN diperlukan untuk mengubah aktivasi';
  end if;
  if p_duration_days is null or p_duration_days < 1 or p_duration_days > 36500 then
    raise exception 'Durasi harus 1 sampai 36500 hari';
  end if;

  select * into v_store
  from public.stores
  where id = p_store_id
    and workspace_mode = 'single_workspace'
    and status <> 'deleted'
    and deleted_at is null
  for update;

  if not found then
    raise exception 'Single Workspace tidak ditemukan atau sudah diarsipkan';
  end if;
  if v_store.activation_package_key = 'free_workspace' then
    raise exception 'Workspace Only Gratis Permanen tidak dapat diaktivasi ulang. Gunakan proses Konversi ke Perusahaan jika ingin upgrade.';
  end if;

  update public.stores
  set status = 'active',
      workspace_mode = 'single_workspace',
      organization_id = null,
      activation_package_key = 'single_workspace',
      activation_location_limit = 1,
      activated_at = now(),
      expires_at = now() + make_interval(days => p_duration_days),
      activation_days = p_duration_days,
      deleted_at = null
  where id = v_store.id
  returning * into v_store;

  return v_store;
end;
$function$;

revoke all on function public.activate_single_workspace(uuid,integer) from public, anon;
grant execute on function public.activate_single_workspace(uuid,integer) to authenticated;

create or replace function public.convert_single_workspace_to_company(
  p_store_id uuid,
  p_organization_name text,
  p_package_key text,
  p_duration_days integer,
  p_location_limit integer default null
)
returns table (
  organization_id uuid,
  store_id uuid,
  organization_name text,
  activation_package_key text,
  activation_location_limit integer,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_store public.stores;
  v_package public.site_activation_packages;
  v_org_id uuid;
  v_owner_user_id uuid;
  v_company_name text := btrim(coalesce(p_organization_name, ''));
  v_email text;
  v_limit integer;
  v_before jsonb;
  v_after jsonb;
  v_expiry timestamptz;
begin
  if not private.is_super_admin() then
    raise exception 'Akses Admin platform diperlukan';
  end if;
  if not private.is_pin_verified() then
    raise exception 'Verifikasi PIN diperlukan untuk konversi Workspace Only';
  end if;
  if p_store_id is null then
    raise exception 'Workspace tidak valid';
  end if;
  if length(v_company_name) < 2 or length(v_company_name) > 120 then
    raise exception 'Nama perusahaan harus 2 sampai 120 karakter';
  end if;
  if p_duration_days is null or p_duration_days < 1 or p_duration_days > 36500 then
    raise exception 'Masa langganan harus 1 sampai 36.500 hari';
  end if;

  select * into v_store
  from public.stores s
  where s.id = p_store_id
    and s.workspace_mode = 'single_workspace'
    and s.organization_id is null
    and s.status <> 'deleted'
    and s.deleted_at is null
  for update;

  if not found then
    raise exception 'Workspace Only tidak ditemukan, sudah dikonversi, atau telah diarsipkan';
  end if;

  v_email := lower(btrim(coalesce(v_store.owner_email, '')));
  if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then
    raise exception 'Email Owner pada Workspace Only belum valid';
  end if;

  if exists (
    select 1 from public.owner_organizations o
    where lower(o.owner_email) = v_email
  ) then
    raise exception 'Email Owner sudah terhubung ke Perusahaan lain. Periksa data Owner sebelum konversi; sistem tidak akan menggabungkan perusahaan otomatis.';
  end if;

  if p_package_key in ('single_workspace', 'free_workspace') then
    raise exception 'Pilih paket langganan perusahaan, bukan paket Workspace Only';
  elsif p_package_key = 'custom' then
    if p_location_limit is null or p_location_limit < 1 or p_location_limit > 1000 then
      raise exception 'Kuota Custom harus 1 sampai 1.000 tenant tambahan';
    end if;
    select * into v_package
    from public.site_activation_packages p
    where p.package_key = 'custom';
    if not found then
      raise exception 'Konfigurasi paket Custom belum tersedia';
    end if;
    v_limit := p_location_limit;
  elsif p_package_key = 'special' then
    if p_location_limit is null or p_location_limit < 1 or p_location_limit > 1000 then
      raise exception 'Kuota Paket Khusus harus 1 sampai 1.000 tenant tambahan';
    end if;
    select * into v_package
    from public.site_activation_packages p
    where p.package_key = 'special' and p.is_active = true;
    if not found then
      raise exception 'Paket Khusus tidak tersedia atau sedang nonaktif';
    end if;
    v_limit := p_location_limit;
  else
    select * into v_package
    from public.site_activation_packages p
    where p.package_key = p_package_key
      and p.is_active = true
      and p.package_key in ('starter','growth','business','enterprise');
    if not found then
      raise exception 'Paket perusahaan tidak ditemukan atau sedang nonaktif';
    end if;
    v_limit := v_package.location_limit;
    if p_location_limit is not null and p_location_limit <> v_limit then
      raise exception 'Kuota paket standar tidak boleh diubah manual';
    end if;
  end if;

  select m.user_id into v_owner_user_id
  from public.store_members m
  where m.store_id = v_store.id
    and m.role = 'owner'
    and m.is_active = true
  order by m.created_at
  limit 1;

  if v_owner_user_id is not null and not exists (
    select 1 from auth.users u
    where u.id = v_owner_user_id and lower(u.email) = v_email
  ) then
    raise exception 'Akun Owner aktif tidak cocok dengan email Owner pada workspace';
  end if;

  v_expiry := now() + make_interval(days => p_duration_days);
  v_before := to_jsonb(v_store);

  insert into public.owner_organizations (
    owner_user_id, owner_email, owner_name, organization_name,
    activation_package_key, activation_location_limit,
    status, activated_at, expires_at, activation_days, updated_at
  ) values (
    v_owner_user_id, v_email, coalesce(v_store.owner_name, ''), v_company_name,
    p_package_key, v_limit, 'active', now(), v_expiry, p_duration_days, now()
  )
  returning id into v_org_id;

  -- Keep the same store ID. Products, stock, orders, shifts, staff, settings,
  -- invitations, self-order history and all foreign-key references remain intact.
  update public.stores
  set workspace_mode = 'nexaspace',
      organization_id = v_org_id,
      is_primary_workspace = true,
      company_name = v_company_name,
      activation_package_key = p_package_key,
      activation_location_limit = v_limit,
      status = 'active',
      activated_at = now(),
      expires_at = v_expiry,
      activation_days = p_duration_days,
      deleted_at = null
  where id = v_store.id;

  select to_jsonb(s) into v_after
  from public.stores s
  where s.id = v_store.id;

  insert into public.platform_audit_logs (
    actor_user_id, organization_id, store_id, entity_table, entity_id,
    action, before_data, after_data
  ) values (
    (select auth.uid()), v_org_id, v_store.id, 'stores', v_store.id::text,
    'UPDATE',
    v_before || jsonb_build_object('conversion', 'single_workspace_to_company'),
    v_after || jsonb_build_object(
      'conversion', 'single_workspace_to_company',
      'previous_workspace_mode', 'single_workspace',
      'previous_organization_id', null
    )
  );

  return query
  select v_org_id, v_store.id, v_company_name, p_package_key, v_limit, v_expiry;
end;
$function$;

revoke all on function public.convert_single_workspace_to_company(uuid,text,text,integer,integer) from public, anon;
grant execute on function public.convert_single_workspace_to_company(uuid,text,text,integer,integer) to authenticated;

notify pgrst, 'reload schema';
