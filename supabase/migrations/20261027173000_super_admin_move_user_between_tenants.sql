create or replace function public.super_admin_move_user_membership(
  p_user_id uuid,
  p_source_store_id uuid,
  p_target_store_id uuid,
  p_target_role text
)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_source_role text;
  v_target_status text;
  v_target_deleted_at timestamptz;
  v_is_super_admin boolean;
begin
  if not private.is_super_admin() then
    raise exception 'Super Admin access required';
  end if;

  if p_user_id is null or p_source_store_id is null or p_target_store_id is null then
    raise exception 'Akun, tenant asal, dan tenant tujuan wajib dipilih';
  end if;

  if p_source_store_id = p_target_store_id then
    raise exception 'Tenant asal dan tujuan tidak boleh sama';
  end if;

  if p_target_role not in ('admin', 'manager', 'cashier') then
    raise exception 'Role tujuan tidak valid; pilih admin, manager, atau cashier';
  end if;

  select exists (
    select 1 from public.super_admins sa where sa.user_id = p_user_id
  ) into v_is_super_admin;

  if v_is_super_admin then
    raise exception 'Akun Super Admin dilindungi dan tidak dapat dipindahkan sebagai karyawan';
  end if;

  select s.status, s.deleted_at
    into v_target_status, v_target_deleted_at
  from public.stores s
  where s.id = p_target_store_id;

  if not found then
    raise exception 'Tenant tujuan tidak ditemukan';
  end if;

  if v_target_deleted_at is not null or v_target_status = 'deleted' then
    raise exception 'Tenant tujuan sudah dihapus dan tidak dapat dipilih';
  end if;

  select m.role
    into v_source_role
  from public.store_members m
  where m.user_id = p_user_id
    and m.store_id = p_source_store_id
  for update;

  if not found then
    raise exception 'Keanggotaan akun di tenant asal tidak ditemukan';
  end if;

  if v_source_role = 'owner' then
    raise exception 'Role Owner tidak dapat dipindahkan melalui fitur pemindahan karyawan';
  end if;

  if exists (
    select 1 from public.store_members m
    where m.user_id = p_user_id and m.store_id = p_target_store_id
  ) then
    update public.store_members
    set role = p_target_role,
        is_active = true,
        disabled_at = null,
        disabled_by = null
    where user_id = p_user_id and store_id = p_target_store_id;

    delete from public.store_members
    where user_id = p_user_id and store_id = p_source_store_id;
  else
    update public.store_members
    set store_id = p_target_store_id,
        role = p_target_role,
        is_active = true,
        disabled_at = null,
        disabled_by = null
    where user_id = p_user_id and store_id = p_source_store_id;
  end if;
end;
$function$;

revoke all on function public.super_admin_move_user_membership(uuid, uuid, uuid, text) from public, anon;
grant execute on function public.super_admin_move_user_membership(uuid, uuid, uuid, text) to authenticated;
