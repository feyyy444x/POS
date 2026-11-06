-- Owner credentials remain self-managed; platform admins cannot reset them.

create or replace function public.super_admin_reset_user_pin(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if not private.is_super_admin() then
    raise exception 'Super Admin access required';
  end if;
  if p_user_id is null or p_user_id = (select auth.uid()) then
    raise exception 'Target akun tidak valid';
  end if;
  if exists (select 1 from public.super_admins where user_id = p_user_id) then
    raise exception 'Akun Super Admin lain dilindungi dari reset lewat menu ini';
  end if;
  if exists (select 1 from public.owner_organizations where owner_user_id = p_user_id)
     or exists (select 1 from public.store_members where user_id = p_user_id and role = 'owner') then
    raise exception 'Owner harus mengelola PIN sendiri melalui Profil & Keamanan';
  end if;
  if not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'Akun tidak ditemukan';
  end if;

  delete from public.user_security_pins where user_id = p_user_id;
  delete from public.pin_verified_sessions where user_id = p_user_id;
  delete from public.user_pin_attempt_limits where user_id = p_user_id;
end;
$function$;

revoke all on function public.super_admin_reset_user_pin(uuid) from public, anon, authenticated;
grant execute on function public.super_admin_reset_user_pin(uuid) to authenticated;


create or replace function public.super_admin_list_owner_user_ids()
returns table(user_id uuid)
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if not private.is_super_admin() then
    raise exception 'Super Admin access required';
  end if;
  return query
  select distinct u.id
  from auth.users u
  where exists (
    select 1 from public.owner_organizations o where o.owner_user_id = u.id
  )
  or exists (
    select 1 from public.store_members m where m.user_id = u.id and m.role = 'owner'
  );
end;
$function$;

revoke all on function public.super_admin_list_owner_user_ids() from public, anon;
grant execute on function public.super_admin_list_owner_user_ids() to authenticated;
