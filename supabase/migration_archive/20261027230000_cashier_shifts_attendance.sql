-- Cashier shift ledger and attendance reports.
-- This migration is additive and is reviewed on a branch; do not apply directly to production.
create table if not exists public.cashier_shifts (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  cashier_id uuid not null references auth.users(id) on delete restrict,
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  opening_cash numeric(12,2) not null default 0 check (opening_cash >= 0),
  counted_cash numeric(12,2) check (counted_cash >= 0),
  counted_qris numeric(12,2) check (counted_qris >= 0),
  expected_cash numeric(12,2) check (expected_cash >= 0),
  expected_qris numeric(12,2) check (expected_qris >= 0),
  cash_difference numeric(12,2),
  qris_difference numeric(12,2),
  notes text,
  created_at timestamptz not null default now(),
  constraint cashier_shifts_close_after_open check (closed_at is null or closed_at >= opened_at),
  constraint cashier_shifts_closed_values check (
    closed_at is null or (
      counted_cash is not null and counted_qris is not null
      and expected_cash is not null and expected_qris is not null
      and cash_difference is not null and qris_difference is not null
    )
  )
);

create unique index if not exists cashier_shifts_one_open_per_cashier
  on public.cashier_shifts(store_id, cashier_id) where closed_at is null;
create index if not exists cashier_shifts_store_opened_idx
  on public.cashier_shifts(store_id, opened_at desc);
create index if not exists cashier_shifts_cashier_opened_idx
  on public.cashier_shifts(cashier_id, opened_at desc);

alter table public.cashier_shifts enable row level security;
revoke all on public.cashier_shifts from public, anon, authenticated;

drop policy if exists "cashiers can view own shifts" on public.cashier_shifts;
create policy "cashiers can view own shifts"
  on public.cashier_shifts for select to authenticated
  using (cashier_id = (select auth.uid()) or private.is_store_manager(store_id));

drop policy if exists "cashiers can open own shift" on public.cashier_shifts;
create policy "cashiers can open own shift"
  on public.cashier_shifts for insert to authenticated
  with check (
    cashier_id = (select auth.uid())
    and private.is_store_member(store_id)
    and closed_at is null
    and counted_cash is null
    and counted_qris is null
  );

grant select, insert on public.cashier_shifts to authenticated;

create or replace function public.close_cashier_shift(
  p_shift_id uuid,
  p_counted_cash numeric,
  p_counted_qris numeric,
  p_notes text default null
) returns public.cashier_shifts
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_shift public.cashier_shifts;
  v_expected_cash numeric(12,2);
  v_expected_qris numeric(12,2);
  v_closed_at timestamptz := now();
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;
  if coalesce(p_counted_cash, -1) < 0 or coalesce(p_counted_qris, -1) < 0 then
    raise exception 'Cash and QRIS counts must be zero or greater';
  end if;

  select * into v_shift
  from public.cashier_shifts
  where id = p_shift_id
  for update;

  if not found then raise exception 'Shift not found'; end if;
  if v_shift.closed_at is not null then raise exception 'Shift is already closed'; end if;
  if v_shift.cashier_id <> (select auth.uid())
     and not private.is_store_manager(v_shift.store_id) then
    raise exception 'Not authorized to close this shift';
  end if;
  if not private.is_store_member(v_shift.store_id) then
    raise exception 'Not authorized for this store';
  end if;

  select
    coalesce(v_shift.opening_cash, 0) + coalesce(sum(o.total) filter (where o.payment_method = 'cash'), 0),
    coalesce(sum(o.total) filter (where o.payment_method = 'qris'), 0)
  into v_expected_cash, v_expected_qris
  from public.orders o
  where o.store_id = v_shift.store_id
    and o.cashier_id = v_shift.cashier_id
    and o.status = 'paid'
    and o.created_at >= v_shift.opened_at
    and o.created_at <= v_closed_at;

  update public.cashier_shifts
  set closed_at = v_closed_at,
      counted_cash = p_counted_cash,
      counted_qris = p_counted_qris,
      expected_cash = v_expected_cash,
      expected_qris = v_expected_qris,
      cash_difference = p_counted_cash - v_expected_cash,
      qris_difference = p_counted_qris - v_expected_qris,
      notes = nullif(trim(coalesce(p_notes, '')), '')
  where id = p_shift_id
  returning * into v_shift;

  return v_shift;
end;
$function$;

revoke all on function public.close_cashier_shift(uuid,numeric,numeric,text) from public, anon;
grant execute on function public.close_cashier_shift(uuid,numeric,numeric,text) to authenticated;

-- Enforce an open shift in the database, not only in the browser UI.
create or replace function public.complete_sale(
  p_store_id uuid,
  p_items jsonb,
  p_discount numeric default 0,
  p_payment_method text default 'cash',
  p_paid_amount numeric default 0,
  p_customer_name text default null,
  p_create_queue boolean default true
) returns jsonb
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
begin
  if not private.is_store_member(p_store_id) then
    raise exception 'Not authorized for this store';
  end if;
  if not exists (
    select 1 from public.cashier_shifts s
    where s.store_id = p_store_id
      and s.cashier_id = (select auth.uid())
      and s.closed_at is null
  ) then
    raise exception 'Open cashier shift before checkout';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Cart is empty';
  end if;
  if p_payment_method not in ('cash','qris','card','transfer','other') then
    raise exception 'Invalid payment method';
  end if;

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_qty := greatest(0, (v_item->>'quantity')::integer);
    if v_qty < 1 then raise exception 'Invalid quantity'; end if;
    select * into v_product
    from public.products
    where id = (v_item->>'product_id')::uuid
      and store_id = p_store_id and is_active = true
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
    select * into v_product from public.products
    where id = (v_item->>'product_id')::uuid and store_id = p_store_id
    for update;
    insert into public.order_items(order_id,product_id,product_name,quantity,unit_price,line_total)
    values (v_order.id,v_product.id,v_product.name,v_qty,v_product.price,v_product.price*v_qty);
    update public.products set stock = stock - v_qty, updated_at = now() where id = v_product.id;
  end loop;

  if coalesce(p_create_queue,true) then
    v_ticket := public.create_queue_ticket(p_store_id,p_customer_name,v_order.id);
  end if;
  return jsonb_build_object('order',to_jsonb(v_order),'ticket',case when v_ticket.id is null then null else to_jsonb(v_ticket) end);
end;
$function$;

revoke all on function public.complete_sale(uuid,jsonb,numeric,text,numeric,text,boolean) from public, anon;
grant execute on function public.complete_sale(uuid,jsonb,numeric,text,numeric,text,boolean) to authenticated;

do $function$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public' and tablename = 'cashier_shifts'
     ) then
    alter publication supabase_realtime add table public.cashier_shifts;
  end if;
end;
$function$;
