-- NexaPos support live chat messages.
create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  user_email text not null default '',
  sender_role text not null check (sender_role in ('customer','support')),
  message text not null check (char_length(trim(message)) between 1 and 3000),
  created_at timestamptz not null default now()
);
create index if not exists support_messages_user_created_idx on public.support_messages (user_id, created_at);
alter table public.support_messages enable row level security;
drop policy if exists support_messages_read_own_or_admin on public.support_messages;
create policy support_messages_read_own_or_admin on public.support_messages for select to authenticated
using (user_id = auth.uid() or exists (select 1 from public.super_admins sa where sa.user_id = auth.uid()));
drop policy if exists support_messages_insert_customer_or_admin on public.support_messages;
create policy support_messages_insert_customer_or_admin on public.support_messages for insert to authenticated
with check (
  sender_id = auth.uid()
  and (
    (sender_role = 'customer' and user_id = auth.uid())
    or (sender_role = 'support' and exists (select 1 from public.super_admins sa where sa.user_id = auth.uid()))
  )
);
revoke all on public.support_messages from anon, public;
grant select, insert on public.support_messages to authenticated;
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='support_messages') then
    alter publication supabase_realtime add table public.support_messages;
  end if;
end $$;
