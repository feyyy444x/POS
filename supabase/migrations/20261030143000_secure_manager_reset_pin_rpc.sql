-- Restrict manager PIN reset RPC to authenticated callers only.
-- The function body still enforces active manager status and verified PIN.
revoke all on function public.manager_reset_store_member_pin(uuid) from public, anon;
grant execute on function public.manager_reset_store_member_pin(uuid) to authenticated;
