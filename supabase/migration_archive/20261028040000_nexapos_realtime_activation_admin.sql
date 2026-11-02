-- Ensure realtime subscriptions used by NexaPos activation/team/admin screens can receive updates.
-- Safe to rerun: only add existing public tables that are not already published.
do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'site_subscription_plans',
    'store_tv_settings',
    'store_tv_media',
    'store_members',
    'store_invites'
  ] loop
    if to_regclass('public.' || v_table) is not null
       and not exists (
         select 1
         from pg_publication_tables
         where pubname = 'supabase_realtime'
           and schemaname = 'public'
           and tablename = v_table
       ) then
      execute format('alter publication supabase_realtime add table public.%I', v_table);
    end if;
  end loop;
end
$$;
