create extension if not exists pgcrypto;
create schema if not exists private;

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'NexaPos Store',
  created_at timestamptz not null default now()
);
create table public.store_members (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'cashier' check (role in ('owner','admin','manager','cashier')),
  created_at timestamptz not null default now(),
  unique(store_id,user_id)
);
create table public.products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  sku text,
  barcode text,
  category text not null default 'Umum',
  price numeric(12,2) not null default 0 check (price >= 0),
  cost_price numeric(12,2) not null default 0 check (cost_price >= 0),
  stock integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(store_id,sku),
  unique(store_id,barcode)
);
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  receipt_number text not null,
  cashier_id uuid references auth.users(id) on delete set null,
  subtotal numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  tax numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  payment_method text not null default 'cash' check (payment_method in ('cash','qris','card','transfer','other')),
  paid_amount numeric(12,2) not null default 0,
  change_amount numeric(12,2) not null default 0,
  status text not null default 'paid' check (status in ('paid','void','refunded')),
  created_at timestamptz not null default now(),
  unique(store_id,receipt_number)
);
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  line_total numeric(12,2) not null check (line_total >= 0)
);
create table public.queue_tickets (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  service_date date not null default (timezone('Asia/Jakarta', now()))::date,
  queue_number integer not null,
  customer_name text,
  order_id uuid references public.orders(id) on delete set null,
  status text not null default 'waiting' check (status in ('waiting','called','serving','done','skipped')),
  counter_label text not null default 'Kasir 1',
  created_at timestamptz not null default now(),
  called_at timestamptz,
  completed_at timestamptz,
  unique(store_id,service_date,queue_number)
);
create table public.store_settings (
  store_id uuid primary key references public.stores(id) on delete cascade,
  store_name text not null default 'NexaPos Store',
  address text not null default '',
  phone text not null default '',
  receipt_footer text not null default 'Terima kasih telah berbelanja',
  queue_prefix text not null default 'A',
  currency text not null default 'IDR',
  updated_at timestamptz not null default now()
);

create or replace function private.is_store_member(target_store uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.store_members m where m.store_id = target_store and m.user_id = (select auth.uid()))
$$;
create or replace function private.is_store_manager(target_store uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.store_members m where m.store_id = target_store and m.user_id = (select auth.uid()) and m.role in ('owner','admin','manager'))
$$;
create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare new_store_id uuid;
begin
  insert into public.stores(name) values ('NexaPos Store') returning id into new_store_id;
  insert into public.store_members(store_id,user_id,role) values (new_store_id,new.id,'owner');
  insert into public.store_settings(store_id,store_name) values (new_store_id,'NexaPos Store');
  return new;
end;
$$;
drop trigger if exists on_auth_user_created_nexapos on auth.users;
create trigger on_auth_user_created_nexapos after insert on auth.users
for each row execute function private.handle_new_user();

create or replace function public.create_queue_ticket(p_store_id uuid, p_customer_name text default null, p_order_id uuid default null)
returns public.queue_tickets language plpgsql security definer set search_path = '' as $$
declare next_number integer; new_ticket public.queue_tickets; day_key date;
begin
  if not private.is_store_member(p_store_id) then raise exception 'Not authorized for this store'; end if;
  day_key := (timezone('Asia/Jakarta', now()))::date;
  perform pg_advisory_xact_lock(hashtext(p_store_id::text || ':' || day_key::text));
  select coalesce(max(q.queue_number),0)+1 into next_number from public.queue_tickets q
    where q.store_id = p_store_id and q.service_date = day_key;
  insert into public.queue_tickets(store_id,service_date,queue_number,customer_name,order_id)
    values (p_store_id,day_key,next_number,nullif(trim(p_customer_name),''),p_order_id)
    returning * into new_ticket;
  return new_ticket;
end;
$$;

alter table public.stores enable row level security;
alter table public.store_members enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.queue_tickets enable row level security;
alter table public.store_settings enable row level security;

create policy "members can read their stores" on public.stores for select to authenticated using (private.is_store_member(id));
create policy "members can read store membership" on public.store_members for select to authenticated using (private.is_store_member(store_id));
create policy "managers can manage membership" on public.store_members for all to authenticated using (private.is_store_manager(store_id)) with check (private.is_store_manager(store_id));
create policy "members can read products" on public.products for select to authenticated using (private.is_store_member(store_id));
create policy "managers can insert products" on public.products for insert to authenticated with check (private.is_store_manager(store_id));
create policy "managers can update products" on public.products for update to authenticated using (private.is_store_manager(store_id)) with check (private.is_store_manager(store_id));
create policy "managers can delete products" on public.products for delete to authenticated using (private.is_store_manager(store_id));
create policy "members can read orders" on public.orders for select to authenticated using (private.is_store_member(store_id));
create policy "members can create orders" on public.orders for insert to authenticated with check (private.is_store_member(store_id));
create policy "managers can update orders" on public.orders for update to authenticated using (private.is_store_manager(store_id)) with check (private.is_store_manager(store_id));
create policy "members can read order items" on public.order_items for select to authenticated using (exists (select 1 from public.orders o where o.id = order_id and private.is_store_member(o.store_id)));
create policy "members can add order items" on public.order_items for insert to authenticated with check (exists (select 1 from public.orders o where o.id = order_id and private.is_store_member(o.store_id)));
create policy "members can read queue" on public.queue_tickets for select to authenticated using (private.is_store_member(store_id));
create policy "members can update queue" on public.queue_tickets for update to authenticated using (private.is_store_member(store_id)) with check (private.is_store_member(store_id));
create policy "members can delete queue" on public.queue_tickets for delete to authenticated using (private.is_store_manager(store_id));
create policy "members can read settings" on public.store_settings for select to authenticated using (private.is_store_member(store_id));
create policy "managers can update settings" on public.store_settings for update to authenticated using (private.is_store_manager(store_id)) with check (private.is_store_manager(store_id));

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.stores, public.store_members, public.products, public.orders, public.order_items, public.queue_tickets, public.store_settings to authenticated;
grant execute on function public.create_queue_ticket(uuid,text,uuid) to authenticated;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'queue_tickets') then
    alter publication supabase_realtime add table public.queue_tickets;
  end if;
end $$;
