-- Read-only access for suspended/expired tenants, with server-side mutation guards.
-- This migration does not alter or delete tenant business data.

create or replace function private.is_store_operational(target_store uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select private.is_store_member(target_store)
    and exists (
      select 1
      from public.stores s
      left join public.owner_organizations o on o.id = s.organization_id
      where s.id = target_store
        and s.status = 'active'
        and (s.expires_at is null or s.expires_at > now())
        and s.deleted_at is null
        and (
          s.organization_id is null
          or (
            o.id is not null
            and o.status = 'active'
            and (o.expires_at is null or o.expires_at > now())
          )
        )
    )
$function$;

-- Keep tenant data readable by its active members while operational writes remain blocked.
drop policy if exists "members read operational products" on public.products;
create policy "members read tenant products"
  on public.products for select to authenticated
  using (private.is_store_member(store_id));

drop policy if exists "members read operational orders" on public.orders;
create policy "members read tenant orders"
  on public.orders for select to authenticated
  using (private.is_store_member(store_id));

drop policy if exists "members read operational order items" on public.order_items;
create policy "members read tenant order items"
  on public.order_items for select to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and private.is_store_member(o.store_id)
    )
  );

drop policy if exists "members read operational queue" on public.queue_tickets;
create policy "members read tenant queue"
  on public.queue_tickets for select to authenticated
  using (private.is_store_member(store_id));

drop policy if exists "cashiers can open own shift" on public.cashier_shifts;
create policy "cashiers can open own shift"
  on public.cashier_shifts for insert to authenticated
  with check (
    cashier_id = (select auth.uid())
    and private.is_store_member(store_id)
    and private.is_store_operational(store_id)
    and closed_at is null
    and counted_cash is null
    and counted_qris is null
  );

drop policy if exists "store managers insert break alert settings" on public.cashier_break_settings;
create policy "store managers insert break alert settings"
  on public.cashier_break_settings for insert to authenticated
  with check (private.is_store_manager(store_id) and private.is_store_operational(store_id));

drop policy if exists "store managers update break alert settings" on public.cashier_break_settings;
create policy "store managers update break alert settings"
  on public.cashier_break_settings for update to authenticated
  using (private.is_store_manager(store_id) and private.is_store_operational(store_id))
  with check (private.is_store_manager(store_id) and private.is_store_operational(store_id));

drop policy if exists "cashiers start own breaks on open shifts" on public.cashier_shift_breaks;
create policy "cashiers start own breaks on open shifts"
  on public.cashier_shift_breaks for insert to authenticated
  with check (
    cashier_id = (select auth.uid())
    and private.is_store_member(store_id)
    and private.is_store_operational(store_id)
    and exists (
      select 1 from public.cashier_shifts s
      where s.id = cashier_shift_breaks.shift_id
        and s.store_id = cashier_shift_breaks.store_id
        and s.cashier_id = (select auth.uid())
        and s.closed_at is null
    )
    and ended_at is null
  );

drop policy if exists "cashiers end own breaks" on public.cashier_shift_breaks;
create policy "cashiers end own breaks"
  on public.cashier_shift_breaks for update to authenticated
  using (
    cashier_id = (select auth.uid())
    and ended_at is null
    and private.is_store_operational(store_id)
  )
  with check (
    cashier_id = (select auth.uid())
    and ended_at is not null
    and private.is_store_operational(store_id)
    and exists (
      select 1 from public.cashier_shifts s
      where s.id = cashier_shift_breaks.shift_id
        and s.store_id = cashier_shift_breaks.store_id
        and s.cashier_id = (select auth.uid())
        and s.closed_at is null
    )
  );

-- SECURITY DEFINER checkout must enforce entitlement itself, not rely on client/RLS.
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
begin
  if not private.is_store_operational(p_store_id) then
    raise exception 'Layanan toko sedang nonaktif atau masa sewanya telah berakhir';
  end if;
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
  v_discount := least(v_discount, v_subtotal);
  v_total := v_subtotal - v_discount;
  if coalesce(p_paid_amount,0) < v_total then raise exception 'Payment amount is less than total'; end if;
  v_receipt := 'NP-' || to_char(timezone('Asia/Jakarta', now()), 'YYYYMMDD-HH24MISS') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,4));
  insert into public.orders(store_id,receipt_number,cashier_id,subtotal,discount,total,payment_method,paid_amount,change_amount)
  values (p_store_id,v_receipt,(select auth.uid()),v_subtotal,v_discount,v_total,p_payment_method,coalesce(p_paid_amount,0),coalesce(p_paid_amount,0)-v_total)
  returning * into v_order;
  for v_item in select value from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'quantity')::integer;
    select * into v_product from public.products where id = (v_item->>'product_id')::uuid and store_id = p_store_id for update;
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
  if not private.is_store_operational(p_store_id) then
    raise exception 'Layanan toko sedang nonaktif atau masa sewanya telah berakhir';
  end if;
  if p_request_id is null then raise exception 'Checkout request ID is required'; end if;
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
  v_result := public.complete_sale(p_store_id,p_items,p_discount,p_payment_method,p_paid_amount,p_customer_name,p_create_queue);
  v_order_id := nullif(v_result->'order'->>'id', '')::uuid;
  if v_order_id is null then raise exception 'Checkout did not return a valid order ID'; end if;
  update public.orders set idempotency_key = p_request_id
  where id = v_order_id and store_id = p_store_id;
  if not found then raise exception 'Could not attach checkout request ID to order'; end if;
  return v_result;
end;
$function$;

revoke all on function public.complete_sale_idempotent(uuid,jsonb,numeric,text,numeric,text,boolean,uuid) from public, anon;
grant execute on function public.complete_sale_idempotent(uuid,jsonb,numeric,text,numeric,text,boolean,uuid) to authenticated;
revoke all on function public.complete_sale(uuid,jsonb,numeric,text,numeric,text,boolean) from public, anon, authenticated;

create or replace function public.close_cashier_shift(
  p_shift_id uuid,
  p_counted_cash numeric,
  p_counted_qris numeric,
  p_notes text default null
)
returns public.cashier_shifts
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
  if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
  if coalesce(p_counted_cash, -1) < 0 or coalesce(p_counted_qris, -1) < 0 then
    raise exception 'Cash and QRIS counts must be zero or greater';
  end if;
  select * into v_shift from public.cashier_shifts where id = p_shift_id for update;
  if not found then raise exception 'Shift not found'; end if;
  if v_shift.cashier_id <> (select auth.uid())
     and not private.is_store_manager(v_shift.store_id) then
    raise exception 'Not authorized to close this shift';
  end if;
  if v_shift.closed_at is not null then raise exception 'Shift is already closed'; end if;
  if not private.is_store_member(v_shift.store_id) then raise exception 'Not authorized for this store'; end if;
  if not private.is_store_operational(v_shift.store_id) then
    raise exception 'Layanan toko sedang nonaktif atau masa sewanya telah berakhir';
  end if;
  select
    coalesce(v_shift.opening_cash,0) + coalesce(sum(o.total) filter (where o.payment_method = 'cash'),0),
    coalesce(sum(o.total) filter (where o.payment_method = 'qris'),0)
  into v_expected_cash, v_expected_qris
  from public.orders o
  where o.store_id = v_shift.store_id and o.cashier_id = v_shift.cashier_id
    and o.status = 'paid' and o.created_at >= v_shift.opened_at and o.created_at <= v_closed_at;
  update public.cashier_shifts
  set closed_at = v_closed_at, counted_cash = p_counted_cash, counted_qris = p_counted_qris,
      expected_cash = v_expected_cash, expected_qris = v_expected_qris,
      cash_difference = p_counted_cash - v_expected_cash,
      qris_difference = p_counted_qris - v_expected_qris,
      notes = nullif(trim(coalesce(p_notes,'')), '')
  where id = p_shift_id returning * into v_shift;
  return v_shift;
end;
$function$;

create or replace function public.call_queue_ticket(p_ticket_id uuid, p_counter_label text)
returns public.queue_tickets
language plpgsql
set search_path = ''
as $function$
declare
  v_ticket public.queue_tickets;
  v_user uuid := (select auth.uid());
  v_label text := nullif(trim(p_counter_label), '');
  v_name text;
begin
  if v_user is null then raise exception 'Silakan login kembali.'; end if;
  if v_label is null or length(v_label) > 80 then raise exception 'Nama kasir/konter/loket wajib diisi (maksimal 80 karakter).'; end if;
  select q.* into v_ticket from public.queue_tickets q where q.id = p_ticket_id for update;
  if not found then raise exception 'Nomor antrean tidak ditemukan.'; end if;
  if not private.is_store_member(v_ticket.store_id) then raise exception 'Anda tidak memiliki akses ke toko ini.'; end if;
  if not private.is_store_operational(v_ticket.store_id) then
    raise exception 'Layanan toko sedang nonaktif atau masa sewanya telah berakhir';
  end if;
  if v_ticket.status <> 'waiting' then raise exception 'Nomor ini sudah dipanggil atau tidak lagi menunggu. Muat ulang antrean.'; end if;
  select coalesce(nullif(trim(m.full_name), ''), nullif(trim(m.email), ''), 'Petugas')
    into v_name from public.store_members m
    where m.store_id = v_ticket.store_id and m.user_id = v_user limit 1;
  update public.queue_tickets
  set status = 'called', called_at = now(), called_by = v_user,
      called_by_name = coalesce(v_name, 'Petugas'), counter_label = v_label
  where id = p_ticket_id and status = 'waiting' returning * into v_ticket;
  if not found then raise exception 'Nomor ini sudah dipanggil oleh petugas lain.'; end if;
  return v_ticket;
end;
$function$;

-- Manager/Owner management RPCs must reject direct calls while their tenant is locked.
create or replace function public.owner_update_store_member(
  p_member_id uuid,p_full_name text,p_role text,p_is_active boolean
)
returns public.store_members
language plpgsql
security definer
set search_path = ''
as $function$
declare v_member public.store_members;
begin
  select * into v_member from public.store_members where id=p_member_id;
  if v_member.id is null then raise exception 'Anggota tidak ditemukan'; end if;
  if not private.is_store_manager(v_member.store_id) then raise exception 'Akses Owner/Manager aktif dan verifikasi PIN diperlukan'; end if;
  if not private.is_store_operational(v_member.store_id) then raise exception 'Layanan toko sedang nonaktif atau masa sewanya telah berakhir'; end if;
  if v_member.user_id=(select auth.uid()) or v_member.role='owner' then raise exception 'Akun Owner tidak dapat diubah dari menu staf'; end if;
  if p_role not in ('admin','cashier') then raise exception 'Role tidak valid'; end if;
  if length(btrim(coalesce(p_full_name,'')))<2 or length(btrim(p_full_name))>120 then raise exception 'Nama harus 2–120 karakter'; end if;
  update public.store_members set full_name=btrim(p_full_name),role=p_role,is_active=coalesce(p_is_active,false),
    disabled_at=case when coalesce(p_is_active,false) then null else coalesce(disabled_at,now()) end,
    disabled_by=case when coalesce(p_is_active,false) then null else (select auth.uid()) end
  where id=p_member_id returning * into v_member;
  return v_member;
end;
$function$;

create or replace function public.owner_delete_store_member(p_member_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare v_member public.store_members; v_email text;
begin
  select * into v_member from public.store_members where id=p_member_id for update;
  if v_member.id is null then raise exception 'Anggota tidak ditemukan'; end if;
  if not private.is_store_manager(v_member.store_id) then raise exception 'Akses Owner/Manager aktif dan verifikasi PIN diperlukan'; end if;
  if not private.is_store_operational(v_member.store_id) then raise exception 'Layanan toko sedang nonaktif atau masa sewanya telah berakhir'; end if;
  if v_member.user_id=(select auth.uid()) or v_member.role='owner' then raise exception 'Akun Owner tidak dapat dihapus dari menu staf'; end if;
  if exists(select 1 from public.cashier_shifts cs where cs.cashier_id=v_member.user_id and cs.store_id=v_member.store_id and cs.closed_at is null) then
    raise exception 'Anggota masih memiliki sesi kasir terbuka. Tutup sesi kasir terlebih dahulu.';
  end if;
  v_email:=v_member.email;
  delete from public.store_invites where store_id=v_member.store_id and lower(email)=lower(v_email);
  delete from public.store_members where id=p_member_id;
  if not exists(select 1 from public.store_members where user_id=v_member.user_id)
     and not exists(select 1 from public.super_admins where user_id=v_member.user_id) then
    delete from public.store_invites where lower(email)=lower(v_email);
    delete from auth.users where id=v_member.user_id;
  end if;
end;
$function$;

create or replace function public.manager_reset_store_member_pin(p_member_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare v_member public.store_members;
begin
  select * into v_member from public.store_members where id=p_member_id;
  if v_member.id is null then raise exception 'Anggota tidak ditemukan'; end if;
  if not private.is_store_manager(v_member.store_id) then raise exception 'Akses Owner/Manager aktif dan verifikasi PIN diperlukan'; end if;
  if not private.is_store_operational(v_member.store_id) then raise exception 'Layanan toko sedang nonaktif atau masa sewanya telah berakhir'; end if;
  if v_member.role='owner' or v_member.user_id=(select auth.uid()) then raise exception 'PIN Owner atau akun sendiri tidak dapat direset dari menu ini'; end if;
  delete from public.user_security_pins where user_id=v_member.user_id;
  delete from public.pin_verified_sessions where user_id=v_member.user_id;
  delete from public.user_pin_attempt_limits where user_id=v_member.user_id;
end;
$function$;

create or replace function public.owner_delete_store_invite(p_invite_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare v_store_id uuid;
begin
  select store_id into v_store_id from public.store_invites where id=p_invite_id;
  if v_store_id is null then raise exception 'Undangan tidak ditemukan'; end if;
  if not private.is_store_manager(v_store_id) then raise exception 'Akses Owner/Manager aktif dan verifikasi PIN diperlukan'; end if;
  if not private.is_store_operational(v_store_id) then raise exception 'Layanan toko sedang nonaktif atau masa sewanya telah berakhir'; end if;
  delete from public.store_invites where id=p_invite_id;
end;
$function$;

create or replace function public.owner_regenerate_store_invite(p_invite_id uuid,p_activation_code text)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare v_store_id uuid; v_accepted_at timestamptz; v_code text:=lower(trim(coalesce(p_activation_code,'')));
begin
  if v_code !~ '^[a-f0-9]{32}$' then raise exception 'Kode aktivasi tidak valid'; end if;
  select store_id,accepted_at into v_store_id,v_accepted_at from public.store_invites where id=p_invite_id for update;
  if v_store_id is null then raise exception 'Undangan tidak ditemukan'; end if;
  if not private.is_store_manager(v_store_id) then raise exception 'Akses Owner/Manager aktif dan verifikasi PIN diperlukan'; end if;
  if not private.is_store_operational(v_store_id) then raise exception 'Layanan toko sedang nonaktif atau masa sewanya telah berakhir'; end if;
  if v_accepted_at is not null then raise exception 'Undangan sudah diterima; buat undangan baru jika diperlukan'; end if;
  update public.store_invites set activation_code_hash=encode(extensions.digest(v_code,'sha256'),'hex'),expires_at=now()+interval '30 days' where id=p_invite_id;
end;
$function$;

create or replace function public.owner_delete_store_tenant(p_store_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
  if p_store_id is null or not private.is_store_owner(p_store_id) then
    raise exception 'Hanya Owner tenant yang dapat menghapus tenant ini';
  end if;
  if not private.is_store_operational(p_store_id) then
    raise exception 'Tenant nonaktif atau masa sewanya telah berakhir; hubungi Tim NexaPos untuk membuka kembali akses';
  end if;
  perform private.delete_store_tenant_data(p_store_id);
end;
$function$;

create or replace function public.owner_update_organization_profile(p_organization_name text)
returns public.owner_organizations
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_org public.owner_organizations;
  v_name text := btrim(coalesce(p_organization_name, ''));
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if not private.is_pin_verified() then raise exception 'Verifikasi PIN diperlukan untuk mengubah pengaturan organisasi'; end if;
  if char_length(v_name) < 2 or char_length(v_name) > 120 then raise exception 'Nama organisasi harus 2 sampai 120 karakter'; end if;
  select * into v_org from public.owner_organizations
  where owner_user_id = v_user_id for update;
  if not found then raise exception 'Organisasi Owner tidak ditemukan atau bukan milik akun ini'; end if;
  if v_org.status <> 'active' or (v_org.expires_at is not null and v_org.expires_at <= now()) then
    raise exception 'Layanan organisasi sedang nonaktif atau masa sewanya telah berakhir';
  end if;
  update public.owner_organizations set organization_name=v_name,updated_at=now()
  where id=v_org.id returning * into v_org;
  return v_org;
end;
$function$;

-- Owners may still open a suspended/expired tenant in read-only mode to inspect retained data.
create or replace function public.owner_enter_store_tenant(p_store_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_org public.owner_organizations;
  v_store public.stores;
  v_email text;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if not private.is_pin_verified() then raise exception 'Verifikasi PIN diperlukan untuk membuka tenant'; end if;
  select * into v_org from public.owner_organizations
  where owner_user_id = v_user_id
  order by created_at asc limit 1;
  if not found or v_org.status = 'deleted' then
    raise exception 'Organisasi Owner tidak ditemukan atau telah dihapus';
  end if;
  select * into v_store from public.stores
  where id=p_store_id and organization_id=v_org.id;
  if not found or v_store.status='deleted' or v_store.deleted_at is not null then
    raise exception 'Tenant tidak ditemukan atau telah diarsipkan';
  end if;
  select lower(u.email) into v_email from auth.users u where u.id=v_user_id;
  insert into public.store_members(store_id,user_id,role,email,full_name,is_active,disabled_at)
  values(v_store.id,v_user_id,'owner',coalesce(v_email,v_org.owner_email),v_org.owner_name,true,null)
  on conflict (store_id,user_id) do update
    set role='owner',email=excluded.email,full_name=excluded.full_name,is_active=true,disabled_at=null;
  return true;
end;
$function$;

revoke all on function public.owner_enter_store_tenant(uuid) from public, anon;
grant execute on function public.owner_enter_store_tenant(uuid) to authenticated;
