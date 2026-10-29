-- Require an authenticated member of the target tenant before creating a queue ticket.
-- This RPC is not granted to anon; enforce tenant membership inside SECURITY DEFINER as well.
create or replace function public.create_queue_ticket(
  p_store_id uuid,
  p_customer_name text default null,
  p_order_id uuid default null
) returns public.queue_tickets
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_number integer;
  new_ticket public.queue_tickets;
  day_key date;
begin
  if (select auth.uid()) is null then
    raise exception 'Silakan login terlebih dahulu.';
  end if;

  if not private.is_store_member(p_store_id) then
    raise exception 'Anda tidak memiliki akses ke toko ini.';
  end if;

  if not private.is_store_operational(p_store_id) then
    raise exception 'Toko tidak aktif atau masa aktivasinya telah habis';
  end if;

  if char_length(coalesce(p_customer_name, '')) > 120 then
    raise exception 'Nama pelanggan maksimal 120 karakter';
  end if;

  if p_order_id is not null and not exists (
    select 1 from public.orders o
    where o.id = p_order_id and o.store_id = p_store_id
  ) then
    raise exception 'Order does not belong to this store';
  end if;

  day_key := (timezone('Asia/Jakarta', now()))::date;
  perform pg_advisory_xact_lock(hashtext(p_store_id::text || ':' || day_key::text));

  select coalesce(max(q.queue_number), 0) + 1
    into next_number
    from public.queue_tickets q
    where q.store_id = p_store_id and q.service_date = day_key;

  insert into public.queue_tickets(store_id, service_date, queue_number, customer_name, order_id)
  values (p_store_id, day_key, next_number, nullif(trim(p_customer_name), ''), p_order_id)
  returning * into new_ticket;

  return new_ticket;
end;
$$;

revoke all on function public.create_queue_ticket(uuid, text, uuid) from public, anon;
grant execute on function public.create_queue_ticket(uuid, text, uuid) to authenticated;
