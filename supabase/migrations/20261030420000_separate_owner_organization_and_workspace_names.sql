-- Keep Owner organization identity separate from the primary operational workspace name.
-- The original four-argument RPC remains as a compatibility wrapper for older clients.
create or replace function public.register_store_tenant(
  p_store_name text,
  p_owner_name text,
  p_owner_email text,
  p_activation_code text,
  p_organization_name text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_store_id uuid;
  v_org_id uuid;
  v_email text;
  v_code text := lower(trim(coalesce(p_activation_code, '')));
  v_organization_name text := btrim(coalesce(p_organization_name, ''));
  v_store_name text := btrim(coalesce(p_store_name, ''));
  v_owner_name text := btrim(coalesce(p_owner_name, ''));
begin
  if not private.is_super_admin() then
    raise exception 'Super Admin access required';
  end if;
  if nullif(v_store_name, '') is null or char_length(v_store_name) > 120
    or nullif(v_owner_name, '') is null or char_length(v_owner_name) > 120 then
    raise exception 'Nama workspace dan nama pemilik wajib diisi (maksimal 120 karakter)';
  end if;
  if char_length(v_organization_name) < 2 or char_length(v_organization_name) > 120 then
    raise exception 'Nama organisasi harus 2 sampai 120 karakter';
  end if;
  v_email := lower(trim(p_owner_email));
  if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Format email pemilik tidak valid';
  end if;
  if v_code !~ '^[a-f0-9]{32}$' then
    raise exception 'Kode aktivasi tidak valid';
  end if;

  insert into public.stores(name, owner_name, owner_email, status)
  values(v_store_name, v_owner_name, v_email, 'pending')
  returning id, organization_id into v_store_id, v_org_id;

  update public.owner_organizations
  set organization_name = v_organization_name,
      owner_name = v_owner_name,
      updated_at = now()
  where id = v_org_id;

  insert into public.store_settings(store_id, store_name)
  values(v_store_id, v_store_name);

  insert into public.store_invites(store_id, email, full_name, role, invited_by, activation_code_hash)
  values(v_store_id, v_email, v_owner_name, 'owner', (select auth.uid()),
         encode(extensions.digest(v_code, 'sha256'), 'hex'));

  return v_store_id;
end;
$function$;

revoke all on function public.register_store_tenant(text,text,text,text,text) from public, anon;
grant execute on function public.register_store_tenant(text,text,text,text,text) to authenticated;

create or replace function public.register_store_tenant(
  p_store_name text,
  p_owner_name text,
  p_owner_email text,
  p_activation_code text
)
returns uuid
language sql
security definer
set search_path = ''
as $function$
  select public.register_store_tenant(
    p_store_name, p_owner_name, p_owner_email, p_activation_code, p_store_name
  );
$function$;

revoke all on function public.register_store_tenant(text,text,text,text) from public, anon;
grant execute on function public.register_store_tenant(text,text,text,text) to authenticated;
