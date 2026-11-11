-- Safely remove disabled staff logins without deleting support conversation history.
-- Historical operational records retain their snapshots; nullable actor links become detached.

alter table public.support_conversations
  add column if not exists user_email_snapshot text;

update public.support_conversations sc
set user_email_snapshot = coalesce(sc.user_email_snapshot, u.email)
from auth.users u
where u.id = sc.user_id
  and sc.user_email_snapshot is null;

alter table public.support_conversations
  alter column user_id drop not null;
alter table public.support_conversations
  drop constraint if exists support_conversations_user_id_fkey;
alter table public.support_conversations
  add constraint support_conversations_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete set null;

alter table public.support_messages
  alter column user_id drop not null,
  alter column sender_id drop not null;
alter table public.support_messages
  drop constraint if exists support_messages_user_id_fkey,
  drop constraint if exists support_messages_sender_id_fkey;
alter table public.support_messages
  add constraint support_messages_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete set null,
  add constraint support_messages_sender_id_fkey
    foreign key (sender_id) references auth.users(id) on delete set null;

create or replace function public.super_admin_delete_disabled_account(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_email text;
begin
  if not private.is_super_admin() then
    raise exception 'Super Admin access required';
  end if;

  if p_user_id is null or p_user_id = (select auth.uid()) then
    raise exception 'Target akun tidak valid';
  end if;

  -- Lock the account row so concurrent membership changes cannot race deletion.
  select u.email
    into v_email
  from auth.users u
  where u.id = p_user_id
  for update;

  if not found then
    raise exception 'Akun tidak ditemukan';
  end if;

  if exists (
    select 1 from public.super_admins sa where sa.user_id = p_user_id
  ) then
    raise exception 'Akun Super Admin dilindungi';
  end if;

  if coalesce(private.is_platform_staff_user(p_user_id), false) then
    raise exception 'Akun staf platform dilindungi';
  end if;

  if exists (
    select 1
    from public.owner_organizations o
    where o.owner_user_id = p_user_id
  ) or exists (
    select 1
    from public.store_members m
    where m.user_id = p_user_id and m.role = 'owner'
  ) then
    raise exception 'Akun Owner tidak dapat dihapus melalui penghapusan akun staf';
  end if;

  if not exists (
    select 1
    from public.store_members m
    where m.user_id = p_user_id
      and m.is_active = false
      and m.role <> 'owner'
  ) then
    raise exception 'Akun tidak memiliki keanggotaan staf nonaktif yang memenuhi syarat';
  end if;

  if exists (
    select 1
    from public.store_members m
    where m.user_id = p_user_id and m.is_active = true
  ) then
    raise exception 'Akun ini masih aktif di tenant lain; nonaktifkan seluruh keanggotaannya terlebih dahulu';
  end if;

  if exists (
    select 1
    from public.cashier_shifts cs
    where cs.cashier_id = p_user_id and cs.closed_at is null
  ) then
    raise exception 'Akun masih memiliki sesi kasir terbuka. Tutup sesi kasir terlebih dahulu.';
  end if;

  -- Invitations are pending access records, not historical transaction records.
  if v_email is not null then
    delete from public.store_invites
    where lower(email) = lower(v_email);
  end if;

  -- Delete memberships explicitly; operational tables keep their actor snapshots
  -- and nullable auth references (ON DELETE SET NULL).
  delete from public.store_members where user_id = p_user_id;

  delete from auth.users where id = p_user_id;
  if not found then
    raise exception 'Akun tidak ditemukan';
  end if;
end;
$function$;

revoke all on function public.super_admin_delete_disabled_account(uuid) from public, anon;
grant execute on function public.super_admin_delete_disabled_account(uuid) to authenticated;
