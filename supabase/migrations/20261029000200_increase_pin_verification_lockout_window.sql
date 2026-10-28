-- Increase the lockout after five failed PIN attempts from one minute to fifteen minutes.
-- This reduces online brute-force throughput against the four-digit staff PIN.
CREATE OR REPLACE FUNCTION public.verify_my_pin(p_pin text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_session uuid := private.current_session_id();
  v_hash text;
  v_attempts integer;
  v_locked timestamptz;
BEGIN
  IF v_user IS NULL OR v_session IS NULL THEN
    RAISE EXCEPTION 'Sesi login tidak valid';
  END IF;

  SELECT failed_attempts, locked_until
    INTO v_attempts, v_locked
  FROM public.user_pin_attempt_limits
  WHERE user_id = v_user;

  IF v_locked IS NOT NULL AND v_locked > now() THEN
    RAISE EXCEPTION 'Terlalu banyak percobaan. Coba lagi setelah %', v_locked;
  END IF;

  IF p_pin !~ '^[0-9]{4}$' THEN
    v_hash := NULL;
  ELSE
    SELECT pin_hash INTO v_hash
    FROM public.user_security_pins
    WHERE user_id = v_user;
  END IF;

  IF v_hash IS NULL OR v_hash <> extensions.crypt(coalesce(p_pin, ''), v_hash) THEN
    INSERT INTO public.user_pin_attempt_limits(user_id, failed_attempts, locked_until, updated_at)
    VALUES (v_user, 1, NULL, now())
    ON CONFLICT (user_id) DO UPDATE SET
      failed_attempts = CASE
        WHEN public.user_pin_attempt_limits.locked_until IS NOT NULL
          AND public.user_pin_attempt_limits.locked_until <= now()
        THEN 1
        ELSE public.user_pin_attempt_limits.failed_attempts + 1
      END,
      locked_until = CASE
        WHEN (
          CASE
            WHEN public.user_pin_attempt_limits.locked_until IS NOT NULL
              AND public.user_pin_attempt_limits.locked_until <= now()
            THEN 1
            ELSE public.user_pin_attempt_limits.failed_attempts + 1
          END
        ) >= 5
        THEN now() + interval '15 minutes'
        ELSE NULL
      END,
      updated_at = now();
    RETURN false;
  END IF;

  DELETE FROM public.user_pin_attempt_limits WHERE user_id = v_user;
  INSERT INTO public.pin_verified_sessions(session_id, user_id, expires_at)
  VALUES (v_session, v_user, now() + interval '12 hours')
  ON CONFLICT (session_id) DO UPDATE
    SET user_id = excluded.user_id,
        verified_at = now(),
        expires_at = excluded.expires_at;
  RETURN true;
END;
$function$;
