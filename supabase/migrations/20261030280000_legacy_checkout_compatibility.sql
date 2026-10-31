-- Keep the legacy checkout RPC available while the current production frontend is still on main.
-- PR #20 switches the client to complete_sale_idempotent; after that frontend is deployed,
-- a later release may revoke this legacy grant once all active clients have upgraded.
grant execute on function public.complete_sale(uuid, jsonb, numeric, text, numeric, text, boolean)
  to authenticated;
