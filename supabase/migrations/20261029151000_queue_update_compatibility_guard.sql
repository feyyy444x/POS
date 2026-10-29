-- Preserve the currently published UI while hardening queue row mutations.
-- The production app still uses direct updates for status transitions, so grant only
-- the three fields it currently writes and validate every transition in the database.

GRANT UPDATE (status, called_at, completed_at)
  ON TABLE public.queue_tickets TO authenticated;

DROP POLICY IF EXISTS "members update operational queue" ON public.queue_tickets;
DROP POLICY IF EXISTS "members update operational queue while enabled" ON public.queue_tickets;
CREATE POLICY "members update operational queue while enabled"
  ON public.queue_tickets FOR UPDATE TO authenticated
  USING (
    private.is_store_operational(store_id)
    AND EXISTS (
      SELECT 1 FROM public.store_settings ss
      WHERE ss.store_id = queue_tickets.store_id
        AND ss.queue_enabled IS TRUE
    )
  )
  WITH CHECK (
    private.is_store_operational(store_id)
    AND EXISTS (
      SELECT 1 FROM public.store_settings ss
      WHERE ss.store_id = queue_tickets.store_id
        AND ss.queue_enabled IS TRUE
    )
  );

CREATE OR REPLACE FUNCTION private.guard_queue_ticket_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
DECLARE
  v_queue_enabled boolean;
BEGIN
  IF NEW.store_id IS DISTINCT FROM OLD.store_id
     OR NEW.service_date IS DISTINCT FROM OLD.service_date
     OR NEW.queue_number IS DISTINCT FROM OLD.queue_number
     OR NEW.order_id IS DISTINCT FROM OLD.order_id
     OR NEW.customer_name IS DISTINCT FROM OLD.customer_name
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Identitas dan tenant tiket antrean tidak dapat diubah';
  END IF;

  SELECT coalesce(ss.queue_enabled, true)
    INTO v_queue_enabled
  FROM public.store_settings ss
  WHERE ss.store_id = OLD.store_id;
  IF NOT FOUND THEN
    v_queue_enabled := true;
  END IF;
  IF NOT v_queue_enabled THEN
    RAISE EXCEPTION 'Sistem antrian sedang nonaktif';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT (
      (OLD.status = 'waiting' AND NEW.status IN ('called', 'skipped'))
      OR (OLD.status = 'called' AND NEW.status IN ('serving', 'done', 'skipped'))
      OR (OLD.status = 'serving' AND NEW.status IN ('done', 'skipped'))
    ) THEN
      RAISE EXCEPTION 'Perubahan status antrean tidak valid';
    END IF;
  END IF;

  IF NEW.called_at IS DISTINCT FROM OLD.called_at
     AND NEW.status NOT IN ('called', 'serving') THEN
    RAISE EXCEPTION 'Waktu pemanggilan tidak sesuai status antrean';
  END IF;
  IF NEW.completed_at IS DISTINCT FROM OLD.completed_at
     AND NEW.status NOT IN ('done', 'skipped') THEN
    RAISE EXCEPTION 'Waktu penyelesaian tidak sesuai status antrean';
  END IF;
  IF NEW.status IN ('called', 'serving') AND NEW.called_at IS NULL THEN
    RAISE EXCEPTION 'Waktu pemanggilan wajib diisi';
  END IF;
  IF NEW.status IN ('done', 'skipped') AND NEW.completed_at IS NULL THEN
    RAISE EXCEPTION 'Waktu penyelesaian wajib diisi';
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.guard_queue_ticket_update() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER guard_queue_ticket_update
  BEFORE UPDATE ON public.queue_tickets
  FOR EACH ROW EXECUTE FUNCTION private.guard_queue_ticket_update();

NOTIFY pgrst, 'reload schema';
