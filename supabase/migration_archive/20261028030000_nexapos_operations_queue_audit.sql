-- NexaPos operations bundle: audit queue creation/calls and atomic single-call enforcement.
alter table public.queue_tickets
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists created_by_name text,
  add column if not exists called_by uuid references auth.users(id) on delete set null,
  add column if not exists called_by_name text;

-- Keep the existing store/date/status index; add indexes for the new audit foreign keys.
create index if not exists queue_tickets_created_by_idx on public.queue_tickets(created_by);
create index if not exists queue_tickets_called_by_idx on public.queue_tickets(called_by);

create or replace function public.capture_queue_creator()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_name text;
begin
  if new.created_by is null then new.created_by := v_user; end if;
  if new.created_by_name is null and v_user is not null then
    select coalesce(nullif(trim(m.full_name), ''), nullif(trim(m.email), ''), 'Petugas')
      into v_name
      from public.store_members m
      where m.store_id = new.store_id and m.user_id = v_user
      limit 1;
    new.created_by_name := coalesce(v_name, 'Petugas');
  end if;
  return new;
end;
$$;

drop trigger if exists queue_ticket_capture_creator on public.queue_tickets;
create trigger queue_ticket_capture_creator
before insert on public.queue_tickets
for each row execute function public.capture_queue_creator();

-- This function is for the trigger only, not a client-callable RPC.
revoke all on function public.capture_queue_creator() from public, anon, authenticated;

create or replace function public.call_queue_ticket(
  p_ticket_id uuid,
  p_counter_label text
) returns public.queue_tickets
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_ticket public.queue_tickets;
  v_user uuid := (select auth.uid());
  v_label text := nullif(trim(p_counter_label), '');
  v_name text;
begin
  if v_user is null then raise exception 'Silakan login kembali.'; end if;
  if v_label is null or length(v_label) > 80 then
    raise exception 'Nama kasir/konter/loket wajib diisi (maksimal 80 karakter).';
  end if;

  select q.* into v_ticket
  from public.queue_tickets q
  where q.id = p_ticket_id
  for update;

  if not found then raise exception 'Nomor antrean tidak ditemukan.'; end if;
  if not private.is_store_member(v_ticket.store_id) then
    raise exception 'Anda tidak memiliki akses ke toko ini.';
  end if;
  if v_ticket.status <> 'waiting' then
    raise exception 'Nomor ini sudah dipanggil atau tidak lagi menunggu. Muat ulang antrean.';
  end if;

  select coalesce(nullif(trim(m.full_name), ''), nullif(trim(m.email), ''), 'Petugas')
    into v_name
    from public.store_members m
    where m.store_id = v_ticket.store_id and m.user_id = v_user
    limit 1;

  update public.queue_tickets
  set status = 'called',
      called_at = now(),
      called_by = v_user,
      called_by_name = coalesce(v_name, 'Petugas'),
      counter_label = v_label
  where id = p_ticket_id and status = 'waiting'
  returning * into v_ticket;

  if not found then raise exception 'Nomor ini sudah dipanggil oleh petugas lain.'; end if;
  return v_ticket;
end;
$$;

revoke all on function public.call_queue_ticket(uuid, text) from public, anon;
grant execute on function public.call_queue_ticket(uuid, text) to authenticated;
