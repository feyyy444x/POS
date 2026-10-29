-- Harden direct table writes so clients can only change fields required by the UI.
-- Queue lifecycle changes go through SECURITY DEFINER RPCs that enforce tenant,
-- PIN/session, queue-enabled, and valid-state checks.

-- Queue tickets are created by create_queue_ticket()/complete_sale() and changed
-- by call_queue_ticket()/update_queue_ticket_status(), never by arbitrary row UPDATE.
DROP POLICY IF EXISTS "members update operational queue" ON public.queue_tickets;
REVOKE ALL ON TABLE public.queue_tickets FROM PUBLIC, anon, authenticated;
GRANT SELECT, DELETE ON TABLE public.queue_tickets TO authenticated;

CREATE OR REPLACE FUNCTION public.update_queue_ticket_status(
  p_ticket_id uuid,
  p_status text
) RETURNS public.queue_tickets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_ticket public.queue_tickets;
  v_queue_enabled boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_status IS NULL OR p_status NOT IN ('serving', 'done', 'skipped') THEN
    RAISE EXCEPTION 'Status antrean tidak valid';
  END IF;

  SELECT * INTO v_ticket
  FROM public.queue_tickets
  WHERE id = p_ticket_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tiket antrean tidak ditemukan';
  END IF;

  IF NOT private.is_store_operational(v_ticket.store_id) THEN
    RAISE EXCEPTION 'Tidak memiliki akses operasional ke toko ini';
  END IF;

  SELECT coalesce(ss.queue_enabled, true) INTO v_queue_enabled
  FROM public.store_settings ss
  WHERE ss.store_id = v_ticket.store_id;

  IF NOT FOUND THEN
    v_queue_enabled := true;
  END IF;
  IF NOT v_queue_enabled THEN
    RAISE EXCEPTION 'Sistem antrian sedang nonaktif';
  END IF;

  IF p_status = 'serving' AND v_ticket.status <> 'called' THEN
    RAISE EXCEPTION 'Hanya antrean yang sudah dipanggil yang dapat dilayani';
  ELSIF p_status = 'done' AND v_ticket.status NOT IN ('called', 'serving') THEN
    RAISE EXCEPTION 'Hanya antrean yang dipanggil atau dilayani yang dapat diselesaikan';
  ELSIF p_status = 'skipped' AND v_ticket.status NOT IN ('waiting', 'called', 'serving') THEN
    RAISE EXCEPTION 'Status antrean tidak dapat dilewati dari kondisi ini';
  END IF;

  UPDATE public.queue_tickets
  SET status = p_status,
      called_at = CASE WHEN p_status = 'serving' THEN coalesce(called_at, now()) ELSE called_at END,
      completed_at = CASE WHEN p_status IN ('done', 'skipped') THEN now() ELSE completed_at END
  WHERE id = p_ticket_id
  RETURNING * INTO v_ticket;

  RETURN v_ticket;
END;
$function$;

REVOKE ALL ON FUNCTION public.update_queue_ticket_status(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_queue_ticket_status(uuid, text) TO authenticated;

-- Cashiers can only acknowledge their own alert; they cannot rewrite its tenant,
-- recipient, sender, title, message, or timestamps.
DROP POLICY IF EXISTS "cashier marks own alert read" ON public.cashier_manual_alerts;
CREATE POLICY "cashier marks own alert read"
  ON public.cashier_manual_alerts FOR UPDATE TO authenticated
  USING (cashier_id = (SELECT auth.uid()) AND private.is_store_member(store_id))
  WITH CHECK (cashier_id = (SELECT auth.uid()) AND private.is_store_member(store_id));

REVOKE ALL ON TABLE public.cashier_manual_alerts FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.cashier_manual_alerts TO authenticated;
GRANT INSERT (store_id, cashier_id, sent_by, title, message)
  ON TABLE public.cashier_manual_alerts TO authenticated;
GRANT UPDATE (read_at) ON TABLE public.cashier_manual_alerts TO authenticated;

-- Break records accept only the fields used by the UI. Timestamps and ownership
-- columns are generated/locked by the database, not supplied on direct writes.
DROP POLICY IF EXISTS "cashiers start own breaks on open shifts" ON public.cashier_shift_breaks;
CREATE POLICY "cashiers start own breaks on open shifts"
  ON public.cashier_shift_breaks FOR INSERT TO authenticated
  WITH CHECK (
    cashier_id = (SELECT auth.uid())
    AND private.is_store_member(store_id)
    AND EXISTS (
      SELECT 1 FROM public.cashier_shifts s
      WHERE s.id = cashier_shift_breaks.shift_id
        AND s.store_id = cashier_shift_breaks.store_id
        AND s.cashier_id = (SELECT auth.uid())
        AND s.closed_at IS NULL
    )
    AND ended_at IS NULL
  );

DROP POLICY IF EXISTS "cashiers end own breaks" ON public.cashier_shift_breaks;
CREATE POLICY "cashiers end own breaks"
  ON public.cashier_shift_breaks FOR UPDATE TO authenticated
  USING (
    cashier_id = (SELECT auth.uid())
    AND ended_at IS NULL
    AND private.is_store_member(store_id)
  )
  WITH CHECK (
    cashier_id = (SELECT auth.uid())
    AND ended_at IS NOT NULL
    AND private.is_store_member(store_id)
    AND EXISTS (
      SELECT 1 FROM public.cashier_shifts s
      WHERE s.id = cashier_shift_breaks.shift_id
        AND s.store_id = cashier_shift_breaks.store_id
        AND s.cashier_id = (SELECT auth.uid())
        AND s.closed_at IS NULL
    )
  );

REVOKE ALL ON TABLE public.cashier_shift_breaks FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.cashier_shift_breaks TO authenticated;
GRANT INSERT (store_id, shift_id, cashier_id)
  ON TABLE public.cashier_shift_breaks TO authenticated;
GRANT UPDATE (ended_at) ON TABLE public.cashier_shift_breaks TO authenticated;

NOTIFY pgrst, 'reload schema';
