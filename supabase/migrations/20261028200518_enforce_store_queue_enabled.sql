-- Enforce the per-store queue switch at the database boundary.
-- The existing PR migration adds this column; IF NOT EXISTS also makes this
-- migration safe to apply directly to the active POS database first.
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS queue_enabled boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.store_settings.queue_enabled IS
  'When false, checkout cannot create queue tickets and receipts omit queue numbers.';

CREATE OR REPLACE FUNCTION public.complete_sale(
  p_store_id uuid,
  p_items jsonb,
  p_discount numeric DEFAULT 0,
  p_payment_method text DEFAULT 'cash',
  p_paid_amount numeric DEFAULT 0,
  p_customer_name text DEFAULT NULL,
  p_create_queue boolean DEFAULT true
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_item jsonb;
  v_product public.products;
  v_qty integer;
  v_subtotal numeric(12,2) := 0;
  v_discount numeric(12,2) := greatest(coalesce(p_discount,0),0);
  v_total numeric(12,2);
  v_order public.orders;
  v_ticket public.queue_tickets;
  v_receipt text;
  v_queue_enabled boolean := true;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF NOT private.is_store_operational(p_store_id) THEN
    RAISE EXCEPTION 'Toko tidak aktif atau masa aktivasinya telah habis';
  END IF;
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items)=0 THEN
    RAISE EXCEPTION 'Cart is empty';
  END IF;
  IF p_payment_method NOT IN ('cash','qris','card','transfer','other') THEN
    RAISE EXCEPTION 'Invalid payment method';
  END IF;

  SELECT coalesce(ss.queue_enabled, true)
    INTO v_queue_enabled
    FROM public.store_settings ss
    WHERE ss.store_id = p_store_id;
  IF NOT FOUND THEN
    v_queue_enabled := true;
  END IF;

  -- Aggregate duplicate product IDs and lock in stable order to prevent overselling.
  FOR v_item IN
    SELECT jsonb_build_object('product_id', x.product_id, 'quantity', x.qty)
    FROM (
      SELECT (e.value->>'product_id')::uuid AS product_id,
             sum((e.value->>'quantity')::integer)::integer AS qty
      FROM jsonb_array_elements(p_items) e(value)
      GROUP BY (e.value->>'product_id')::uuid
      ORDER BY (e.value->>'product_id')::uuid
    ) x
  LOOP
    v_qty := (v_item->>'quantity')::integer;
    IF v_qty < 1 THEN RAISE EXCEPTION 'Invalid quantity'; END IF;
    SELECT * INTO v_product
      FROM public.products
      WHERE id=(v_item->>'product_id')::uuid
        AND store_id=p_store_id AND is_active=true
      FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Product not found or inactive'; END IF;
    IF v_product.stock < v_qty THEN
      RAISE EXCEPTION 'Insufficient stock for %', v_product.name;
    END IF;
    v_subtotal := v_subtotal + v_product.price * v_qty;
  END LOOP;

  v_discount := least(v_discount,v_subtotal);
  v_total := v_subtotal-v_discount;
  IF coalesce(p_paid_amount,0) < v_total THEN
    RAISE EXCEPTION 'Payment amount is less than total';
  END IF;

  v_receipt := 'NP-' ||
    to_char(timezone('Asia/Jakarta',now()),'YYYYMMDD-HH24MISS') || '-' ||
    upper(substr(replace(gen_random_uuid()::text,'-',''),1,4));

  INSERT INTO public.orders(
    store_id,receipt_number,cashier_id,subtotal,discount,total,
    payment_method,paid_amount,change_amount
  )
  VALUES(
    p_store_id,v_receipt,(SELECT auth.uid()),v_subtotal,v_discount,v_total,
    p_payment_method,coalesce(p_paid_amount,0),coalesce(p_paid_amount,0)-v_total
  ) RETURNING * INTO v_order;

  FOR v_item IN
    SELECT jsonb_build_object('product_id', x.product_id, 'quantity', x.qty)
    FROM (
      SELECT (e.value->>'product_id')::uuid AS product_id,
             sum((e.value->>'quantity')::integer)::integer AS qty
      FROM jsonb_array_elements(p_items) e(value)
      GROUP BY (e.value->>'product_id')::uuid
      ORDER BY (e.value->>'product_id')::uuid
    ) x
  LOOP
    v_qty := (v_item->>'quantity')::integer;
    SELECT * INTO v_product
      FROM public.products
      WHERE id=(v_item->>'product_id')::uuid AND store_id=p_store_id
      FOR UPDATE;
    IF NOT FOUND OR v_product.is_active IS NOT TRUE OR v_product.stock < v_qty THEN
      RAISE EXCEPTION 'Product changed or stock is insufficient; retry sale';
    END IF;

    INSERT INTO public.order_items(
      order_id,product_id,product_name,quantity,unit_price,line_total
    )
    VALUES(
      v_order.id,v_product.id,v_product.name,v_qty,v_product.price,v_product.price*v_qty
    );

    UPDATE public.products
      SET stock=stock-v_qty,updated_at=now()
      WHERE id=v_product.id AND store_id=p_store_id AND stock>=v_qty;
    IF NOT FOUND THEN RAISE EXCEPTION 'Stock changed during sale; retry sale'; END IF;
  END LOOP;

  -- The persisted tenant setting is authoritative; clients cannot force a ticket
  -- by passing p_create_queue=true while the feature is switched off.
  IF v_queue_enabled AND coalesce(p_create_queue,true) THEN
    v_ticket := public.create_queue_ticket(p_store_id,p_customer_name,v_order.id);
  END IF;

  RETURN jsonb_build_object(
    'order',to_jsonb(v_order),
    'ticket',CASE WHEN v_ticket.id IS NULL THEN NULL ELSE to_jsonb(v_ticket) END
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.complete_sale(uuid,jsonb,numeric,text,numeric,text,boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_queue_ticket(
  p_store_id uuid,
  p_customer_name text DEFAULT NULL,
  p_order_id uuid DEFAULT NULL
) RETURNS public.queue_tickets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  next_number integer;
  new_ticket public.queue_tickets;
  day_key date;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'Silakan login terlebih dahulu.';
  END IF;

  IF NOT private.is_store_member(p_store_id) THEN
    RAISE EXCEPTION 'Anda tidak memiliki akses ke toko ini.';
  END IF;

  IF NOT private.is_store_operational(p_store_id) THEN
    RAISE EXCEPTION 'Toko tidak aktif atau masa aktivasinya telah habis';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.store_settings ss
    WHERE ss.store_id=p_store_id AND ss.queue_enabled IS FALSE
  ) THEN
    RAISE EXCEPTION 'Sistem antrian sedang nonaktif.';
  END IF;

  IF char_length(coalesce(p_customer_name, '')) > 120 THEN
    RAISE EXCEPTION 'Nama pelanggan maksimal 120 karakter';
  END IF;

  IF p_order_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id=p_order_id AND o.store_id=p_store_id
  ) THEN
    RAISE EXCEPTION 'Order does not belong to this store';
  END IF;

  day_key := (timezone('Asia/Jakarta', now()))::date;
  PERFORM pg_advisory_xact_lock(hashtext(p_store_id::text || ':' || day_key::text));

  SELECT coalesce(max(q.queue_number), 0) + 1
    INTO next_number
    FROM public.queue_tickets q
    WHERE q.store_id=p_store_id AND q.service_date=day_key;

  INSERT INTO public.queue_tickets(store_id, service_date, queue_number, customer_name, order_id)
  VALUES (p_store_id, day_key, next_number, nullif(trim(p_customer_name), ''), p_order_id)
  RETURNING * INTO new_ticket;

  RETURN new_ticket;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.create_queue_ticket(uuid,text,uuid) TO authenticated;
