-- Expose the current tenant logo to the public Self Order catalog.
-- The function keeps its existing availability checks and timeout cleanup behavior.
create or replace function public.get_public_self_order_catalog(p_store_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_store public.stores;
  v_settings public.store_settings;
begin
  select * into v_store
  from public.stores
  where id = p_store_id
    and status = 'active'
    and deleted_at is null
    and (expires_at is null or expires_at > now())
  for update;

  if not found or not private.is_store_publicly_available(p_store_id) then
    raise exception 'Toko tidak tersedia';
  end if;

  select * into v_settings
  from public.store_settings
  where store_id = p_store_id;

  if not found or v_settings.self_order_enabled is not true then
    raise exception 'Self Order sedang tidak aktif';
  end if;

  update public.products p
  set stock = p.stock + i.quantity,
      updated_at = now()
  from public.self_service_order_items i
  join public.self_service_orders o on o.id = i.self_service_order_id
  where o.store_id = p_store_id
    and o.payment_status = 'awaiting_payment'
    and o.payment_deadline <= now()
    and p.id = i.product_id;

  update public.self_service_orders
  set payment_status = 'rejected',
      order_status = 'cancelled',
      rejection_note = 'Waktu pembayaran habis',
      updated_at = now()
  where store_id = p_store_id
    and payment_status = 'awaiting_payment'
    and payment_deadline <= now();

  return jsonb_build_object(
    'store_id', v_store.id,
    'store_name', v_settings.store_name,
    'logo_url', v_settings.logo_url,
    'address', v_settings.address,
    'phone', v_settings.phone,
    'currency', v_settings.currency,
    'qris_image_url', v_settings.self_order_qris_image_url,
    'payment_instructions', v_settings.self_order_payment_instructions,
    'products', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id,
        'name', p.name,
        'category', p.category,
        'price', p.price
      ) order by p.category, p.name)
      from public.products p
      where p.store_id = p_store_id
        and p.is_active = true
        and p.stock > 0
    ), '[]'::jsonb)
  );
end;
$function$;
