-- Explicitly deny direct API access to PIN security tables.
-- Trusted SECURITY DEFINER functions are the only intended access path.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polrelid = 'public.pin_verified_sessions'::regclass AND polname = 'deny_direct_access_to_pin_verified_sessions') THEN
    CREATE POLICY deny_direct_access_to_pin_verified_sessions ON public.pin_verified_sessions
      FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polrelid = 'public.user_pin_attempt_limits'::regclass AND polname = 'deny_direct_access_to_user_pin_attempt_limits') THEN
    CREATE POLICY deny_direct_access_to_user_pin_attempt_limits ON public.user_pin_attempt_limits
      FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polrelid = 'public.user_security_pins'::regclass AND polname = 'deny_direct_access_to_user_security_pins') THEN
    CREATE POLICY deny_direct_access_to_user_security_pins ON public.user_security_pins
      FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
  END IF;
END $$;

-- This legacy RPC only raises an exception and has no valid application use.
REVOKE EXECUTE ON FUNCTION public.accept_store_invites() FROM PUBLIC, anon, authenticated;
