-- All support message writes must pass through validated, rate-limited SECURITY DEFINER RPCs.
-- The client no longer inserts directly; retaining table INSERT grants would bypass the RPC rate limit.
REVOKE INSERT ON TABLE public.support_messages FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.support_messages TO authenticated;
