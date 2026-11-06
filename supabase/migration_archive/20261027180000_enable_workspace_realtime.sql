-- Enable Supabase Realtime for the remaining NexaPOS workspace and management tables.
-- Keep this migration in the feature branch until the user approves production rollout.
do $$
declare
  table_name text;
begin
  foreach table_name in array array['orders','store_settings','store_members','store_invites','stores']
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
