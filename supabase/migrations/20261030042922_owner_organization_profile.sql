-- Separate the legal/organization profile from individual operational tenant names.
alter table public.owner_organizations
  add column if not exists organization_name text not null default '';

update public.owner_organizations o
set organization_name = coalesce(
  nullif(btrim(o.organization_name), ''),
  nullif((
    select btrim(s.name)
    from public.stores s
    where s.organization_id = o.id
      and s.is_primary_workspace = true
      and s.status <> 'deleted'
      and s.deleted_at is null
    order by s.created_at asc
    limit 1
  ), ''),
  nullif(btrim(o.owner_name), ''),
  'Organisasi NexaPos'
)
where nullif(btrim(o.organization_name), '') is null;

create or replace function public.owner_update_organization_profile(p_organization_name text)
returns public.owner_organizations
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_org public.owner_organizations;
  v_name text := btrim(coalesce(p_organization_name, ''));
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;
  if not private.is_pin_verified() then
    raise exception 'Verifikasi PIN diperlukan untuk mengubah pengaturan organisasi';
  end if;
  if char_length(v_name) < 2 or char_length(v_name) > 120 then
    raise exception 'Nama organisasi harus 2 sampai 120 karakter';
  end if;

  update public.owner_organizations
  set organization_name = v_name,
      updated_at = now()
  where owner_user_id = v_user_id
  returning * into v_org;

  if not found then
    raise exception 'Organisasi Owner tidak ditemukan atau bukan milik akun ini';
  end if;

  return v_org;
end;
$function$;

revoke all on function public.owner_update_organization_profile(text) from public, anon;
grant execute on function public.owner_update_organization_profile(text) to authenticated;
