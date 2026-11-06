-- Secure typing presence for NexaBot Support Center.
-- Typing timestamps are ephemeral state; message timestamps and conversation status are untouched.
ALTER TABLE public.support_conversations
  ADD COLUMN IF NOT EXISTS user_typing_at timestamptz,
  ADD COLUMN IF NOT EXISTS admin_typing_at timestamptz;

CREATE OR REPLACE FUNCTION public.set_support_typing_status(
  p_user_id uuid,
  p_is_typing boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_user_id uuid := (SELECT auth.uid());
  v_is_anonymous boolean := COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false);
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Silakan masuk untuk memperbarui status mengetik';
  END IF;

  IF private.is_super_admin() THEN
    IF NOT private.is_pin_verified() THEN
      RAISE EXCEPTION 'Verifikasi PIN Admin NexaPos terlebih dahulu';
    END IF;
    IF p_user_id IS NULL THEN
      RAISE EXCEPTION 'Target percakapan tidak valid';
    END IF;

    UPDATE public.support_conversations
      SET admin_typing_at = CASE WHEN p_is_typing THEN now() ELSE NULL END
      WHERE user_id = p_user_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Percakapan tidak ditemukan';
    END IF;
    RETURN;
  END IF;

  IF p_user_id IS NOT NULL AND p_user_id <> v_user_id THEN
    RAISE EXCEPTION 'Anda hanya dapat memperbarui status mengetik percakapan sendiri';
  END IF;
  IF NOT v_is_anonymous AND NOT private.is_pin_verified() THEN
    RAISE EXCEPTION 'Verifikasi PIN terlebih dahulu';
  END IF;

  INSERT INTO public.support_conversations(user_id, status, updated_at, last_message_at)
  VALUES (v_user_id, 'ai_active', now(), now())
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.support_conversations
    SET user_typing_at = CASE WHEN p_is_typing THEN now() ELSE NULL END
    WHERE user_id = v_user_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.set_support_typing_status(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_support_typing_status(uuid, boolean) TO authenticated;
