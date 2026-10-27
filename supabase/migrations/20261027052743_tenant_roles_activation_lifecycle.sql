-- NexaPos tenant lifecycle, role boundaries, invitations, and timed activation.
create table if not exists public.super_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.super_admins enable row level security;

alter table public.stores
  add column if not exists owner_name text not null default '',
  add column if not exists owner_email text not null default '',
  add column if not exists status text not null default 'active'
    check (status in ('pending','active','suspended','expired','deleted')),
  add column if not exists activated_at timestamptz,
  add column if not exists expires_at timestamptz,
  add column if not exists activation_days integer,
  add column if not exists deleted_at timestamptz;

update public.stores s
set owner_email = coalesce(nullif(s.owner_email,''), u.email, ''),
    owner_name = coalesce(nullif(s.owner_name,''), u.raw_user_meta_data->>'full_name', '')
from public.store_members m
join auth.users u on u.id=m.user_id
where m.store_id=s.id and m.role='owner';

alter table public.store_members
  add column if not exists email text not null default '',
  add column if not exists full_name text not null default '',
  add column if not exists is_active boolean not null default true;

update public.store_members m set email=u.email,
  full_name=coalesce(u.raw_user_meta_data->>'full_name','')
from auth.users u where u.id=m.user_id and m.email='';

create or replace function private.is_store_member(target_store uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.store_members m
    where m.store_id=target_store and m.user_id=(select auth.uid()) and m.is_active=true)
$$;
revoke all on function private.is_store_member(uuid) from public, anon;
grant execute on function private.is_store_member(uuid) to authenticated;

create or replace function private.is_store_manager(target_store uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.store_members m
    where m.store_id=target_store and m.user_id=(select auth.uid()) and m.is_active=true
      and m.role in ('owner','admin','manager'))
$$;
revoke all on function private.is_store_manager(uuid) from public, anon;
grant execute on function private.is_store_manager(uuid) to authenticated;

create or replace function private.is_store_owner(target_store uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.store_members m
    where m.store_id=target_store and m.user_id=(select auth.uid()) and m.role='owner' and m.is_active=true)
$$;
revoke all on function private.is_store_owner(uuid) from public, anon;
grant execute on function private.is_store_owner(uuid) to authenticated;

create table if not exists public.store_invites (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  role text not null check (role in ('owner','admin','cashier')),
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  accepted_at timestamptz
);
alter table public.store_invites enable row level security;

create index if not exists store_invites_email_idx on public.store_invites(lower(email));
create index if not exists stores_status_expiry_idx on public.stores(status, expires_at);

create or replace function private.is_super_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.super_admins sa where sa.user_id=(select auth.uid()))
$$;
revoke all on function private.is_super_admin() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_super_admin() to authenticated;

create or replace function private.is_store_operational(target_store uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.is_store_member(target_store)
     and exists (
       select 1 from public.stores s
       where s.id=target_store
         and s.status='active'
         and (s.expires_at is null or s.expires_at > now())
         and s.deleted_at is null
     )
$$;
revoke all on function private.is_store_operational(uuid) from public, anon;
grant execute on function private.is_store_operational(uuid) to authenticated;

-- A new account only joins a tenant when a matching invitation exists.
-- Public sign-up alone must never create a tenant or grant the owner role.
create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.store_members(store_id,user_id,role,email,full_name)
  select i.store_id,new.id,i.role,lower(new.email),i.full_name
  from public.store_invites i
  where lower(i.email)=lower(new.email)
    and i.accepted_at is null
    and i.expires_at > now()
  on conflict (store_id,user_id) do nothing;

  update public.store_invites
  set accepted_at=now()
  where lower(email)=lower(new.email)
    and accepted_at is null
    and expires_at > now();

  return new;
end;
$$;
drop trigger if exists on_auth_user_created_nexapos on auth.users;
create trigger on_auth_user_created_nexapos after insert on auth.users
for each row execute function private.handle_new_user();

create or replace function public.accept_store_invites()
returns integer language plpgsql security definer set search_path = '' as $$
declare v_email text; v_count integer;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
  select lower(u.email) into v_email from auth.users u where u.id=(select auth.uid());
  if v_email is null then raise exception 'Account email unavailable'; end if;

  insert into public.store_members(store_id,user_id,role,email,full_name)
  select i.store_id,(select auth.uid()),i.role,v_email,i.full_name
  from public.store_invites i
  where lower(i.email)=v_email and i.accepted_at is null and i.expires_at>now()
  on conflict (store_id,user_id) do nothing;
  get diagnostics v_count = row_count;

  update public.store_invites set accepted_at=now()
  where lower(email)=v_email and accepted_at is null and expires_at>now();
  return v_count;
end;
$$;
revoke all on function public.accept_store_invites() from public, anon;
grant execute on function public.accept_store_invites() to authenticated;

create or replace function public.register_store_tenant(
  p_store_name text,
  p_owner_name text,
  p_owner_email text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_store_id uuid; v_email text;
begin
  if not private.is_super_admin() then raise exception 'Super Admin access required'; end if;
  if nullif(trim(p_store_name),'') is null or nullif(trim(p_owner_name),'') is null then
    raise exception 'Nama toko dan nama pemilik wajib diisi';
  end if;
  v_email:=lower(trim(p_owner_email));
  if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Format email pemilik tidak valid';
  end if;

  insert into public.stores(name,owner_name,owner_email,status)
  values(trim(p_store_name),trim(p_owner_name),v_email,'pending')
  returning id into v_store_id;
  insert into public.store_settings(store_id,store_name)
  values(v_store_id,trim(p_store_name));
  insert into public.store_invites(store_id,email,full_name,role,invited_by)
  values(v_store_id,v_email,trim(p_owner_name),'owner',(select auth.uid()));
  return v_store_id;
end;
$$;
revoke all on function public.register_store_tenant(text,text,text) from public, anon;
grant execute on function public.register_store_tenant(text,text,text) to authenticated;

create or replace function public.activate_store_tenant(
  p_store_id uuid,
  p_duration_days integer
) returns public.stores language plpgsql security definer set search_path = '' as $$
declare v_store public.stores;
begin
  if not private.is_super_admin() then raise exception 'Super Admin access required'; end if;
  if p_duration_days is null or p_duration_days < 1 or p_duration_days > 3650 then
    raise exception 'Durasi harus 1 sampai 3650 hari';
  end if;
  update public.stores
  set status='active',
      activated_at=now(),
      expires_at=now() + make_interval(days => p_duration_days),
      activation_days=p_duration_days,
      deleted_at=null
  where id=p_store_id and status <> 'deleted'
  returning * into v_store;
  if not found then raise exception 'Tenant tidak ditemukan atau sudah diarsipkan'; end if;
  return v_store;
end;
$$;
revoke all on function public.activate_store_tenant(uuid,integer) from public, anon;
grant execute on function public.activate_store_tenant(uuid,integer) to authenticated;

create or replace function public.set_store_tenant_status(
  p_store_id uuid,
  p_status text
) returns public.stores language plpgsql security definer set search_path = '' as $$
declare v_store public.stores;
begin
  if not private.is_super_admin() then raise exception 'Super Admin access required'; end if;
  if p_status not in ('pending','suspended','deleted') then
    raise exception 'Status tidak diizinkan; gunakan aktivasi untuk mengaktifkan tenant';
  end if;
  update public.stores
  set status=p_status,
      deleted_at=case when p_status='deleted' then now() else null end
  where id=p_store_id and status <> 'deleted'
  returning * into v_store;
  if not found then raise exception 'Tenant tidak ditemukan atau sudah diarsipkan'; end if;
  return v_store;
end;
$$;
revoke all on function public.set_store_tenant_status(uuid,text) from public, anon;
grant execute on function public.set_store_tenant_status(uuid,text) to authenticated;

create or replace function public.invite_store_member(
  p_store_id uuid,
  p_email text,
  p_full_name text,
  p_role text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_email text; v_invite_id uuid;
begin
  if not exists (
    select 1 from public.store_members m
    where m.store_id=p_store_id and m.user_id=(select auth.uid()) and m.role='owner'
  ) then raise exception 'Hanya Owner toko yang dapat mengundang anggota'; end if;
  if not private.is_store_operational(p_store_id) then raise exception 'Toko tidak aktif atau masa aktivasinya telah habis'; end if;
  if p_role not in ('admin','cashier') then raise exception 'Jabatan hanya boleh Admin atau Kasir'; end if;
  v_email:=lower(trim(p_email));
  if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Format email tidak valid'; end if;
  if exists(select 1 from public.store_members m where m.store_id=p_store_id and lower(m.email)=v_email) then
    raise exception 'Email sudah menjadi anggota toko ini';
  end if;
  delete from public.store_invites where store_id=p_store_id and lower(email)=v_email and accepted_at is null;
  insert into public.store_invites(store_id,email,full_name,role,invited_by)
  values(p_store_id,v_email,trim(coalesce(p_full_name,'')),p_role,(select auth.uid()))
  returning id into v_invite_id;
  return v_invite_id;
end;
$$;
revoke all on function public.invite_store_member(uuid,text,text,text) from public, anon;
grant execute on function public.invite_store_member(uuid,text,text,text) to authenticated;

create or replace function public.manage_store_member(
  p_member_id uuid,
  p_role text,
  p_is_active boolean
) returns public.store_members language plpgsql security definer set search_path = '' as $$
declare v_member public.store_members;
begin
  if p_role not in ('admin','cashier') then raise exception 'Jabatan hanya boleh Admin atau Kasir'; end if;
  select m.* into v_member
  from public.store_members m
  join public.store_members actor on actor.store_id=m.store_id
  where m.id=p_member_id and actor.user_id=(select auth.uid())
    and actor.role='owner' and actor.is_active=true
    and m.role<>'owner'
  limit 1;
  if not found then raise exception 'Anggota tidak ditemukan atau akses Owner diperlukan'; end if;
  if not private.is_store_operational(v_member.store_id) then raise exception 'Toko tidak aktif atau masa aktivasinya telah habis'; end if;
  update public.store_members set role=p_role,is_active=coalesce(p_is_active,true)
  where id=p_member_id returning * into v_member;
  return v_member;
end;
$$;
revoke all on function public.manage_store_member(uuid,text,boolean) from public, anon;
grant execute on function public.manage_store_member(uuid,text,boolean) to authenticated;

-- Rebuild policies so operational data is unavailable as soon as activation expires.
do $$
declare p record;
begin
  for p in select schemaname,tablename,policyname
    from pg_policies
    where schemaname='public'
      and tablename in ('stores','store_members','products','orders','order_items','queue_tickets','store_settings','super_admins','store_invites')
  loop
    execute format('drop policy if exists %I on %I.%I',p.policyname,p.schemaname,p.tablename);
  end loop;
end $$;

create policy "super admins read own authorization" on public.super_admins
for select to authenticated using (user_id=(select auth.uid()) or private.is_super_admin());

create policy "members and super admins read stores" on public.stores
for select to authenticated using (private.is_store_member(id) or private.is_super_admin());
create policy "super admins update stores" on public.stores
for update to authenticated using (private.is_super_admin()) with check (private.is_super_admin());
create policy "super admins insert stores" on public.stores
for insert to authenticated with check (private.is_super_admin());
-- Physical tenant deletion is intentionally disabled; Super Admin uses status='deleted' to preserve audit history.

create policy "members and super admins read memberships" on public.store_members
for select to authenticated using (private.is_store_member(store_id) or private.is_super_admin());

create policy "members read operational products" on public.products
for select to authenticated using (private.is_store_operational(store_id));
create policy "managers insert operational products" on public.products
for insert to authenticated with check (private.is_store_operational(store_id) and private.is_store_manager(store_id));
create policy "managers update operational products" on public.products
for update to authenticated using (private.is_store_operational(store_id) and private.is_store_manager(store_id))
with check (private.is_store_operational(store_id) and private.is_store_manager(store_id));
create policy "managers delete operational products" on public.products
for delete to authenticated using (private.is_store_operational(store_id) and private.is_store_manager(store_id));

create policy "members read operational orders" on public.orders
for select to authenticated using (private.is_store_operational(store_id));
create policy "managers update operational orders" on public.orders
for update to authenticated using (private.is_store_operational(store_id) and private.is_store_manager(store_id))
with check (private.is_store_operational(store_id) and private.is_store_manager(store_id));

create policy "members read operational order items" on public.order_items
for select to authenticated using (exists(
  select 1 from public.orders o where o.id=order_id and private.is_store_operational(o.store_id)
));

create policy "members read operational queue" on public.queue_tickets
for select to authenticated using (private.is_store_operational(store_id));
create policy "members update operational queue" on public.queue_tickets
for update to authenticated using (private.is_store_operational(store_id))
with check (private.is_store_operational(store_id));
create policy "managers delete operational queue" on public.queue_tickets
for delete to authenticated using (private.is_store_operational(store_id) and private.is_store_manager(store_id));

create policy "members read store settings" on public.store_settings
for select to authenticated using (private.is_store_member(store_id) or private.is_super_admin());
create policy "managers update active store settings" on public.store_settings
for update to authenticated using (private.is_store_operational(store_id) and private.is_store_manager(store_id))
with check (private.is_store_operational(store_id) and private.is_store_manager(store_id));
create policy "managers insert active store settings" on public.store_settings
for insert to authenticated with check (private.is_store_operational(store_id) and private.is_store_manager(store_id));

create policy "owners and super admins read invites" on public.store_invites
for select to authenticated using (private.is_store_owner(store_id) or private.is_super_admin());

-- Sales/queue RPCs enforce activation in the database, not just in the UI.
create or replace function public.create_queue_ticket(p_store_id uuid,p_customer_name text default null,p_order_id uuid default null)
returns public.queue_tickets language plpgsql security definer set search_path = '' as $$
declare next_number integer; new_ticket public.queue_tickets; day_key date;
begin
  if not private.is_store_operational(p_store_id) then raise exception 'Toko tidak aktif atau masa aktivasinya telah habis'; end if;
  if p_order_id is not null and not exists(select 1 from public.orders o where o.id=p_order_id and o.store_id=p_store_id) then
    raise exception 'Order does not belong to this store';
  end if;
  day_key := (timezone('Asia/Jakarta', now()))::date;
  perform pg_advisory_xact_lock(hashtext(p_store_id::text || ':' || day_key::text));
  select coalesce(max(q.queue_number),0)+1 into next_number from public.queue_tickets q
  where q.store_id=p_store_id and q.service_date=day_key;
  insert into public.queue_tickets(store_id,service_date,queue_number,customer_name,order_id)
  values(p_store_id,day_key,next_number,nullif(trim(p_customer_name),''),p_order_id)
  returning * into new_ticket;
  return new_ticket;
end;
$$;
revoke all on function public.create_queue_ticket(uuid,text,uuid) from public, anon;
grant execute on function public.create_queue_ticket(uuid,text,uuid) to authenticated;

create or replace function public.complete_sale(
  p_store_id uuid,p_items jsonb,p_discount numeric default 0,p_payment_method text default 'cash',
  p_paid_amount numeric default 0,p_customer_name text default null,p_create_queue boolean default true
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_item jsonb; v_product public.products; v_qty integer;
  v_subtotal numeric(12,2):=0; v_discount numeric(12,2):=greatest(coalesce(p_discount,0),0);
  v_total numeric(12,2); v_order public.orders; v_ticket public.queue_tickets; v_receipt text;
begin
  if not private.is_store_operational(p_store_id) then raise exception 'Toko tidak aktif atau masa aktivasinya telah habis'; end if;
  if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 then raise exception 'Cart is empty'; end if;
  if p_payment_method not in ('cash','qris','card','transfer','other') then raise exception 'Invalid payment method'; end if;
  for v_item in select value from jsonb_array_elements(p_items) loop
    v_qty:=greatest(0,(v_item->>'quantity')::integer);
    if v_qty<1 then raise exception 'Invalid quantity'; end if;
    select * into v_product from public.products where id=(v_item->>'product_id')::uuid and store_id=p_store_id and is_active=true for update;
    if not found then raise exception 'Product not found or inactive'; end if;
    if v_product.stock<v_qty then raise exception 'Insufficient stock for %',v_product.name; end if;
    v_subtotal:=v_subtotal+v_product.price*v_qty;
  end loop;
  v_discount:=least(v_discount,v_subtotal);v_total:=v_subtotal-v_discount;
  if coalesce(p_paid_amount,0)<v_total then raise exception 'Payment amount is less than total'; end if;
  v_receipt:='NP-'||to_char(timezone('Asia/Jakarta',now()),'YYYYMMDD-HH24MISS')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,4));
  insert into public.orders(store_id,receipt_number,cashier_id,subtotal,discount,total,payment_method,paid_amount,change_amount)
  values(p_store_id,v_receipt,(select auth.uid()),v_subtotal,v_discount,v_total,p_payment_method,coalesce(p_paid_amount,0),coalesce(p_paid_amount,0)-v_total) returning * into v_order;
  for v_item in select value from jsonb_array_elements(p_items) loop
    v_qty:=(v_item->>'quantity')::integer;
    select * into v_product from public.products where id=(v_item->>'product_id')::uuid and store_id=p_store_id for update;
    insert into public.order_items(order_id,product_id,product_name,quantity,unit_price,line_total)
    values(v_order.id,v_product.id,v_product.name,v_qty,v_product.price,v_product.price*v_qty);
    update public.products set stock=stock-v_qty,updated_at=now() where id=v_product.id;
  end loop;
  if coalesce(p_create_queue,true) then v_ticket:=public.create_queue_ticket(p_store_id,p_customer_name,v_order.id); end if;
  return jsonb_build_object('order',to_jsonb(v_order),'ticket',case when v_ticket.id is null then null else to_jsonb(v_ticket) end);
end;
$$;
revoke all on function public.complete_sale(uuid,jsonb,numeric,text,numeric,text,boolean) from public, anon;
grant execute on function public.complete_sale(uuid,jsonb,numeric,text,numeric,text,boolean) to authenticated;

-- The browser can read only the rows permitted by the RLS policies above.
grant select on public.super_admins, public.store_invites to authenticated;
