-- Prevent clients from rewriting queue timestamps after a state transition.
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
     AND NOT (
       NEW.status IS DISTINCT FROM OLD.status
       AND NEW.status IN ('called', 'serving')
     ) THEN
    RAISE EXCEPTION 'Waktu pemanggilan hanya dapat berubah saat status antrean berubah';
  END IF;
  IF NEW.completed_at IS DISTINCT FROM OLD.completed_at
     AND NOT (
       NEW.status IS DISTINCT FROM OLD.status
       AND NEW.status IN ('done', 'skipped')
     ) THEN
    RAISE EXCEPTION 'Waktu penyelesaian hanya dapat berubah saat antrean selesai atau dilewati';
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
