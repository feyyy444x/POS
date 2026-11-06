-- Do not orphan a currently open cashier session when removing a login account.
-- The operator must close the cashier session first; completed session history is preserved by
-- 20261030250000_preserve_cashier_identity_on_user_delete.sql.

create or replace function public.super_admin_delete_disabled_account(p_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_super_admin() then raise exception 'Super Admin access required'; end if;
  if p_user_id is null or p_user_id=(select auth.uid()) then raise exception 'Target akun tidak valid'; end if;
  if exists(select 1 from public.super_admins sa where sa.user_id=p_user_id) then
    raise exception 'Akun Super Admin tidak dapat dihapus melalui fitur ini';
  end if;
  if not exists(select 1 from public.store_members m
      where m.user_id=p_user_id and m.is_active=false and m.role in ('admin','cashier','manager')) then
    raise exception 'Akun tidak memiliki keanggotaan staf nonaktif yang memenuhi syarat';
  end if;
  if exists(select 1 from public.store_members m where m.user_id=p_user_id and m.is_active=true) then
    raise exception 'Akun ini masih aktif di tenant lain; nonaktifkan seluruh keanggotaannya terlebih dahulu';
  end if;
  if exists(select 1 from public.store_members m where m.user_id=p_user_id and m.role='owner') then
    raise exception 'Akun pemilik tenant tidak dapat dihapus melalui fitur penghapusan staf';
  end if;
  if exists(select 1 from public.cashier_shifts cs where cs.cashier_id=p_user_id and cs.closed_at is null) then
    raise exception 'Akun masih memiliki sesi kasir terbuka. Tutup sesi kasir terlebih dahulu.';
  end if;
  delete from auth.users where id=p_user_id;
  if not found then raise exception 'Akun tidak ditemukan'; end if;
end;
$$;
revoke all on function public.super_admin_delete_disabled_account(uuid) from public,anon;
grant execute on function public.super_admin_delete_disabled_account(uuid) to authenticated;

create or replace function public.super_admin_delete_user(p_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_email text;
begin
  if not private.is_super_admin() then raise exception 'Super Admin access required'; end if;
  if p_user_id is null or p_user_id=(select auth.uid()) then raise exception 'Tidak dapat menghapus akun sendiri'; end if;
  if exists(select 1 from public.super_admins where user_id=p_user_id) then raise exception 'Akun Super Admin dilindungi'; end if;
  if exists(select 1 from public.store_members where user_id=p_user_id and role='owner') then
    raise exception 'Akun Owner tidak dapat dihapus dari menu ini';
  end if;
  if exists(select 1 from public.store_members where user_id=p_user_id and is_active=true and disabled_at is null) then
    raise exception 'Nonaktifkan atau hapus semua keanggotaan tenant aktif terlebih dahulu';
  end if;
  if exists(select 1 from public.cashier_shifts cs where cs.cashier_id=p_user_id and cs.closed_at is null) then
    raise exception 'Akun masih memiliki sesi kasir terbuka. Tutup sesi kasir terlebih dahulu.';
  end if;
  select email into v_email from auth.users where id=p_user_id;
  if v_email is null then raise exception 'Akun tidak ditemukan'; end if;
  delete from public.store_invites where lower(email)=lower(v_email);
  delete from public.store_members where user_id=p_user_id;
  delete from auth.users where id=p_user_id;
end;
$$;
revoke all on function public.super_admin_delete_user(uuid) from public,anon;
grant execute on function public.super_admin_delete_user(uuid) to authenticated;

create or replace function public.owner_delete_store_member(p_member_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_member public.store_members; v_email text;
begin
  select * into v_member from public.store_members where id=p_member_id;
  if v_member.id is null then raise exception 'Anggota tidak ditemukan'; end if;
  if not private.is_store_owner(v_member.store_id) then raise exception 'Hanya Owner toko yang dapat menghapus akun'; end if;
  if v_member.user_id=(select auth.uid()) or v_member.role='owner' then raise exception 'Akun Owner tidak dapat dihapus dari menu staf'; end if;
  if exists(select 1 from public.cashier_shifts cs where cs.cashier_id=v_member.user_id and cs.store_id=v_member.store_id and cs.closed_at is null) then
    raise exception 'Anggota masih memiliki sesi kasir terbuka. Tutup sesi kasir terlebih dahulu.';
  end if;
  v_email:=v_member.email;
  delete from public.store_invites where store_id=v_member.store_id and lower(email)=lower(v_email);
  delete from public.store_members where id=p_member_id;
  if not exists(select 1 from public.store_members where user_id=v_member.user_id)
     and not exists(select 1 from public.super_admins where user_id=v_member.user_id) then
    delete from public.store_invites where lower(email)=lower(v_email);
    delete from auth.users where id=v_member.user_id;
  end if;
end;
$$;
revoke all on function public.owner_delete_store_member(uuid) from public,anon;
grant execute on function public.owner_delete_store_member(uuid) to authenticated;
