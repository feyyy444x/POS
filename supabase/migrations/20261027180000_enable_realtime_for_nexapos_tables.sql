-- Enable Supabase Realtime for the operational tables used by NexaPos.
-- Idempotent so it is safe when applied to an environment where some tables are already published.
do $$
declare
  table_name text;
begin
  foreach table_name in array array['orders','store_settings','store_members','store_invites','stores']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = table_name
    ) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end
$$;
