-- Prevent duplicate sales when a client retries after a timeout/reconnect.
alter table public.orders
  add column if not exists idempotency_key uuid;

create unique index if not exists orders_store_idempotency_key_uidx
  on public.orders (store_id, idempotency_key)
  where idempotency_key is not null;

create or replace function public.complete_sale_idempotent(
  p_store_id uuid,
  p_items jsonb,
  p_discount numeric default 0,
  p_payment_method text default 'cash',
  p_paid_amount numeric default 0,
  p_customer_name text default null,
  p_create_queue boolean default true,
  p_request_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_existing public.orders;
  v_ticket public.queue_tickets;
  v_result jsonb;
  v_order_id uuid;
begin
  if p_request_id is null then
    raise exception 'Checkout request ID is required';
  end if;
  if not private.is_store_member(p_store_id) then
    raise exception 'Not authorized for this store';
  end if;

  -- Serialize retries with the same store/request ID, including requests that arrive concurrently.
  perform pg_advisory_xact_lock(hashtextextended(p_store_id::text || ':' || p_request_id::text, 0));

  select * into v_existing
  from public.orders
  where store_id = p_store_id and idempotency_key = p_request_id
  limit 1;

  if found then
    select * into v_ticket
    from public.queue_tickets
    where store_id = p_store_id and order_id = v_existing.id
    order by created_at desc
    limit 1;

    return jsonb_build_object(
      'order', to_jsonb(v_existing),
      'ticket', case when v_ticket.id is null then null else to_jsonb(v_ticket) end
    );
  end if;

  v_result := public.complete_sale(
    p_store_id,
    p_items,
    p_discount,
    p_payment_method,
    p_paid_amount,
    p_customer_name,
    p_create_queue
  );

  v_order_id := nullif(v_result->'order'->>'id', '')::uuid;
  if v_order_id is null then
    raise exception 'Checkout did not return a valid order ID';
  end if;

  update public.orders
  set idempotency_key = p_request_id
  where id = v_order_id and store_id = p_store_id;

  if not found then
    raise exception 'Could not attach checkout request ID to order';
  end if;

  return v_result;
end;
$function$;

revoke all on function public.complete_sale_idempotent(uuid, jsonb, numeric, text, numeric, text, boolean, uuid) from public, anon;
grant execute on function public.complete_sale_idempotent(uuid, jsonb, numeric, text, numeric, text, boolean, uuid) to authenticated;

-- Route clients through the idempotent wrapper; only the wrapper may call the underlying sale function.
revoke all on function public.complete_sale(uuid, jsonb, numeric, text, numeric, text, boolean) from public, anon, authenticated;
