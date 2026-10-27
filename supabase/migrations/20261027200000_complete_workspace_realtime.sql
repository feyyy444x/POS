-- Make every live workspace data source available to Supabase Realtime.
-- Idempotent: safe when some tables were already added by earlier migrations.
do $$
declare
  table_name text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    raise notice 'supabase_realtime publication is not available; skipping table registration';
    return;
  end if;

  foreach table_name in array array[
    'stores',
    'store_members',
    'store_invites',
    'store_settings',
    'products',
    'orders',
    'order_items',
    'queue_tickets',
    'support_messages'
  ]
  loop
    if to_regclass(format('public.%I', table_name)) is not null
       and not exists (
         select 1
         from pg_publication_tables
         where pubname = 'supabase_realtime'
           and schemaname = 'public'
           and tablename = table_name
       )
    then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end $$;
