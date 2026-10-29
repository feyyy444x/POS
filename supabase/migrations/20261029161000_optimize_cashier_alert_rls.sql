-- Avoid per-row re-evaluation of auth.uid() in cashier alert policies.
-- Keep the existing authorization predicates unchanged.

drop policy if exists "cashier alerts recipient or manager read"
  on public.cashier_manual_alerts;
create policy "cashier alerts recipient or manager read"
  on public.cashier_manual_alerts
  for select
  to authenticated
  using (
    cashier_id = (select auth.uid())
    or private.is_store_manager(store_id)
  );

drop policy if exists "store managers send cashier alerts"
  on public.cashier_manual_alerts;
create policy "store managers send cashier alerts"
  on public.cashier_manual_alerts
  for insert
  to authenticated
  with check (
    sent_by = (select auth.uid())
    and private.is_store_manager(store_id)
    and exists (
      select 1
      from public.store_members m
      where m.store_id = cashier_manual_alerts.store_id
        and m.user_id = cashier_manual_alerts.cashier_id
        and m.is_active = true
    )
  );
