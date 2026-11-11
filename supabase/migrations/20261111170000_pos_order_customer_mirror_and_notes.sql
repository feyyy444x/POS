-- POS customer mirror draft and per-line / whole-order notes.
-- This migration is branch-only until separately approved for production.

alter table public.order_items
  add column if not exists note text not null default '';

alter table public.orders
  add column if not exists customer_note text;

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
set search_path to ''
as $function$
declare
  v_item jsonb;
  v_product public.products;
  v_qty integer;
  v_line_note text;
  v_subtotal numeric(12,2) := 0;
  v_discount numeric(12,2) := greatest(coalesce(p_discount,0),0);
  v_total numeric(12,2);
  v_order public.orders;
  v_ticket public.queue_tickets;
  v_receipt text;
begin
  if not private.is_store_operational(p_store_id) then
    raise exception 'Layanan toko sedang nonaktif atau masa sewanya telah berakhir';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'Cart is empty'; end if;
  if p_payment_method not in ('cash','qris','card','transfer','other') then raise exception 'Invalid payment method'; end if;
  if exists (
    select 1 from jsonb_array_elements(p_items) as item(value)
    group by (item.value->>'product_id')::uuid
    having count(*) > 1
  ) then
    raise exception 'Duplicate product items are not allowed; combine quantities into one line';
  end if;

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_qty := greatest(0, (v_item->>'quantity')::integer);
    v_line_note := left(trim(coalesce(v_item->>'note','')),300);
    if v_qty < 1 then raise exception 'Invalid quantity'; end if;
    select * into v_product from public.products
      where id = (v_item->>'product_id')::uuid and store_id = p_store_id and is_active = true
      for update;
    if not found then raise exception 'Product not found or inactive'; end if;
    if v_product.stock < v_qty then raise exception 'Insufficient stock for %', v_product.name; end if;
    v_subtotal := v_subtotal + v_product.price * v_qty;
  end loop;

  v_discount := least(v_discount, v_subtotal);
  v_total := v_subtotal - v_discount;
  if coalesce(p_paid_amount,0) < v_total then raise exception 'Payment amount is less than total'; end if;
  v_receipt := 'NP-' || to_char(timezone('Asia/Jakarta', now()), 'YYYYMMDD-HH24MISS') || '-' ||
    upper(substr(replace(gen_random_uuid()::text,'-',''),1,4));

  insert into public.orders(store_id,receipt_number,cashier_id,subtotal,discount,total,payment_method,paid_amount,change_amount)
  values (p_store_id,v_receipt,(select auth.uid()),v_subtotal,v_discount,v_total,p_payment_method,
    coalesce(p_paid_amount,0),coalesce(p_paid_amount,0)-v_total)
  returning * into v_order;

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'quantity')::integer;
    v_line_note := left(trim(coalesce(v_item->>'note','')),300);
    select * into v_product from public.products
      where id = (v_item->>'product_id')::uuid and store_id = p_store_id
      for update;
    insert into public.order_items(order_id,product_id,product_name,quantity,unit_price,line_total,note)
    values (v_order.id,v_product.id,v_product.name,v_qty,v_product.price,v_product.price*v_qty,v_line_note);
    update public.products set stock = stock - v_qty, updated_at = now() where id = v_product.id;
  end loop;

  if coalesce(p_create_queue,true) then
    v_ticket := public.create_queue_ticket(p_store_id,p_customer_name,v_order.id);
  end if;
  return jsonb_build_object('order',to_jsonb(v_order),'ticket',
    case when v_ticket.id is null then null else to_jsonb(v_ticket) end);
end;
$function$;

create or replace function public.complete_sale_idempotent(
  p_store_id uuid,
  p_items jsonb,
  p_discount numeric default 0,
  p_payment_method text default 'cash',
  p_paid_amount numeric default 0,
  p_customer_name text default null,
  p_create_queue boolean default true,
  p_request_id uuid default null,
  p_customer_note text
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_existing public.orders;
  v_ticket public.queue_tickets;
  v_result jsonb;
  v_order_id uuid;
  v_customer_note text := left(trim(coalesce(p_customer_note,'')),500);
begin
  if not private.is_store_operational(p_store_id) then
    raise exception 'Layanan toko sedang nonaktif atau masa sewanya telah berakhir';
  end if;
  if p_request_id is null then raise exception 'Checkout request ID is required'; end if;
  if length(coalesce(p_customer_note,'')) > 500 then raise exception 'Catatan pesanan maksimal 500 karakter'; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_store_id::text || ':' || p_request_id::text, 0));
  select * into v_existing from public.orders
    where store_id = p_store_id and idempotency_key = p_request_id limit 1;
  if found then
    select * into v_ticket from public.queue_tickets
      where store_id = p_store_id and order_id = v_existing.id
      order by created_at desc limit 1;
    return jsonb_build_object(
      'order', to_jsonb(v_existing),
      'ticket', case when v_ticket.id is null then null else to_jsonb(v_ticket) end
    );
  end if;

  v_result := public.complete_sale(
    p_store_id,p_items,p_discount,p_payment_method,p_paid_amount,p_customer_name,p_create_queue
  );
  v_order_id := nullif(v_result->'order'->>'id', '')::uuid;
  if v_order_id is null then raise exception 'Checkout did not return a valid order ID'; end if;

  update public.orders
    set idempotency_key = p_request_id,
        customer_note = nullif(v_customer_note,'')
    where id = v_order_id and store_id = p_store_id;
  if not found then raise exception 'Could not attach checkout request ID to order'; end if;

  return v_result || jsonb_build_object('order',
    (select to_jsonb(o) from public.orders o where o.id = v_order_id));
end;
$function$;

revoke all on function public.complete_sale_idempotent(uuid,jsonb,numeric,text,numeric,text,boolean,uuid,text) from public, anon;
grant execute on function public.complete_sale_idempotent(uuid,jsonb,numeric,text,numeric,text,boolean,uuid,text) to authenticated;
