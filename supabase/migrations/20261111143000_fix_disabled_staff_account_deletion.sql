-- Permanently remove eligible disabled staff logins without erasing operational or support history.
-- Historical support actor IDs and email snapshots remain available to the Super Admin inbox.

alter table public.support_conversations
  add column if not exists user_email_snapshot text;

update public.support_conversations sc
set user_email_snapshot = coalesce(sc.user_email_snapshot, u.email)
from auth.users u
where u.id = sc.user_id
  and sc.user_email_snapshot is null;

-- Keep the original UUIDs as historical conversation/thread keys. Removing these
-- foreign keys prevents Auth deletion from cascading away chat history or nulling
-- the IDs that the support inbox uses to group and reopen old conversations.
alter table public.support_conversations
  drop constraint if exists support_conversations_user_id_fkey;

alter table public.support_messages
  drop constraint if exists support_messages_user_id_fkey,
  drop constraint if exists support_messages_sender_id_fkey;

comment on column public.support_conversations.user_id is
  'Historical Auth user UUID retained as a support-thread key after account deletion.';
comment on column public.support_conversations.user_email_snapshot is
  'Email snapshot retained for support history after the Auth account is deleted.';
comment on column public.support_messages.user_id is
  'Historical Auth user UUID retained to group support messages after account deletion.';
comment on column public.support_messages.sender_id is
  'Historical Auth sender UUID; no longer a live Auth foreign key after account deletion.';

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

  -- Lock the Auth row first. The FK key lock also prevents a concurrent new
  -- membership from being attached while the eligibility checks are running.
  select u.email
    into v_email
  from auth.users u
  where u.id = p_user_id
  for update;

  if not found then
    raise exception 'Akun tidak ditemukan';
  end if;

  -- Serialize with concurrent membership/status changes for this account.
  perform 1
  from public.store_members m
  where m.user_id = p_user_id
  for update;

  perform 1
  from public.owner_organizations o
  where o.owner_user_id = p_user_id
  for update;

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

  -- Supabase Storage owns uploaded objects independently from Auth. Never delete
  -- object rows with SQL (that can orphan files); ask an administrator to move
  -- ownership through the Storage API before deleting this account.
  if exists (
    select 1
    from storage.objects so
    where so.owner_id = p_user_id::text
       or so.owner = p_user_id
  ) then
    raise exception 'Akun masih memiliki file di Storage. Pindahkan kepemilikan file melalui Storage terlebih dahulu.';
  end if;

  -- Invitations are pending access records, not historical transaction records.
  if v_email is not null then
    delete from public.store_invites
    where lower(email) = lower(v_email);
  end if;

  -- Keep operational records and their actor snapshots. The store_members DELETE
  -- audit trigger records each removed membership before the Auth row is deleted.
  delete from public.store_members where user_id = p_user_id;

  -- Record the global account deletion explicitly; never store credentials/tokens.
  insert into public.platform_audit_logs (
    actor_user_id, entity_table, entity_id, action, before_data
  ) values (
    (select auth.uid()),
    'auth.users',
    p_user_id::text,
    'DELETE',
    jsonb_build_object('user_id', p_user_id, 'email', v_email)
  );

  delete from auth.users where id = p_user_id;
  if not found then
    raise exception 'Akun tidak ditemukan';
  end if;
end;
$function$;

revoke all on function public.super_admin_delete_disabled_account(uuid) from public, anon;
grant execute on function public.super_admin_delete_disabled_account(uuid) to authenticated;
