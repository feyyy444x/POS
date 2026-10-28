-- Enable Supabase Postgres Changes for tables that already have client-side realtime listeners.
-- Idempotent: only add tables that are not already members of supabase_realtime.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'site_subscription_plans',
    'store_tv_settings',
    'store_tv_media'
  ] loop
    if to_regclass('public.' || table_name) is not null
       and not exists (
         select 1
         from pg_publication_tables
         where pubname = 'supabase_realtime'
           and schemaname = 'public'
           and tablename = table_name
       ) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end
$$;
