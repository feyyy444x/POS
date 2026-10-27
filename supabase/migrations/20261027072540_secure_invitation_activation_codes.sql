-- Require a one-time owner-shared activation code before privileged invitation activation.
alter table public.store_invites
  add column if not exists activation_code_hash text;

drop function if exists public.invite_store_member(uuid, text, text, text);

create or replace function public.invite_store_member(
  p_store_id uuid,
  p_email text,
  p_full_name text,
  p_role text,
  p_activation_code text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text;
  v_invite_id uuid;
  v_code text := lower(trim(coalesce(p_activation_code, '')));
begin
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
  if v_code !~ '^[a-f0-9]{32}$' then
    raise exception 'Kode aktivasi tidak valid';
  end if;
  v_email := lower(trim(p_email));
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
    p_store_id, v_email, trim(coalesce(p_full_name, '')), p_role,
    (select auth.uid()), encode(extensions.digest(v_code, 'sha256'), 'hex')
  ) returning id into v_invite_id;
  return v_invite_id;
end;
$$;
revoke all on function public.invite_store_member(uuid, text, text, text, text) from public, anon;
grant execute on function public.invite_store_member(uuid, text, text, text, text) to authenticated;
