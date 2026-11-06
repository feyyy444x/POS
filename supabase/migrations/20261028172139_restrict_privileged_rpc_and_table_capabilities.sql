begin;

revoke truncate, references, trigger, maintain on table
  public.orders, public.order_items, public.products, public.queue_tickets,
  public.cashier_manual_alerts, public.cashier_shift_breaks, public.cashier_shifts,
  public.cashier_break_settings, public.stores, public.store_members,
  public.store_invites, public.store_settings, public.store_tv_settings, public.store_tv_media
from authenticated;

-- Remove inherited PUBLIC execute from privileged RPCs; retain authenticated application access.
do $$
declare f record;
begin
  for f in
    select p.proname, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.prosecdef
  loop
    execute format('revoke execute on function public.%I(%s) from public', f.proname, f.args);
    execute format('grant execute on function public.%I(%s) to authenticated', f.proname, f.args);
    if f.proname = 'get_public_tv_display' then
      execute format('grant execute on function public.%I(%s) to anon', f.proname, f.args);
    end if;
  end loop;
end $$;

commit;
