begin;

-- Public-facing tables: keep anonymous read-only access where the policies explicitly allow it.
revoke all privileges on table public.site_promotions, public.site_subscription_plans,
  public.super_admins, public.support_messages, public.support_channel_settings
from public, anon, authenticated;

grant select on table public.site_promotions, public.site_subscription_plans,
  public.support_channel_settings to anon;

-- Authenticated mutations remain subject to each table's existing RLS policies.
grant select, insert, update, delete on table public.site_promotions,
  public.site_subscription_plans to authenticated;
grant select on table public.super_admins to authenticated;
grant select, insert on table public.support_messages to authenticated;
grant select, insert, update, delete on table public.support_channel_settings to authenticated;

commit;
