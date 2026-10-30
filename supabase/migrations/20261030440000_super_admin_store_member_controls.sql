-- Super Admin scoped employee assignment maintenance for the Admin Panel.
create or replace function public.super_admin_update_store_member(
  p_member_id uuid,p_full_name text,p_role text,p_is_active boolean
)
returns public.store_members
language plpgsql
security definer
set search_path = ''
as $function$
declare v_member public.store_members;
begin
  if not private.is_super_admin() then raise exception 'Super Admin access required'; end if;
  if not private.is_pin_verified() then raise exception 'Verifikasi PIN Super Admin diperlukan'; end if;
  select * into v_member from public.store_members where id=p_member_id for update;
  if v_member.id is null then raise exception 'Anggota tidak ditemukan'; end if;
  if v_member.role='owner' then raise exception 'Keanggotaan Owner dilindungi'; end if;
  if p_role not in ('admin','cashier') then raise exception 'Role tidak valid'; end if;
  if length(btrim(coalesce(p_full_name,'')))<2 or length(btrim(p_full_name))>120 then raise exception 'Nama harus 2–120 karakter'; end if;
  update public.store_members set full_name=btrim(p_full_name),role=p_role,
    is_active=coalesce(p_is_active,false),
    disabled_at=case when coalesce(p_is_active,false) then null else coalesce(disabled_at,now()) end,
    disabled_by=case when coalesce(p_is_active,false) then null else (select auth.uid()) end
  where id=p_member_id returning * into v_member;
  return v_member;
end;
$function$;

create or replace function public.super_admin_delete_store_member_assignment(p_member_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare v_member public.store_members;
begin
  if not private.is_super_admin() then raise exception 'Super Admin access required'; end if;
  if not private.is_pin_verified() then raise exception 'Verifikasi PIN Super Admin diperlukan'; end if;
  select * into v_member from public.store_members where id=p_member_id for update;
  if v_member.id is null then raise exception 'Anggota tidak ditemukan'; end if;
  if v_member.role='owner' then raise exception 'Keanggotaan Owner dilindungi'; end if;
  if exists(select 1 from public.cashier_shifts s where s.store_id=v_member.store_id and s.cashier_id=v_member.user_id and s.closed_at is null) then
    raise exception 'Anggota masih memiliki sesi kasir terbuka. Tutup sesi terlebih dahulu.';
  end if;
  delete from public.store_invites where store_id=v_member.store_id and lower(email)=lower(v_member.email);
  delete from public.store_members where id=p_member_id;
end;
$function$;

revoke all on function public.super_admin_update_store_member(uuid,text,text,boolean) from public,anon;
revoke all on function public.super_admin_delete_store_member_assignment(uuid) from public,anon;
grant execute on function public.super_admin_update_store_member(uuid,text,text,boolean) to authenticated;
grant execute on function public.super_admin_delete_store_member_assignment(uuid) to authenticated;
