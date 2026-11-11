-- Restore the Super Admin member-management RPC contract used by StoreControlCenter.
-- Functions are preview-branch migrations only and are not applied to production.

create or replace function public.super_admin_update_store_member(
  p_member_id uuid,
  p_full_name text,
  p_role text,
  p_is_active boolean
)
returns public.store_members
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_member public.store_members;
  v_active boolean := coalesce(p_is_active, false);
begin
  if not private.is_super_admin() then
    raise exception 'Super Admin access required';
  end if;
  if not private.is_pin_verified() then
    raise exception 'Verifikasi PIN diperlukan untuk mengubah keanggotaan';
  end if;
  if p_member_id is null then raise exception 'Keanggotaan tidak valid'; end if;
  if p_role not in ('admin', 'cashier') then raise exception 'Role hanya boleh Manager atau Karyawan'; end if;
  if length(btrim(coalesce(p_full_name, ''))) < 2 or length(btrim(p_full_name)) > 120 then
    raise exception 'Nama harus 2–120 karakter';
  end if;

  select * into v_member
  from public.store_members
  where id = p_member_id
  for update;

  if not found then raise exception 'Keanggotaan tidak ditemukan'; end if;
  if v_member.role = 'owner' or exists (
    select 1 from public.owner_organizations oo where oo.owner_user_id = v_member.user_id
  ) then
    raise exception 'Keanggotaan Owner dilindungi';
  end if;
  if v_member.user_id is null or exists (
    select 1 from public.super_admins sa where sa.user_id = v_member.user_id
  ) then
    raise exception 'Akun Super Admin dilindungi';
  end if;

  update public.store_members
  set full_name = btrim(p_full_name),
      role = p_role,
      is_active = v_active,
      disabled_at = case when v_active then null else coalesce(disabled_at, now()) end,
      disabled_by = case when v_active then null else (select auth.uid()) end
  where id = p_member_id
  returning * into v_member;

  return v_member;
end;
$function$;

create or replace function public.super_admin_delete_store_member_assignment(p_member_id uuid)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_member public.store_members;
begin
  if not private.is_super_admin() then
    raise exception 'Super Admin access required';
  end if;
  if not private.is_pin_verified() then
    raise exception 'Verifikasi PIN diperlukan untuk menghapus keanggotaan';
  end if;
  if p_member_id is null then raise exception 'Keanggotaan tidak valid'; end if;

  select * into v_member
  from public.store_members
  where id = p_member_id
  for update;

  if not found then raise exception 'Keanggotaan tidak ditemukan'; end if;
  if v_member.role = 'owner' or exists (
    select 1 from public.owner_organizations oo where oo.owner_user_id = v_member.user_id
  ) then
    raise exception 'Keanggotaan Owner dilindungi';
  end if;
  if v_member.user_id is null or exists (
    select 1 from public.super_admins sa where sa.user_id = v_member.user_id
  ) then
    raise exception 'Akun Super Admin dilindungi';
  end if;

  -- Remove only this tenant assignment. Auth identity and transaction history remain intact.
  delete from public.store_members where id = p_member_id;
end;
$function$;

revoke all on function public.super_admin_update_store_member(uuid, text, text, boolean) from public, anon;
revoke all on function public.super_admin_delete_store_member_assignment(uuid) from public, anon;
grant execute on function public.super_admin_update_store_member(uuid, text, text, boolean) to authenticated;
grant execute on function public.super_admin_delete_store_member_assignment(uuid) to authenticated;
