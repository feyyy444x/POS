-- Public self-service queue tickets for order preparation and pickup.
-- This migration is committed to a development branch only; it is not applied to production.

create or replace function public.create_public_queue_ticket(
  p_store_id uuid,
  p_customer_name text default null
)
returns public.queue_tickets
language plpgsql
security definer
set search_path = ''
as $function$
declare
  next_number integer;
  new_ticket public.queue_tickets;
  day_key date;
  recent_count integer;
  clean_name text;
begin
  if p_store_id is null then
    raise exception 'Store is required';
  end if;

  if not private.is_store_operational(p_store_id) then
    raise exception 'Toko tidak aktif atau masa aktivasinya telah habis';
  end if;

  clean_name := nullif(left(trim(coalesce(p_customer_name, '')), 80), '');

  day_key := (timezone('Asia/Jakarta', now()))::date;

  -- Serialize ticket numbering and apply a conservative per-tenant burst limit.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext(p_store_id::text || ':' || day_key::text)
  );

  select count(*) into recent_count
  from public.queue_tickets q
  where q.store_id = p_store_id
    and q.created_at >= now() - interval '1 minute';

  if recent_count >= 60 then
    raise exception 'Antrian sedang ramai. Silakan minta bantuan petugas.';
  end if;

  select coalesce(max(q.queue_number), 0) + 1 into next_number
  from public.queue_tickets q
  where q.store_id = p_store_id
    and q.service_date = day_key;

  insert into public.queue_tickets(
    store_id, service_date, queue_number, customer_name, order_id, status, counter_label
  )
  values (
    p_store_id, day_key, next_number, clean_name, null, 'waiting', 'Pengambilan Pesanan'
  )
  returning * into new_ticket;

  return new_ticket;
end;
$function$;

revoke all on function public.create_public_queue_ticket(uuid, text) from public;
grant execute on function public.create_public_queue_ticket(uuid, text) to anon, authenticated;
