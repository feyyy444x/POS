-- Disposable PostgreSQL fixture for the isolated cashier-shift checkout migration.
-- Runs only in GitHub Actions' ephemeral PostgreSQL service; never points at production.
create extension if not exists pgcrypto;
create schema if not exists auth;
create schema if not exists private;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
end $$;

create or replace function auth.uid()
returns uuid language sql stable
as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

create table public.products (
  id uuid primary key,
  store_id uuid not null,
  name text not null,
  price numeric not null,
  stock integer not null,
  is_active boolean not null default true,
  updated_at timestamptz
);
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null,
  receipt_number text not null,
  cashier_id uuid,
  subtotal numeric,
  discount numeric,
  total numeric,
  payment_method text,
  paid_amount numeric,
  change_amount numeric
);
create table public.order_items (
  id bigint generated always as identity primary key,
  order_id uuid not null,
  product_id uuid not null,
  product_name text not null,
  quantity integer not null,
  unit_price numeric not null,
  line_total numeric not null
);
create table public.queue_tickets (id uuid);
create table public.cashier_shifts (
  id uuid primary key,
  store_id uuid not null,
  cashier_id uuid not null,
  closed_at timestamptz
);
create table public.cashier_shift_breaks (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null,
  store_id uuid not null,
  cashier_id uuid not null,
  ended_at timestamptz
);

create or replace function private.is_store_operational(p_store_id uuid)
returns boolean language sql stable
as $$ select p_store_id is not null $$;

create or replace function public.create_queue_ticket(uuid,text,uuid)
returns public.queue_tickets language sql
as $ select row(null::uuid)::public.queue_tickets $;

-- Minimal idempotent wrapper so the migration's grants and delegated checkout
-- can be exercised without requiring the full application schema.
create or replace function public.complete_sale_idempotent(
  p_store_id uuid,
  p_items jsonb,
  p_discount numeric default 0,
  p_payment_method text default 'cash',
  p_paid_amount numeric default 0,
  p_customer_name text default null,
  p_create_queue boolean default true,
  p_request_id uuid default gen_random_uuid()
) returns jsonb language plpgsql security definer set search_path = ''
as $$
begin
  return public.complete_sale(p_store_id,p_items,p_discount,p_payment_method,p_paid_amount,p_customer_name,p_create_queue);
end;
$$;

\i supabase/migrations/20261111130000_enforce_cashier_shift_on_checkout.sql

grant usage on schema public, auth, private to authenticated;
grant execute on function auth.uid() to authenticated;
grant execute on function public.complete_sale_idempotent(uuid,jsonb,numeric,text,numeric,text,boolean,uuid) to authenticated;

insert into public.products(id,store_id,name,price,stock,is_active)
values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','Produk Uji',10000,10,true);

set role authenticated;
do $$
declare
  v_user_a uuid := 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
  v_user_b uuid := 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb';
  v_store_a uuid := '11111111-1111-4111-8111-111111111111';
  v_store_b uuid := '22222222-2222-4222-8222-222222222222';
  v_product uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  v_request uuid;
  v_stock integer;
  v_order jsonb;
begin
  if has_function_privilege('authenticated','public.complete_sale(uuid,jsonb,numeric,text,numeric,text,boolean)','EXECUTE') then
    raise exception 'authenticated must not execute legacy complete_sale';
  end if;
  if not has_function_privilege('authenticated','public.complete_sale_idempotent(uuid,jsonb,numeric,text,numeric,text,boolean,uuid)','EXECUTE') then
    raise exception 'authenticated must execute idempotent checkout';
  end if;

  -- No open shift.
  perform set_config('request.jwt.claim.sub',v_user_a::text,true);
  begin
    perform public.complete_sale_idempotent(v_store_a,jsonb_build_array(jsonb_build_object('product_id',v_product,'quantity',1)),0,'cash',10000,null,false,gen_random_uuid());
    raise exception 'TEST_EXPECTED_REJECTION_NOT_RAISED';
  exception when others then
    if sqlerrm = 'TEST_EXPECTED_REJECTION_NOT_RAISED' then raise; end if;
    if sqlerrm not like '%Buka shift kasir pribadi%' then raise; end if;
  end;

  -- Another employee's shift must not authorize this cashier.
  insert into public.cashier_shifts(id,store_id,cashier_id)
  values('33333333-3333-4333-8333-333333333333',v_store_a,v_user_b);
  begin
    perform public.complete_sale_idempotent(v_store_a,jsonb_build_array(jsonb_build_object('product_id',v_product,'quantity',1)),0,'cash',10000,null,false,gen_random_uuid());
    raise exception 'TEST_EXPECTED_REJECTION_NOT_RAISED';
  exception when others then
    if sqlerrm = 'TEST_EXPECTED_REJECTION_NOT_RAISED' then raise; end if;
    if sqlerrm not like '%Buka shift kasir pribadi%' then raise; end if;
  end;

  -- A shift opened in a different tenant must not authorize this store.
  insert into public.cashier_shifts(id,store_id,cashier_id)
  values('44444444-4444-4444-8444-444444444444',v_store_b,v_user_a);
  begin
    perform public.complete_sale_idempotent(v_store_a,jsonb_build_array(jsonb_build_object('product_id',v_product,'quantity',1)),0,'cash',10000,null,false,gen_random_uuid());
    raise exception 'TEST_EXPECTED_REJECTION_NOT_RAISED';
  exception when others then
    if sqlerrm = 'TEST_EXPECTED_REJECTION_NOT_RAISED' then raise; end if;
    if sqlerrm not like '%Buka shift kasir pribadi%' then raise; end if;
  end;

  -- Closed shift must not authorize checkout.
  insert into public.cashier_shifts(id,store_id,cashier_id,closed_at)
  values('55555555-5555-4555-8555-555555555555',v_store_a,v_user_a,now());
  begin
    perform public.complete_sale_idempotent(v_store_a,jsonb_build_array(jsonb_build_object('product_id',v_product,'quantity',1)),0,'cash',10000,null,false,gen_random_uuid());
    raise exception 'TEST_EXPECTED_REJECTION_NOT_RAISED';
  exception when others then
    if sqlerrm = 'TEST_EXPECTED_REJECTION_NOT_RAISED' then raise; end if;
    if sqlerrm not like '%Buka shift kasir pribadi%' then raise; end if;
  end;

  -- An active break blocks sales even though the shift remains open.
  insert into public.cashier_shifts(id,store_id,cashier_id)
  values('66666666-6666-4666-8666-666666666666',v_store_a,v_user_a);
  insert into public.cashier_shift_breaks(shift_id,store_id,cashier_id,ended_at)
  values('66666666-6666-4666-8666-666666666666',v_store_a,v_user_a,null);
  begin
    perform public.complete_sale_idempotent(v_store_a,jsonb_build_array(jsonb_build_object('product_id',v_product,'quantity',1)),0,'cash',10000,null,false,gen_random_uuid());
    raise exception 'TEST_EXPECTED_REJECTION_NOT_RAISED';
  exception when others then
    if sqlerrm = 'TEST_EXPECTED_REJECTION_NOT_RAISED' then raise; end if;
    if sqlerrm not like '%Transaksi tidak dapat diproses saat istirahat%' then raise; end if;
  end;

  -- Close the test break shift so the success case has exactly one open shift.
  update public.cashier_shifts set closed_at=now()
  where id='66666666-6666-4666-8666-666666666666';

  -- A valid open shift with no active break succeeds and decrements stock once.
  insert into public.cashier_shifts(id,store_id,cashier_id)
  values('77777777-7777-4777-8777-777777777777',v_store_a,v_user_a);
  v_request := gen_random_uuid();
  v_order := public.complete_sale_idempotent(v_store_a,jsonb_build_array(jsonb_build_object('product_id',v_product,'quantity',2)),0,'cash',20000,null,false,v_request);
  if v_order->'order'->>'id' is null then raise exception 'valid checkout did not return an order'; end if;
  select stock into v_stock from public.products where id=v_product;
  if v_stock <> 8 then raise exception 'valid checkout did not decrement stock exactly once'; end if;
end;
$$;
reset role;

select 'offline checkout shift runtime fixture passed' as result;
