-- Enable Supabase Realtime for the remaining operational tables used by NexaPos.
-- products and queue_tickets are already members of supabase_realtime.
alter publication supabase_realtime
  add table public.orders,
             public.store_settings,
             public.store_members,
             public.store_invites,
             public.stores;