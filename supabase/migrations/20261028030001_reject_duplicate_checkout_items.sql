-- Prevent a checkout payload from listing the same product more than once.
-- The stock check in complete_sale validates each line separately; duplicate lines
-- could otherwise pass against the same starting stock and oversell in aggregate.
create or replace function public.complete_sale(
  p_store_id uuid,
  p_items jsonb,
  p_discount numeric default 0,
  p_payment_method text default 'cash',
  p_paid_amount numeric default 0,
  p_customer_name text default null,
  p_create_queue boolean default true
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_item jsonb; v_product public.products; v_qty integer;
  v_subtotal numeric(12,2) := 0; v_discount numeric(12,2) := greatest(coalesce(p_discount,0),0);
  v_total numeric(12,2); v_order public.orders; v_ticket public.queue_tickets; v_receipt text;
begin
  if not private.is_store_member(p_store_id) then raise exception 'Not authorized for this store'; end if;
  if not private.is_store_operational(p_store_id) then raise exception 'Toko tidak aktif atau masa aktivasinya telah habis'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'Cart is empty'; end if;
  if p_payment_method not in ('cash','qris','card','transfer','other') then raise exception 'Invalid payment method'; end if;

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
    select * into v_product from public.products where id = (v_item->>'product_id')::uuid and store_id = p_store_id and is_active = true for update;
    if not found then raise exception 'Product not found or inactive'; end if;
    if v_product.stock < v_qty then raise exception 'Insufficient stock for %', v_product.name; end if;
    v_subtotal := v_subtotal + v_product.price * v_qty;
  end loop;
  v_discount := least(v_discount, v_subtotal); v_total := v_subtotal - v_discount;
  if coalesce(p_paid_amount,0) < v_total then raise exception 'Payment amount is less than total'; end if;
  v_receipt := 'NP-' || to_char(timezone('Asia/Jakarta', now()), 'YYYYMMDD-HH24MISS') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,4));
  insert into public.orders(store_id,receipt_number,cashier_id,subtotal,discount,total,payment_method,paid_amount,change_amount)
  values (p_store_id,v_receipt,(select auth.uid()),v_subtotal,v_discount,v_total,p_payment_method,coalesce(p_paid_amount,0),coalesce(p_paid_amount,0)-v_total) returning * into v_order;
  for v_item in select value from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'quantity')::integer;
    select * into v_product from public.products where id = (v_item->>'product_id')::uuid and store_id = p_store_id for update;
    insert into public.order_items(order_id,product_id,product_name,quantity,unit_price,line_total) values (v_order.id,v_product.id,v_product.name,v_qty,v_product.price,v_product.price*v_qty);
    update public.products set stock = stock - v_qty, updated_at = now() where id = v_product.id;
  end loop;
  if coalesce(p_create_queue,true) then v_ticket := public.create_queue_ticket(p_store_id,p_customer_name,v_order.id); end if;
  return jsonb_build_object('order',to_jsonb(v_order),'ticket',case when v_ticket.id is null then null else to_jsonb(v_ticket) end);
end;
$$;
grant execute on function public.complete_sale(uuid,jsonb,numeric,text,numeric,text,boolean) to authenticated;
