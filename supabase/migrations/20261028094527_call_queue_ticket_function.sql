create or replace function public.call_queue_ticket(
  p_ticket_id uuid,
  p_counter_label text
)
returns public.queue_tickets
language plpgsql
security definer
set search_path = ''
as $function$
declare
  target_store_id uuid;
  updated_ticket public.queue_tickets;
  safe_counter_label text;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  safe_counter_label := nullif(btrim(p_counter_label), '');
  if safe_counter_label is null then
    raise exception 'Nama loket wajib diisi';
  end if;
  if char_length(safe_counter_label) > 80 then
    raise exception 'Nama loket maksimal 80 karakter';
  end if;

  select q.store_id
    into target_store_id
    from public.queue_tickets q
   where q.id = p_ticket_id;

  if target_store_id is null then
    raise exception 'Tiket antrean tidak ditemukan';
  end if;

  if not private.is_store_member(target_store_id) then
    raise exception 'Tidak memiliki akses ke antrean toko ini';
  end if;

  update public.queue_tickets q
     set status = 'called',
         counter_label = safe_counter_label,
         called_at = now()
   where q.id = p_ticket_id
     and q.store_id = target_store_id
     and q.status = 'waiting'
  returning q.* into updated_ticket;

  if not found then
    raise exception 'Tiket sudah dipanggil atau tidak lagi menunggu';
  end if;

  return updated_ticket;
end;
$function$;

revoke all on function public.call_queue_ticket(uuid, text) from public;
revoke all on function public.call_queue_ticket(uuid, text) from anon;
grant execute on function public.call_queue_ticket(uuid, text) to authenticated;

notify pgrst, 'reload schema';
