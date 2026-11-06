-- Ensure newly registered Owner organizations receive a canonical organization name
-- from the primary workspace, without treating Owner membership as a tenant assignment.
create or replace function private.attach_owner_account_to_organization()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_org public.owner_organizations;
  v_email text;
  v_workspace_name text;
begin
  if new.role <> 'owner' or new.is_active is not true then
    return new;
  end if;

  select o.* into v_org
  from public.owner_organizations o
  join public.stores s on s.organization_id = o.id
  where s.id = new.store_id
  for update of o;

  if not found then return new; end if;

  select lower(u.email) into v_email
  from auth.users u where u.id = new.user_id;

  if v_org.owner_user_id is not null and v_org.owner_user_id <> new.user_id then
    raise exception 'Organisasi ini sudah terhubung ke akun Owner lain';
  end if;
  if v_org.owner_user_id is null and v_email is not null and lower(v_org.owner_email) <> v_email then
    raise exception 'Email akun tidak cocok dengan Owner organisasi';
  end if;

  select nullif(btrim(s.name), '') into v_workspace_name
  from public.stores s
  where s.organization_id = v_org.id
  order by s.is_primary_workspace desc, s.created_at asc
  limit 1;

  update public.owner_organizations
  set owner_user_id = new.user_id,
      owner_email = case when owner_user_id is null then coalesce(v_email, owner_email) else owner_email end,
      owner_name = coalesce(nullif(btrim(new.full_name), ''), owner_name),
      organization_name = coalesce(nullif(btrim(organization_name), ''), v_workspace_name, 'Organisasi NexaPos'),
      updated_at = now()
  where id = v_org.id;

  return new;
end;
$function$;
revoke all on function private.attach_owner_account_to_organization() from public, anon, authenticated;

drop trigger if exists store_members_attach_owner_organization on public.store_members;
create trigger store_members_attach_owner_organization
after insert or update on public.store_members
for each row execute function private.attach_owner_account_to_organization();
