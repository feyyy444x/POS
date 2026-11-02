-- Public queue display no longer exposes or renders media/video/template settings.
-- The high-entropy public token remains the only unauthenticated lookup key.
CREATE OR REPLACE FUNCTION public.get_public_tv_display(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  result jsonb;
BEGIN
  IF p_token IS NULL OR length(p_token) < 32 THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'store_id', s.id,
    'store_name', coalesce(ss.store_name, s.name, 'NexaPos'),
    'queue_enabled', coalesce(ss.queue_enabled, true),
    'settings', jsonb_build_object(
      'queue_prefix', coalesce(ss.queue_prefix, 'A'),
      'queue_enabled', coalesce(ss.queue_enabled, true)
    ),
    'current', CASE WHEN coalesce(ss.queue_enabled, true) THEN coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', q.id,
        'queue_number', q.queue_number,
        'customer_name', q.customer_name,
        'counter_label', q.counter_label,
        'status', q.status,
        'called_at', q.called_at
      ) ORDER BY q.called_at DESC NULLS LAST, q.created_at DESC)
      FROM (
        SELECT *
        FROM public.queue_tickets
        WHERE store_id = s.id
          AND service_date = (pg_catalog.now() AT TIME ZONE 'Asia/Jakarta')::date
          AND status IN ('called', 'serving')
        ORDER BY called_at DESC NULLS LAST, created_at DESC
        LIMIT 3
      ) q
    ), '[]'::jsonb) ELSE '[]'::jsonb END,
    'waiting', CASE WHEN coalesce(ss.queue_enabled, true) THEN coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', q.id,
        'queue_number', q.queue_number,
        'customer_name', q.customer_name,
        'counter_label', q.counter_label,
        'status', q.status
      ) ORDER BY q.queue_number)
      FROM (
        SELECT *
        FROM public.queue_tickets
        WHERE store_id = s.id
          AND service_date = (pg_catalog.now() AT TIME ZONE 'Asia/Jakarta')::date
          AND status = 'waiting'
        ORDER BY queue_number
        LIMIT 6
      ) q
    ), '[]'::jsonb) ELSE '[]'::jsonb END
  )
  INTO result
  FROM public.store_tv_settings cfg
  JOIN public.stores s ON s.id = cfg.store_id
  LEFT JOIN public.store_settings ss ON ss.store_id = s.id
  WHERE cfg.public_token = p_token
    AND s.status = 'active'
    AND (s.expires_at IS NULL OR s.expires_at > pg_catalog.now());

  RETURN result;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_public_tv_display(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_tv_display(text) TO anon, authenticated;

COMMENT ON FUNCTION public.get_public_tv_display(text) IS
  'Token-gated queue-only public display. Returns current/waiting tickets only while the tenant queue feature is enabled; never returns media or template configuration.';
