begin;

-- Remove broad default grants that bypass row-level policies for destructive operations.
revoke all privileges on table public.orders, public.order_items, public.products,
  public.queue_tickets, public.cashier_manual_alerts, public.cashier_shift_breaks,
  public.cashier_shifts, public.cashier_break_settings, public.stores,
  public.store_members, public.store_invites, public.store_settings,
  public.store_tv_settings, public.store_tv_media
from public, anon;

-- Authenticated clients get only row-scoped CRUD; never grant TRUNCATE, REFERENCES, TRIGGER or MAINTAIN.
grant select, insert, update, delete on table public.orders, public.order_items,
  public.products, public.queue_tickets, public.cashier_manual_alerts,
  public.cashier_shift_breaks, public.cashier_shifts, public.cashier_break_settings,
  public.stores, public.store_members, public.store_invites, public.store_settings,
  public.store_tv_settings, public.store_tv_media to authenticated;

-- Sensitive PIN/session internals must be accessible only through vetted database functions.
revoke all privileges on table public.pin_verified_sessions,
  public.user_pin_attempt_limits, public.user_security_pins
from public, anon, authenticated;

-- Public TV access is intentional, but remove mutable search_path resolution.
alter function public.get_public_tv_display(text) set search_path = '';

commit;
