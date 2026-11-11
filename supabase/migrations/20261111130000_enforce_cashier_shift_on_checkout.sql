-- Enforce cashier shift ownership and break state at the authoritative checkout boundary.
-- This migration is isolated to PR #27; do not apply to production until reviewed and tested.

create or replace function public.complete_sale(
  p_store_id uuid,
  p_items jsonb,
  p_discount numeric default 0,
  p_payment_method text default 'cash',
  p_paid_amount numeric default 0,
  p_customer_name text default null,
  p_create_queue boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_item jsonb;
  v_product public.products;
  v_qty integer;
  v_subtotal numeric(12,2) := 0;
  v_discount numeric(12,2) := greatest(coalesce(p_discount,0),0);
  v_total numeric(12,2);
  v_order public.orders;
  v_ticket public.queue_tickets;
  v_receipt text;
  v_shift_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if not private.is_store_operational(p_store_id) then
    raise exception 'Layanan toko sedang nonaktif atau masa sewanya telah berakhir';
  end if;

  -- Lock the authenticated cashier's own open shift. This makes checkout
  -- mutually exclusive with shift closure and protects against a stale UI.
  select s.id into v_shift_id
  from public.cashier_shifts s
  where s.store_id = p_store_id
    and s.cashier_id = (select auth.uid())
    and s.closed_at is null
  for update;

  if v_shift_id is null then
    raise exception 'Buka shift kasir pribadi terlebih dahulu sebelum memproses transaksi';
  end if;

  -- The cashier must explicitly end an active break before accepting a sale.
  if exists (
    select 1
    from public.cashier_shift_breaks b
    where b.shift_id = v_shift_id
      and b.store_id = p_store_id
      and b.cashier_id = (select auth.uid())
      and b.ended_at is null
  ) then
    raise exception 'Transaksi tidak dapat diproses saat istirahat. Tekan Kembali Bekerja terlebih dahulu';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Cart is empty';
  end if;
  if p_payment_method not in ('cash','qris','card','transfer','other') then
    raise exception 'Invalid payment method';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_items) as item(value)
    group by (item.value->>'product_id')::uuid
    having count(*) > 1
  ) then
    raise exception 'Duplicate product items are not allowed; combine quantities into one line';
  end if;

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_qty := greatest(0, (v_item->>'quantity')::integer);
    if v_qty < 1 then raise exception 'Invalid quantity'; end if;
    select * into v_product
    from public.products
    where id = (v_item->>'product_id')::uuid
      and store_id = p_store_id
      and is_active = true
    for update;
    if not found then raise exception 'Product not found or inactive'; end if;
    if v_product.stock < v_qty then
      raise exception 'Insufficient stock for %', v_product.name;
    end if;
    v_subtotal := v_subtotal + v_product.price * v_qty;
  end loop;

  v_discount := least(v_discount, v_subtotal);
  v_total := v_subtotal - v_discount;
  if coalesce(p_paid_amount,0) < v_total then
    raise exception 'Payment amount is less than total';
  end if;

  v_receipt := 'NP-' ||
    to_char(timezone('Asia/Jakarta', now()), 'YYYYMMDD-HH24MISS') || '-' ||
    upper(substr(replace(gen_random_uuid()::text,'-',''),1,4));

  insert into public.orders(
    store_id,receipt_number,cashier_id,subtotal,discount,total,
    payment_method,paid_amount,change_amount
  )
  values (
    p_store_id,v_receipt,(select auth.uid()),v_subtotal,v_discount,v_total,
    p_payment_method,coalesce(p_paid_amount,0),coalesce(p_paid_amount,0)-v_total
  )
  returning * into v_order;

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'quantity')::integer;
    select * into v_product
    from public.products
    where id = (v_item->>'product_id')::uuid
      and store_id = p_store_id
    for update;

    if not found or v_product.is_active is not true or v_product.stock < v_qty then
      raise exception 'Product changed or stock is insufficient; retry sale';
    end if;

    insert into public.order_items(
      order_id,product_id,product_name,quantity,unit_price,line_total
    )
    values (
      v_order.id,v_product.id,v_product.name,v_qty,v_product.price,v_product.price*v_qty
    );

    update public.products
    set stock = stock - v_qty, updated_at = now()
    where id = v_product.id
      and store_id = p_store_id
      and stock >= v_qty;
    if not found then
      raise exception 'Stock changed during sale; retry sale';
    end if;
  end loop;

  if coalesce(p_create_queue,true) then
    v_ticket := public.create_queue_ticket(p_store_id,p_customer_name,v_order.id);
  end if;

  return jsonb_build_object(
    'order',to_jsonb(v_order),
    'ticket',case when v_ticket.id is null then null else to_jsonb(v_ticket) end
  );
end;
$function$;

-- The public client must use the idempotent wrapper only. The wrapper invokes
-- this function internally as its owner; authenticated clients do not need
-- direct EXECUTE on the legacy non-idempotent entry point.
revoke all on function public.complete_sale(uuid,jsonb,numeric,text,numeric,text,boolean)
  from public, anon, authenticated;

revoke all on function public.complete_sale_idempotent(uuid,jsonb,numeric,text,numeric,text,boolean,uuid)
  from public, anon;
grant execute on function public.complete_sale_idempotent(uuid,jsonb,numeric,text,numeric,text,boolean,uuid)
  to authenticated;

notify pgrst, 'reload schema';
