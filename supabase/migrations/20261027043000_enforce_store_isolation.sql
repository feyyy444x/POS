-- Keep queue tickets and linked sales within the same tenant.
create or replace function private.is_store_owner(target_store uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.store_members m
    where m.store_id = target_store
      and m.user_id = (select auth.uid())
      and m.role = 'owner'
  )
$$;

revoke all on function private.is_store_owner(uuid) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_store_owner(uuid) to authenticated;

-- Managers may manage cashier memberships, but only owners may assign elevated roles.
drop policy if exists "managers can add membership" on public.store_members;
drop policy if exists "managers can update membership" on public.store_members;
drop policy if exists "managers can delete membership" on public.store_members;

create policy "authorized managers add memberships"
on public.store_members for insert to authenticated
with check (
  private.is_store_owner(store_id)
  or (private.is_store_manager(store_id) and role = 'cashier')
);

create policy "authorized managers update memberships"
on public.store_members for update to authenticated
using (
  user_id <> (select auth.uid())
  and (
    private.is_store_owner(store_id)
    or (private.is_store_manager(store_id) and role = 'cashier')
  )
)
with check (
  user_id <> (select auth.uid())
  and (
    private.is_store_owner(store_id)
    or (private.is_store_manager(store_id) and role = 'cashier')
  )
);

create policy "authorized managers delete memberships"
on public.store_members for delete to authenticated
using (
  user_id <> (select auth.uid())
  and (
    (private.is_store_owner(store_id) and role <> 'owner')
    or (private.is_store_manager(store_id) and role = 'cashier')
  )
);

-- Reject linking an order from another store to a ticket in this store.
create or replace function public.create_queue_ticket(
  p_store_id uuid,
  p_customer_name text default null,
  p_order_id uuid default null
)
returns public.queue_tickets
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_number integer;
  new_ticket public.queue_tickets;
  day_key date;
begin
  if not private.is_store_member(p_store_id) then
    raise exception 'Not authorized for this store';
  end if;

  if p_order_id is not null and not exists (
    select 1
    from public.orders o
    where o.id = p_order_id
      and o.store_id = p_store_id
  ) then
    raise exception 'Order does not belong to this store';
  end if;

  day_key := (timezone('Asia/Jakarta', now()))::date;
  perform pg_advisory_xact_lock(hashtext(p_store_id::text || ':' || day_key::text));
  select coalesce(max(q.queue_number), 0) + 1
    into next_number
    from public.queue_tickets q
    where q.store_id = p_store_id
      and q.service_date = day_key;

  insert into public.queue_tickets(store_id, service_date, queue_number, customer_name, order_id)
  values (p_store_id, day_key, next_number, nullif(trim(p_customer_name), ''), p_order_id)
  returning * into new_ticket;

  return new_ticket;
end;
$$;

revoke all on function public.create_queue_ticket(uuid,text,uuid) from public, anon;
grant execute on function public.create_queue_ticket(uuid,text,uuid) to authenticated;
