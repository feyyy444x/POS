-- Align team administration with the Owner/Manager model while preserving legacy role keys.
-- Managers remain stored as "admin" so existing policies and operational code stay compatible.

create or replace function public.invite_store_member(
  p_store_id uuid,
  p_email text,
  p_full_name text,
  p_role text,
  p_activation_code text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_name text := btrim(coalesce(p_full_name, ''));
  v_code text := lower(btrim(coalesce(p_activation_code, '')));
  v_invite_id uuid;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
  if not private.is_store_manager(p_store_id) then
    raise exception 'Akses Manager/Owner aktif dan verifikasi PIN diperlukan';
  end if;
  if not private.is_store_operational(p_store_id) then
    raise exception 'Toko tidak aktif atau masa aktivasinya telah habis';
  end if;
  if p_role not in ('admin','cashier') then raise exception 'Jabatan tidak valid'; end if;
  if char_length(v_name) < 2 or char_length(v_name) > 120 then raise exception 'Nama karyawan harus 2 sampai 120 karakter'; end if;
  if v_code !~ '^[a-f0-9]{32}$' then raise exception 'Kode aktivasi tidak valid'; end if;
  if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Format email tidak valid'; end if;
  if exists(select 1 from public.store_members m where m.store_id=p_store_id and lower(m.email)=v_email) then
    raise exception 'Email sudah menjadi anggota toko ini';
  end if;
  delete from public.store_invites where store_id=p_store_id and lower(email)=v_email and accepted_at is null;
  insert into public.store_invites(store_id,email,full_name,role,invited_by,activation_code_hash)
  values(p_store_id,v_email,v_name,p_role,(select auth.uid()),encode(extensions.digest(v_code,'sha256'),'hex'))
  returning id into v_invite_id;
  return v_invite_id;
end;
$function$;

create or replace function public.owner_update_store_member(
  p_member_id uuid,p_full_name text,p_role text,p_is_active boolean
)
returns public.store_members
language plpgsql
security definer
set search_path = ''
as $function$
declare v_member public.store_members;
begin
  select * into v_member from public.store_members where id=p_member_id;
  if v_member.id is null then raise exception 'Anggota tidak ditemukan'; end if;
  if not private.is_store_manager(v_member.store_id) then raise exception 'Akses Owner/Manager aktif dan verifikasi PIN diperlukan'; end if;
  if v_member.user_id=(select auth.uid()) or v_member.role='owner' then raise exception 'Akun Owner tidak dapat diubah dari menu staf'; end if;
  if p_role not in ('admin','cashier') then raise exception 'Role tidak valid'; end if;
  if length(btrim(coalesce(p_full_name,'')))<2 or length(btrim(p_full_name))>120 then raise exception 'Nama harus 2–120 karakter'; end if;
  update public.store_members
  set full_name=btrim(p_full_name),role=p_role,is_active=coalesce(p_is_active,false),
      disabled_at=case when coalesce(p_is_active,false) then null else coalesce(disabled_at,now()) end,
      disabled_by=case when coalesce(p_is_active,false) then null else (select auth.uid()) end
  where id=p_member_id returning * into v_member;
  return v_member;
end;
$function$;

create or replace function public.owner_delete_store_member(p_member_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare v_member public.store_members; v_email text;
begin
  select * into v_member from public.store_members where id=p_member_id for update;
  if v_member.id is null then raise exception 'Anggota tidak ditemukan'; end if;
  if not private.is_store_manager(v_member.store_id) then raise exception 'Akses Owner/Manager aktif dan verifikasi PIN diperlukan'; end if;
  if v_member.user_id=(select auth.uid()) or v_member.role='owner' then raise exception 'Akun Owner tidak dapat dihapus dari menu staf'; end if;
  if exists(select 1 from public.cashier_shifts cs where cs.cashier_id=v_member.user_id and cs.store_id=v_member.store_id and cs.closed_at is null) then
    raise exception 'Anggota masih memiliki sesi kasir terbuka. Tutup sesi kasir terlebih dahulu.';
  end if;
  v_email:=v_member.email;
  delete from public.store_invites where store_id=v_member.store_id and lower(email)=lower(v_email);
  delete from public.store_members where id=p_member_id;
  -- Preserve the login account when it still has another tenant membership.
  if not exists(select 1 from public.store_members where user_id=v_member.user_id)
     and not exists(select 1 from public.super_admins where user_id=v_member.user_id) then
    delete from public.store_invites where lower(email)=lower(v_email);
    delete from auth.users where id=v_member.user_id;
  end if;
end;
$function$;

create or replace function public.manager_reset_store_member_pin(p_member_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare v_member public.store_members;
begin
  select * into v_member from public.store_members where id=p_member_id;
  if v_member.id is null then raise exception 'Anggota tidak ditemukan'; end if;
  if not private.is_store_manager(v_member.store_id) then raise exception 'Akses Owner/Manager aktif dan verifikasi PIN diperlukan'; end if;
  if v_member.role='owner' or v_member.user_id=(select auth.uid()) then raise exception 'PIN Owner atau akun sendiri tidak dapat direset dari menu ini'; end if;
  delete from public.user_security_pins where user_id=v_member.user_id;
  delete from public.pin_verified_sessions where user_id=v_member.user_id;
  delete from public.user_pin_attempt_limits where user_id=v_member.user_id;
  if not exists(select 1 from public.user_security_pins where user_id=v_member.user_id) then
    return;
  end if;
end;
$function$;

drop policy if exists "managers insert operational products" on public.products;
create policy "members insert operational products"
on public.products for insert to authenticated
with check (private.is_store_operational(store_id) and private.is_store_member(store_id));

revoke all on function public.invite_store_member(uuid,text,text,text,text) from public,anon;
revoke all on function public.owner_update_store_member(uuid,text,text,boolean) from public,anon;
revoke all on function public.owner_delete_store_member(uuid) from public,anon;
revoke all on function public.manager_reset_store_member_pin(uuid) from public,anon;
grant execute on function public.invite_store_member(uuid,text,text,text,text) to authenticated;
grant execute on function public.owner_update_store_member(uuid,text,text,boolean) to authenticated;
grant execute on function public.owner_delete_store_member(uuid) to authenticated;
grant execute on function public.manager_reset_store_member_pin(uuid) to authenticated;

create or replace function public.manager_can_manage_store_member(p_member_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1 from public.store_members target
    where target.id=p_member_id
      and target.role <> 'owner'
      and target.user_id <> (select auth.uid())
      and private.is_store_manager(target.store_id)
  )
$function$;
revoke all on function public.manager_can_manage_store_member(uuid) from public,anon;
grant execute on function public.manager_can_manage_store_member(uuid) to authenticated;
