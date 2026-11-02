-- Require each staff member to have their own open cashier shift before
-- approving/rejecting payment or advancing a Self Order through preparation.
-- Public customer ordering remains unaffected; this guard is staff-only.
create or replace function public.update_self_service_order_status(
  p_order_id uuid,
  p_action text,
  p_note text default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_order public.self_service_orders;
  v_pos_order public.orders;
  v_ticket public.queue_tickets;
  v_settings public.store_settings;
  v_next_queue integer;
begin
  select * into v_order
  from public.self_service_orders
  where id = p_order_id
  for update;

  if not found
     or not private.is_store_member(v_order.store_id)
     or not private.is_store_operational(v_order.store_id)
     or not private.is_pin_verified() then
    raise exception 'Pesanan tidak ditemukan atau akses ditolak';
  end if;

  -- The authenticated employee must own an active shift in this exact tenant.
  -- Manager/owner access does not bypass the employee's own shift requirement.
  if not exists (
    select 1
    from public.cashier_shifts s
    where s.store_id = v_order.store_id
      and s.cashier_id = (select auth.uid())
      and s.closed_at is null
  ) then
    raise exception 'Buka shift kasir pribadi terlebih dahulu untuk memproses Self Order';
  end if;

  if p_action = 'approve' then
    if v_order.payment_status <> 'pending_verification'
       or v_order.payment_proof_path is null then
      raise exception 'Pesanan belum memiliki bukti pembayaran untuk diverifikasi';
    end if;

    if v_order.pos_order_id is null then
      insert into public.orders(
        store_id, receipt_number, cashier_id, subtotal, discount, tax, total,
        payment_method, paid_amount, change_amount, status, idempotency_key,
        source, self_service_order_id
      )
      values (
        v_order.store_id, v_order.order_number, auth.uid(), v_order.subtotal,
        0, 0, v_order.total, 'qris', v_order.total, 0, 'paid',
        v_order.id, 'self_order', v_order.id
      )
      returning * into v_pos_order;

      insert into public.order_items(
        order_id, product_id, product_name, quantity, unit_price, line_total
      )
      select
        v_pos_order.id, product_id, product_name, quantity, unit_price, line_total
      from public.self_service_order_items
      where self_service_order_id = v_order.id;

      select * into v_settings
      from public.store_settings
      where store_id = v_order.store_id;

      if coalesce(v_settings.queue_enabled, true) then
        perform pg_advisory_xact_lock(
          hashtextextended(
            v_order.store_id::text || ':' ||
            timezone('Asia/Jakarta', now())::date::text,
            0
          )
        );

        select coalesce(max(queue_number), 0) + 1
        into v_next_queue
        from public.queue_tickets
        where store_id = v_order.store_id
          and service_date = timezone('Asia/Jakarta', now())::date;

        insert into public.queue_tickets(
          store_id, service_date, queue_number, customer_name,
          order_id, status, counter_label
        )
        values (
          v_order.store_id, timezone('Asia/Jakarta', now())::date,
          v_next_queue, v_order.customer_name, v_pos_order.id,
          'waiting', 'Kasir 1'
        )
        returning * into v_ticket;
      end if;
    end if;

    update public.self_service_orders
    set payment_status = 'paid',
        order_status = 'confirmed',
        pos_order_id = coalesce(pos_order_id, v_pos_order.id),
        queue_ticket_id = coalesce(queue_ticket_id, v_ticket.id),
        verified_by = auth.uid(),
        verified_at = now(),
        updated_at = now()
    where id = p_order_id
    returning * into v_order;

  elsif p_action = 'reject' then
    if v_order.payment_status not in ('pending_verification', 'awaiting_payment') then
      raise exception 'Status pembayaran tidak dapat ditolak';
    end if;

    update public.products p
    set stock = p.stock + i.quantity,
        updated_at = now()
    from public.self_service_order_items i
    where i.self_service_order_id = v_order.id
      and p.id = i.product_id;

    update public.self_service_orders
    set payment_status = 'rejected',
        order_status = 'rejected',
        rejection_note = nullif(trim(coalesce(p_note, '')), ''),
        verified_by = auth.uid(),
        verified_at = now(),
        updated_at = now()
    where id = p_order_id
    returning * into v_order;

  elsif p_action in ('preparing', 'ready', 'completed') then
    if v_order.payment_status <> 'paid' then
      raise exception 'Pembayaran belum disetujui';
    end if;

    if (p_action = 'preparing' and v_order.order_status <> 'confirmed')
       or (p_action = 'ready' and v_order.order_status <> 'preparing')
       or (p_action = 'completed' and v_order.order_status <> 'ready') then
      raise exception 'Perubahan status pesanan tidak sesuai urutan';
    end if;

    update public.self_service_orders
    set order_status = p_action,
        updated_at = now()
    where id = p_order_id
    returning * into v_order;

    if p_action in ('ready', 'completed')
       and v_order.queue_ticket_id is not null then
      update public.queue_tickets
      set status = case when p_action = 'ready' then 'called' else 'done' end,
          called_at = case when p_action = 'ready' then now() else called_at end,
          completed_at = case when p_action = 'completed' then now() else completed_at end
      where id = v_order.queue_ticket_id;
    end if;

  else
    raise exception 'Aksi status tidak dikenal';
  end if;

  return jsonb_build_object(
    'id', v_order.id,
    'order_number', v_order.order_number,
    'payment_status', v_order.payment_status,
    'order_status', v_order.order_status,
    'pos_order_id', v_order.pos_order_id
  );
end;
$function$;

revoke all on function public.update_self_service_order_status(uuid, text, text)
  from public, anon;
grant execute on function public.update_self_service_order_status(uuid, text, text)
  to authenticated;

notify pgrst, 'reload schema';
