-- Cover foreign keys flagged by the Supabase performance advisor.
-- These indexes support joins and avoid full scans when referenced rows are updated/deleted.
-- IF NOT EXISTS keeps this safe when an equivalent named index was already created.

create index if not exists cashier_manual_alerts_cashier_id_idx
  on public.cashier_manual_alerts (cashier_id);

create index if not exists cashier_manual_alerts_sent_by_idx
  on public.cashier_manual_alerts (sent_by);

create index if not exists site_promotions_created_by_idx
  on public.site_promotions (created_by);

create index if not exists site_subscription_plans_updated_by_idx
  on public.site_subscription_plans (updated_by);

create index if not exists store_invites_invited_by_idx
  on public.store_invites (invited_by);

create index if not exists store_invites_store_id_idx
  on public.store_invites (store_id);

create index if not exists store_members_disabled_by_idx
  on public.store_members (disabled_by);

create index if not exists support_messages_sender_id_idx
  on public.support_messages (sender_id);
