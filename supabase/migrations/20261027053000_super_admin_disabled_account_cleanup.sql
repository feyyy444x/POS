-- Track owner-disabled staff and allow Super Admin to review/purge eligible accounts.
alter table public.store_members
  add column if not exists disabled_at timestamptz,
  add column if not exists disabled_by uuid references auth.users(id) on delete set null;

update public.store_members
set disabled_at = coalesce(disabled_at, updated_at, created_at)
where is_active = false and disabled_at is null;

create or replace function public.manage_store_member(
  p_member_id uuid,
  p_role text,
  p_is_active boolean
) returns public.store_members
language plpgsql security definer set search_path = '' as $$
declare v_member public.store_members; v_next_active boolean;
begin
  if p_role not in ('admin','cashier') then raise exception 'Jabatan hanya boleh Admin atau Kasir'; end if;
  v_next_active := coalesce(p_is_active,true);
  select m.* into v_member
  from public.store_members m
  join public.store_members actor on actor.store_id=m.store_id
  where m.id=p_member_id and actor.user_id=(select auth.uid())
    and actor.role='owner' and actor.is_active=true
    and m.role<>'owner'
  limit 1;
  if not found then raise exception 'Anggota tidak ditemukan atau akses Owner diperlukan'; end if;
  if not private.is_store_operational(v_member.store_id) then raise exception 'Toko tidak aktif atau masa aktivasinya telah habis'; end if;
  update public.store_members
  set role=p_role,
      is_active=v_next_active,
      disabled_at=case when v_next_active then null else coalesce(disabled_at,now()) end,
      disabled_by=case when v_next_active then null else coalesce(disabled_by,(select auth.uid())) end
  where id=p_member_id returning * into v_member;
  return v_member;
end;
$$;
revoke all on function public.manage_store_member(uuid,text,boolean) from public, anon;
grant execute on function public.manage_store_member(uuid,text,boolean) to authenticated;

create or replace function public.super_admin_list_disabled_members()
returns table(
  member_id uuid,
  user_id uuid,
  store_id uuid,
  store_name text,
  email text,
  full_name text,
  role text,
  disabled_at timestamptz,
  disabled_by_email text,
  has_other_active_membership boolean
)
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_super_admin() then raise exception 'Super Admin access required'; end if;
  return query
  select m.id, m.user_id, m.store_id, s.name, coalesce(nullif(m.email,''),u.email,''),
         coalesce(m.full_name,''),m.role,m.disabled_at,du.email,
         exists(select 1 from public.store_members active_m
           where active_m.user_id=m.user_id and active_m.is_active=true and active_m.id<>m.id)
  from public.store_members m
  join public.stores s on s.id=m.store_id
  left join auth.users u on u.id=m.user_id
  left join auth.users du on du.id=m.disabled_by
  where m.is_active=false and m.role in ('admin','cashier','manager')
  order by m.disabled_at desc nulls last, s.name, m.email;
end;
$$;
revoke all on function public.super_admin_list_disabled_members() from public, anon;
grant execute on function public.super_admin_list_disabled_members() to authenticated;

create or replace function public.super_admin_delete_disabled_account(p_user_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
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

  -- Auth deletion is intentionally irreversible. Foreign-key constraints preserve safety:
  -- if the account is still referenced by retained business/audit data, Postgres rejects this transaction.
  delete from auth.users where id=p_user_id;
  if not found then raise exception 'Akun tidak ditemukan'; end if;
end;
$$;
revoke all on function public.super_admin_delete_disabled_account(uuid) from public, anon;
grant execute on function public.super_admin_delete_disabled_account(uuid) to authenticated;
