-- Cover foreign keys flagged by the Supabase performance advisor.
-- Preserve the production authorization predicates while avoiding per-row auth.uid() evaluation.
create index if not exists cashier_manual_alerts_cashier_id_idx on public.cashier_manual_alerts (cashier_id);
create index if not exists cashier_manual_alerts_sent_by_idx on public.cashier_manual_alerts (sent_by);
create index if not exists site_promotions_created_by_idx on public.site_promotions (created_by);
create index if not exists site_subscription_plans_updated_by_idx on public.site_subscription_plans (updated_by);
create index if not exists store_invites_invited_by_idx on public.store_invites (invited_by);
create index if not exists store_invites_store_id_idx on public.store_invites (store_id);
create index if not exists store_members_disabled_by_idx on public.store_members (disabled_by);
create index if not exists support_messages_sender_id_idx on public.support_messages (sender_id);
create index if not exists platform_staff_roles_created_by_idx on public.platform_staff_roles (created_by);
create index if not exists platform_staff_roles_updated_by_idx on public.platform_staff_roles (updated_by);

drop policy if exists "cashier alerts recipient or manager read" on public.cashier_manual_alerts;
create policy "cashier alerts recipient or manager read"
  on public.cashier_manual_alerts for select to authenticated
  using (cashier_id = (select auth.uid()) or private.is_store_manager(store_id));

drop policy if exists "store managers send cashier alerts" on public.cashier_manual_alerts;
create policy "store managers send cashier alerts"
  on public.cashier_manual_alerts for insert to authenticated
  with check (
    sent_by = (select auth.uid())
    and private.is_store_manager(store_id)
    and private.is_store_operational(store_id)
    and exists (
      select 1 from public.store_members m
      where m.store_id = cashier_manual_alerts.store_id
        and m.user_id = cashier_manual_alerts.cashier_id
        and m.is_active = true
        and m.disabled_at is null
    )
  );
