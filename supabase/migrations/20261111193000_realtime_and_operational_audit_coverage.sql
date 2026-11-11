-- Keep operational configuration changes observable across authorized sessions.
-- This migration is committed to the preview branch only; it is not applied to production.

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'store_tv_settings',
    'site_subscription_plans',
    'self_service_order_items'
  ] loop
    if to_regclass(format('public.%I', v_table)) is not null
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
end;
$$;

-- Extend audit coverage to mutable operational settings and break records.
do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'cashier_break_settings',
    'cashier_shift_breaks',
    'store_tv_settings'
  ] loop
    if to_regclass(format('public.%I', v_table)) is not null
       and not exists (
         select 1 from pg_trigger
         where tgrelid = to_regclass(format('public.%I', v_table))
           and tgname = 'nexapos_audit_event'
           and not tgisinternal
       ) then
      execute format(
        'create trigger nexapos_audit_event after insert or update or delete on public.%I for each row execute function private.capture_nexapos_audit_event()',
        v_table
      );
    end if;
  end loop;
end;
$$;
