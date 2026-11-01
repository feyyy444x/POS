-- Self Order: customer ordering, payment proof, stock reservation, POS settlement.
alter table public.store_settings
  add column if not exists self_order_enabled boolean not null default false,
  add column if not exists self_order_qris_image_url text,
  add column if not exists self_order_payment_instructions text not null default 'Scan QRIS, lakukan pembayaran, lalu unggah bukti pembayaran.';

alter table public.orders
  add column if not exists source text not null default 'pos',
  add column if not exists self_service_order_id uuid;

create table if not exists public.self_service_orders (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  order_number text not null unique default ('SO-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
  customer_name text not null,
  customer_phone text,
  customer_notes text,
  subtotal numeric(14,2) not null default 0 check (subtotal >= 0),
  total numeric(14,2) not null default 0 check (total >= 0),
  payment_status text not null default 'awaiting_payment'
    check (payment_status in ('awaiting_payment','pending_verification','paid','rejected')),
  order_status text not null default 'awaiting_payment'
    check (order_status in ('awaiting_payment','pending_verification','confirmed','preparing','ready','completed','rejected','cancelled')),
  payment_proof_path text,
  pos_order_id uuid references public.orders(id) on delete set null,
  queue_ticket_id uuid references public.queue_tickets(id) on delete set null,
  payment_deadline timestamptz not null default (now()+interval '30 minutes'),
  verified_by uuid references auth.users(id) on delete set null,
  verified_at timestamptz,
  rejection_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists orders_self_service_order_unique_idx on public.orders(self_service_order_id) where self_service_order_id is not null;
create index if not exists self_service_orders_store_created_idx
  on public.self_service_orders(store_id, created_at desc);
create index if not exists self_service_orders_store_status_idx
  on public.self_service_orders(store_id, payment_status, order_status);

create table if not exists public.self_service_order_items (
  id uuid primary key default gen_random_uuid(),
  self_service_order_id uuid not null references public.self_service_orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(14,2) not null check (unit_price >= 0),
  line_total numeric(14,2) not null check (line_total >= 0),
  created_at timestamptz not null default now()
);
create index if not exists self_service_order_items_order_idx
  on public.self_service_order_items(self_service_order_id);

alter table public.self_service_orders enable row level security;
alter table public.self_service_order_items enable row level security;
drop policy if exists "tenant members read self service orders" on public.self_service_orders;
create policy "tenant members read self service orders"
  on public.self_service_orders for select to authenticated
  using (private.is_store_member(store_id));
drop policy if exists "tenant members read self service order items" on public.self_service_order_items;
create policy "tenant members read self service order items"
  on public.self_service_order_items for select to authenticated
  using (exists (
    select 1 from public.self_service_orders o
    where o.id = self_service_order_items.self_service_order_id
      and private.is_store_member(o.store_id)
  ));
revoke all on public.self_service_orders from anon, authenticated;
revoke all on public.self_service_order_items from anon, authenticated;
grant select on public.self_service_orders, public.self_service_order_items to authenticated;

create or replace function public.get_public_self_order_catalog(p_store_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_store public.stores; v_settings public.store_settings;
begin
  select * into v_store from public.stores where id=p_store_id and status='active'
    and deleted_at is null and (expires_at is null or expires_at>now()) for update;
  if not found or not private.is_store_operational(p_store_id) then raise exception 'Toko tidak tersedia'; end if;
  select * into v_settings from public.store_settings where store_id=p_store_id;
  if not found or v_settings.self_order_enabled is not true then raise exception 'Self Order sedang tidak aktif'; end if;
  update public.products p set stock=p.stock+i.quantity,updated_at=now()
  from public.self_service_order_items i join public.self_service_orders o on o.id=i.self_service_order_id
  where o.store_id=p_store_id and o.payment_status='awaiting_payment'
    and o.payment_deadline<=now() and p.id=i.product_id;
  update public.self_service_orders set payment_status='rejected',order_status='cancelled',
    rejection_note='Waktu pembayaran habis',updated_at=now()
  where store_id=p_store_id and payment_status='awaiting_payment' and payment_deadline<=now();
  return jsonb_build_object(
    'store_id',v_store.id,
    'store_name',v_settings.store_name,
    'address',v_settings.address,
    'phone',v_settings.phone,
    'currency',v_settings.currency,
    'qris_image_url',v_settings.self_order_qris_image_url,
    'payment_instructions',v_settings.self_order_payment_instructions,
    'products',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',p.id,'name',p.name,'category',p.category,'price',p.price
      ) order by p.category,p.name)
      from public.products p where p.store_id=p_store_id and p.is_active=true and p.stock>0
    ),'[]'::jsonb)
  );
end;
$$;
revoke all on function public.get_public_self_order_catalog(uuid) from public;
grant execute on function public.get_public_self_order_catalog(uuid) to anon, authenticated;

create or replace function public.create_self_service_order(
  p_store_id uuid, p_customer_name text, p_customer_phone text, p_customer_notes text, p_items jsonb
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_store public.stores;
  v_settings public.store_settings;
  v_order public.self_service_orders;
  v_item record;
  v_product public.products;
  v_subtotal numeric(14,2):=0;
  v_count integer:=0;
  v_expired record;
  v_recent_count integer;
begin
  if coalesce(length(trim(p_customer_name)),0)<2 or length(trim(p_customer_name))>100 then
    raise exception 'Nama pelanggan wajib diisi (2–100 karakter)';
  end if;
  if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 or jsonb_array_length(p_items)>50 then
    raise exception 'Keranjang pesanan tidak valid';
  end if;
  if length(coalesce(p_customer_phone,''))>30 or length(coalesce(p_customer_notes,''))>500 then
    raise exception 'Nomor telepon atau catatan pesanan terlalu panjang';
  end if;
  select * into v_store from public.stores where id=p_store_id and status='active'
    and deleted_at is null and (expires_at is null or expires_at>now()) for update;
  if not found or not private.is_store_operational(p_store_id) then raise exception 'Toko sedang tidak aktif'; end if;
  select * into v_settings from public.store_settings where store_id=p_store_id;
  if not found or v_settings.self_order_enabled is not true then raise exception 'Self Order sedang tidak aktif'; end if;
  select count(*) into v_recent_count from public.self_service_orders
    where store_id=p_store_id and created_at>now()-interval '1 minute';
  if v_recent_count>=30 then raise exception 'Toko sedang menerima banyak pesanan. Coba lagi sebentar.'; end if;

  -- Release stock from abandoned unpaid orders before reserving new stock.
  for v_expired in
    select id from public.self_service_orders
    where store_id=p_store_id and payment_status='awaiting_payment'
      and payment_deadline<=now() for update
  loop
    update public.products p set stock=p.stock+i.quantity,updated_at=now()
    from public.self_service_order_items i
    where i.self_service_order_id=v_expired.id and p.id=i.product_id;
    update public.self_service_orders set payment_status='rejected',order_status='cancelled',
      rejection_note='Waktu pembayaran habis',updated_at=now() where id=v_expired.id;
  end loop;

  insert into public.self_service_orders(store_id,customer_name,customer_phone,customer_notes)
  values(p_store_id,trim(p_customer_name),nullif(trim(coalesce(p_customer_phone,'')),''),nullif(trim(coalesce(p_customer_notes,'')),''))
  returning * into v_order;

  for v_item in
    select x.product_id, sum(x.quantity)::integer as quantity
    from jsonb_to_recordset(p_items) as x(product_id uuid, quantity integer)
    group by x.product_id
    order by x.product_id
  loop
    if v_item.product_id is null or v_item.quantity is null or v_item.quantity<1 or v_item.quantity>50 then
      raise exception 'Jumlah produk tidak valid';
    end if;
    select * into v_product from public.products
      where id=v_item.product_id and store_id=p_store_id and is_active=true for update;
    if not found then raise exception 'Produk tidak tersedia'; end if;
    if v_product.stock<v_item.quantity then raise exception 'Stok % tidak mencukupi',v_product.name; end if;
    update public.products set stock=stock-v_item.quantity,updated_at=now() where id=v_product.id;
    insert into public.self_service_order_items(self_service_order_id,product_id,product_name,quantity,unit_price,line_total)
    values(v_order.id,v_product.id,v_product.name,v_item.quantity,v_product.price,v_product.price*v_item.quantity);
    v_subtotal:=v_subtotal+(v_product.price*v_item.quantity);
    v_count:=v_count+1;
  end loop;
  if v_count=0 then raise exception 'Keranjang pesanan kosong'; end if;
  update public.self_service_orders set subtotal=v_subtotal,total=v_subtotal,updated_at=now()
    where id=v_order.id returning * into v_order;
  return jsonb_build_object('id',v_order.id,'order_number',v_order.order_number,'total',v_order.total,
    'payment_instructions',v_settings.self_order_payment_instructions,'qris_image_url',v_settings.self_order_qris_image_url);
end;
$$;
revoke all on function public.create_self_service_order(uuid,text,text,text,jsonb) from public;
grant execute on function public.create_self_service_order(uuid,text,text,text,jsonb) to anon, authenticated;

create or replace function private.can_upload_self_service_proof(p_store_id uuid,p_order_id uuid)
returns boolean language sql stable security definer set search_path=''
as $$
  select exists(select 1 from public.self_service_orders o
    where o.id=p_order_id and o.store_id=p_store_id
      and o.payment_status='awaiting_payment' and o.payment_deadline>now()
      and not exists(select 1 from storage.objects so where so.bucket_id='self-order-proofs'
        and so.name like p_store_id::text||'/'||p_order_id::text||'/%'))
$$;
revoke all on function private.can_upload_self_service_proof(uuid,uuid) from public;
grant usage on schema private to anon, authenticated;
grant execute on function private.can_upload_self_service_proof(uuid,uuid) to anon, authenticated;

create or replace function public.attach_self_service_payment_proof(p_store_id uuid,p_order_id uuid,p_path text)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_order public.self_service_orders;
begin
  if p_path !~ ('^'||p_store_id::text||'/'||p_order_id::text||'/[A-Za-z0-9._-]{1,120}$') then
    raise exception 'Lokasi bukti pembayaran tidak valid';
  end if;
  if not exists(select 1 from storage.objects where bucket_id='self-order-proofs' and name=p_path) then
    raise exception 'Bukti pembayaran belum berhasil diunggah';
  end if;
  update public.self_service_orders set payment_proof_path=p_path,
    payment_status='pending_verification',order_status='pending_verification',updated_at=now()
  where id=p_order_id and store_id=p_store_id and payment_status='awaiting_payment'
    and payment_deadline>now()
  returning * into v_order;
  if not found then raise exception 'Pesanan tidak ditemukan atau waktu unggah telah berakhir'; end if;
  return jsonb_build_object('id',v_order.id,'order_number',v_order.order_number,
    'payment_status',v_order.payment_status,'order_status',v_order.order_status);
end;
$$;
revoke all on function public.attach_self_service_payment_proof(uuid,uuid,text) from public;
grant execute on function public.attach_self_service_payment_proof(uuid,uuid,text) to anon, authenticated;

create or replace function public.update_self_service_order_status(
  p_order_id uuid,p_action text,p_note text default null
) returns jsonb language plpgsql security definer set search_path=''
as $$
declare
  v_order public.self_service_orders;
  v_pos_order public.orders;
  v_ticket public.queue_tickets;
  v_settings public.store_settings;
  v_next_queue integer;
begin
  select * into v_order from public.self_service_orders where id=p_order_id for update;
  if not found or not private.is_store_member(v_order.store_id) or not private.is_store_operational(v_order.store_id) or not private.is_pin_verified() then
    raise exception 'Pesanan tidak ditemukan atau akses ditolak';
  end if;
  if p_action='approve' then
    if v_order.payment_status<>'pending_verification' or v_order.payment_proof_path is null then
      raise exception 'Pesanan belum memiliki bukti pembayaran untuk diverifikasi';
    end if;
    if v_order.pos_order_id is null then
      insert into public.orders(store_id,receipt_number,cashier_id,subtotal,discount,tax,total,payment_method,paid_amount,change_amount,status,idempotency_key,source,self_service_order_id)
      values(v_order.store_id,v_order.order_number,auth.uid(),v_order.subtotal,0,0,v_order.total,'qris',v_order.total,0,'paid',v_order.id,'self_order',v_order.id)
      returning * into v_pos_order;
      insert into public.order_items(order_id,product_id,product_name,quantity,unit_price,line_total)
      select v_pos_order.id,product_id,product_name,quantity,unit_price,line_total
      from public.self_service_order_items where self_service_order_id=v_order.id;
      select * into v_settings from public.store_settings where store_id=v_order.store_id;
      if coalesce(v_settings.queue_enabled,true) then
        perform pg_advisory_xact_lock(hashtextextended(v_order.store_id::text||':'||timezone('Asia/Jakarta',now())::date::text,0));
        select coalesce(max(queue_number),0)+1 into v_next_queue from public.queue_tickets
          where store_id=v_order.store_id and service_date=timezone('Asia/Jakarta',now())::date;
        insert into public.queue_tickets(store_id,service_date,queue_number,customer_name,order_id,status,counter_label)
        values(v_order.store_id,timezone('Asia/Jakarta',now())::date,v_next_queue,v_order.customer_name,v_pos_order.id,'waiting','Kasir 1')
        returning * into v_ticket;
      end if;
    end if;
    update public.self_service_orders set payment_status='paid',order_status='confirmed',
      pos_order_id=coalesce(pos_order_id,v_pos_order.id),queue_ticket_id=coalesce(queue_ticket_id,v_ticket.id),
      verified_by=auth.uid(),verified_at=now(),updated_at=now() where id=p_order_id returning * into v_order;
  elsif p_action='reject' then
    if v_order.payment_status not in ('pending_verification','awaiting_payment') then raise exception 'Status pembayaran tidak dapat ditolak'; end if;
    update public.products p set stock=p.stock+i.quantity,updated_at=now()
    from public.self_service_order_items i where i.self_service_order_id=v_order.id and p.id=i.product_id;
    update public.self_service_orders set payment_status='rejected',order_status='rejected',
      rejection_note=nullif(trim(coalesce(p_note,'')),''),verified_by=auth.uid(),verified_at=now(),updated_at=now()
      where id=p_order_id returning * into v_order;
  elsif p_action in ('preparing','ready','completed') then
    if v_order.payment_status<>'paid' then raise exception 'Pembayaran belum disetujui'; end if;
    if (p_action='preparing' and v_order.order_status<>'confirmed')
      or (p_action='ready' and v_order.order_status<>'preparing')
      or (p_action='completed' and v_order.order_status<>'ready') then
      raise exception 'Perubahan status pesanan tidak sesuai urutan';
    end if;
    update public.self_service_orders set order_status=p_action,updated_at=now()
      where id=p_order_id returning * into v_order;
    if p_action in ('ready','completed') and v_order.queue_ticket_id is not null then
      update public.queue_tickets set status=case when p_action='ready' then 'called' else 'completed' end,
        called_at=case when p_action='ready' then now() else called_at end,
        completed_at=case when p_action='completed' then now() else completed_at end
      where id=v_order.queue_ticket_id;
    end if;
  else
    raise exception 'Aksi status tidak dikenal';
  end if;
  return jsonb_build_object('id',v_order.id,'order_number',v_order.order_number,
    'payment_status',v_order.payment_status,'order_status',v_order.order_status,'pos_order_id',v_order.pos_order_id);
end;
$$;
revoke all on function public.update_self_service_order_status(uuid,text,text) from public;
grant execute on function public.update_self_service_order_status(uuid,text,text) to authenticated;

create or replace function private.capture_self_service_order_audit()
returns trigger language plpgsql security definer set search_path=''
as $$
declare v_store_id uuid; v_org_id uuid; v_entity_id uuid; v_before jsonb; v_after jsonb;
begin
  if tg_op='DELETE' then
    v_store_id:=old.store_id; v_entity_id:=old.id;
    v_before:=jsonb_build_object('order_number',old.order_number,'total',old.total,
      'payment_status',old.payment_status,'order_status',old.order_status);
  else
    v_store_id:=new.store_id; v_entity_id:=new.id;
    if tg_op='UPDATE' then
      v_before:=jsonb_build_object('order_number',old.order_number,'total',old.total,
        'payment_status',old.payment_status,'order_status',old.order_status);
    end if;
    v_after:=jsonb_build_object('order_number',new.order_number,'total',new.total,
      'payment_status',new.payment_status,'order_status',new.order_status);
  end if;
  select organization_id into v_org_id from public.stores where id=v_store_id;
  insert into public.platform_audit_logs(actor_user_id,organization_id,store_id,entity_table,entity_id,action,before_data,after_data)
  values(auth.uid(),v_org_id,v_store_id,'self_service_orders',v_entity_id::text,tg_op,v_before,v_after);
  if tg_op='DELETE' then return old; end if;
  return new;
end;
$;
revoke all on function private.capture_self_service_order_audit() from public;
drop trigger if exists self_service_order_audit_event on public.self_service_orders;
create trigger self_service_order_audit_event
after insert or update or delete on public.self_service_orders
for each row execute function private.capture_self_service_order_audit();

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('self-order-proofs','self-order-proofs',false,5242880,array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update set public=false,file_size_limit=5242880,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists "public customers upload self order payment proof" on storage.objects;
create policy "public customers upload self order payment proof"
on storage.objects for insert to anon,authenticated
with check (bucket_id='self-order-proofs'
  and private.can_upload_self_service_proof(
    ((storage.foldername(name))[1])::uuid,
    ((storage.foldername(name))[2])::uuid
  ));
drop policy if exists "tenant members read self order payment proof" on storage.objects;
create policy "tenant members read self order payment proof"
on storage.objects for select to authenticated
using (bucket_id='self-order-proofs' and exists (
  select 1 from public.self_service_orders o
  where o.id=(((storage.foldername(name))[2])::uuid)
    and o.store_id=(((storage.foldername(name))[1])::uuid)
    and private.is_store_member(o.store_id)
));

do $$
begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='self_service_orders') then
    alter publication supabase_realtime add table public.self_service_orders;
  end if;
end $$;
