-- Global support-channel configuration and shared website realtime.
-- WhatsApp is opt-in until a Super Admin enters the official support number.
create table if not exists public.support_channel_settings (
  id smallint primary key default 1 check (id = 1),
  whatsapp_enabled boolean not null default false,
  whatsapp_number text,
  telegram_enabled boolean not null default true,
  telegram_username text not null default 'becaaapos',
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint support_channel_settings_whatsapp_number_format
    check (whatsapp_number is null or whatsapp_number ~ '^[1-9][0-9]{7,14}$'),
  constraint support_channel_settings_telegram_username_format
    check (telegram_username is null or telegram_username ~ '^[A-Za-z0-9_]{5,32}$')
);

insert into public.support_channel_settings
  (id, whatsapp_enabled, whatsapp_number, telegram_enabled, telegram_username)
values
  (1, false, null, true, 'becaaapos')
on conflict (id) do nothing;

alter table public.support_channel_settings enable row level security;
revoke all on public.support_channel_settings from public, anon, authenticated;
grant select on public.support_channel_settings to anon, authenticated;
grant insert, update on public.support_channel_settings to authenticated;

drop policy if exists "Anyone can read public support channels" on public.support_channel_settings;
create policy "Anyone can read public support channels"
  on public.support_channel_settings for select
  to anon, authenticated
  using (true);

drop policy if exists "Super admins can insert support channels" on public.support_channel_settings;
create policy "Super admins can insert support channels"
  on public.support_channel_settings for insert to authenticated
  with check (
    exists (select 1 from public.super_admins sa where sa.user_id = (select auth.uid()))
  );

drop policy if exists "Super admins can update support channels" on public.support_channel_settings;
create policy "Super admins can update support channels"
  on public.support_channel_settings for update to authenticated
  using (
    exists (select 1 from public.super_admins sa where sa.user_id = (select auth.uid()))
  )
  with check (
    exists (select 1 from public.super_admins sa where sa.user_id = (select auth.uid()))
  );

-- Realtime is used by workspace lists, the public homepage, help channels, and sales details.
do $$
declare
  table_name text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach table_name in array array['support_channel_settings', 'site_promotions', 'order_items'] loop
      if to_regclass('public.' || table_name) is not null
         and not exists (
           select 1 from pg_publication_tables
           where pubname = 'supabase_realtime'
             and schemaname = 'public'
             and tablename = table_name
         ) then
        execute format('alter publication supabase_realtime add table public.%I', table_name);
      end if;
    end loop;
  end if;
end $$;

notify pgrst, 'reload schema';
