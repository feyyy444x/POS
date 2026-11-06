-- Sensitive Owner operations must enforce PIN verification in the database,
-- not only through the frontend PIN gate. Disabled memberships must never
-- continue to satisfy manager authorization predicates.
create or replace function private.is_store_manager(target_store uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select private.is_pin_verified()
    and exists (
      select 1 from public.store_members m
      where m.store_id = target_store
        and m.user_id = (select auth.uid())
        and m.role in ('owner','admin')
        and m.is_active = true
        and m.disabled_at is null
    )
$function$;

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
  v_email text;
  v_invite_id uuid;
  v_name text := btrim(coalesce(p_full_name, ''));
  v_code text := lower(btrim(coalesce(p_activation_code, '')));
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;
  if not private.is_pin_verified() then
    raise exception 'Verifikasi PIN diperlukan untuk mengundang karyawan';
  end if;
  if not exists (
    select 1 from public.store_members m
    where m.store_id = p_store_id
      and m.user_id = (select auth.uid())
      and m.role = 'owner'
      and m.is_active = true
      and m.disabled_at is null
  ) then
    raise exception 'Hanya Owner aktif toko yang dapat mengundang anggota';
  end if;
  if not private.is_store_operational(p_store_id) then
    raise exception 'Toko tidak aktif atau masa aktivasinya telah habis';
  end if;
  if p_role not in ('admin', 'cashier') then
    raise exception 'Jabatan hanya boleh Admin atau Kasir';
  end if;
  if char_length(v_name) < 2 or char_length(v_name) > 120 then
    raise exception 'Nama karyawan harus 2 sampai 120 karakter';
  end if;
  if v_code !~ '^[a-f0-9]{32}$' then
    raise exception 'Kode aktivasi tidak valid';
  end if;
  v_email := lower(btrim(coalesce(p_email, '')));
  if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Format email tidak valid';
  end if;
  if exists (
    select 1 from public.store_members m
    where m.store_id = p_store_id and lower(m.email) = v_email
  ) then
    raise exception 'Email sudah menjadi anggota toko ini';
  end if;
  delete from public.store_invites
  where store_id = p_store_id and lower(email) = v_email and accepted_at is null;
  insert into public.store_invites(
    store_id, email, full_name, role, invited_by, activation_code_hash
  ) values (
    p_store_id, v_email, v_name, p_role,
    (select auth.uid()), encode(extensions.digest(v_code, 'sha256'), 'hex')
  ) returning id into v_invite_id;
  return v_invite_id;
end;
$function$;

revoke all on function public.invite_store_member(uuid,text,text,text,text) from public, anon;
grant execute on function public.invite_store_member(uuid,text,text,text,text) to authenticated;
