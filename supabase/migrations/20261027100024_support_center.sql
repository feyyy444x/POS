-- NexaPos Help Center: live chat messages with customer / Super Admin access.
create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  user_email text not null default '',
  sender_role text not null check (sender_role in ('customer', 'support')),
  message text not null check (char_length(trim(message)) between 1 and 3000),
  created_at timestamptz not null default now()
);

create index if not exists support_messages_user_created_idx
  on public.support_messages (user_id, created_at asc);
create index if not exists support_messages_created_idx
  on public.support_messages (created_at desc);

alter table public.support_messages enable row level security;

drop policy if exists "Customers and Super Admins can read support messages" on public.support_messages;
create policy "Customers and Super Admins can read support messages"
  on public.support_messages for select to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.super_admins sa
      where sa.user_id = (select auth.uid())
    )
  );

drop policy if exists "Customers and Super Admins can send support messages" on public.support_messages;
create policy "Customers and Super Admins can send support messages"
  on public.support_messages for insert to authenticated
  with check (
    (
      sender_role = 'customer'
      and sender_id = (select auth.uid())
      and user_id = (select auth.uid())
    )
    or
    (
      sender_role = 'support'
      and sender_id = (select auth.uid())
      and exists (
        select 1 from public.super_admins sa
        where sa.user_id = (select auth.uid())
      )
    )
  );

-- No update/delete policies are intentionally provided: chat history is append-only.
-- Add the table to Supabase Realtime when the publication exists and it is not already present.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1
       from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'support_messages'
     ) then
    alter publication supabase_realtime add table public.support_messages;
  end if;
end $$;
