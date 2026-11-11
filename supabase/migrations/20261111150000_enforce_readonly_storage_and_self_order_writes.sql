-- Storage and anonymous Self Order writes must obey the same company/tenant read-only boundary as RPC writes.

create or replace function private.can_upload_self_service_proof(p_store_id uuid, p_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.self_service_orders o
    join public.stores s on s.id = o.store_id
    join public.store_settings settings on settings.store_id = s.id
    where o.id = p_order_id
      and o.store_id = p_store_id
      and s.status = 'active'
      and s.deleted_at is null
      and (s.expires_at is null or s.expires_at > now())
      and private.is_store_publicly_available(p_store_id)
      and settings.self_order_enabled is true
      and o.payment_status = 'awaiting_payment'
      and o.payment_deadline > now()
      and not exists (
        select 1 from storage.objects so
        where so.bucket_id = 'self-order-proofs'
          and so.name like p_store_id::text || '/' || p_order_id::text || '/%'
      )
  );
$function$;

create or replace function public.attach_self_service_payment_proof(
  p_store_id uuid,
  p_order_id uuid,
  p_path text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_order public.self_service_orders;
  v_store public.stores;
  v_settings public.store_settings;
begin
  if p_path !~ ('^'||p_store_id::text||'/'||p_order_id::text||'/[A-Za-z0-9._-]{1,120}$') then
    raise exception 'Lokasi bukti pembayaran tidak valid';
  end if;

  select * into v_store
  from public.stores
  where id = p_store_id
    and status = 'active'
    and deleted_at is null
    and (expires_at is null or expires_at > now())
  for update;

  if not found or not private.is_store_publicly_available(p_store_id) then
    raise exception 'Perusahaan atau tenant sedang nonaktif. Self Order hanya dapat dibaca.';
  end if;

  select * into v_settings
  from public.store_settings
  where store_id = p_store_id
    and self_order_enabled is true;
  if not found then
    raise exception 'Self Order sedang tidak aktif';
  end if;

  if not exists (
    select 1 from storage.objects
    where bucket_id = 'self-order-proofs' and name = p_path
  ) then
    raise exception 'Bukti pembayaran belum berhasil diunggah';
  end if;

  update public.self_service_orders
  set payment_proof_path = p_path,
      payment_status = 'pending_verification',
      order_status = 'pending_verification',
      updated_at = now()
  where id = p_order_id
    and store_id = p_store_id
    and payment_status = 'awaiting_payment'
    and payment_deadline > now()
    and exists (
      select 1 from public.stores s
      where s.id = p_store_id
        and s.status = 'active'
        and s.deleted_at is null
        and (s.expires_at is null or s.expires_at > now())
        and private.is_store_publicly_available(s.id)
    )
  returning * into v_order;

  if not found then
    raise exception 'Pesanan tidak ditemukan, perusahaan nonaktif, atau waktu unggah telah berakhir';
  end if;

  return jsonb_build_object(
    'id', v_order.id,
    'order_number', v_order.order_number,
    'payment_status', v_order.payment_status,
    'order_status', v_order.order_status
  );
end;
$function$;

-- Logo files are operational data: upload, replacement and deletion stop with the tenant/company.
drop policy if exists "Store managers can upload store logos" on storage.objects;
create policy "Store managers can upload store logos"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'store-logos'
  and (storage.foldername(name))[1] in (
    select sm.store_id::text
    from public.store_members sm
    where sm.user_id = (select auth.uid())
      and sm.is_active = true
      and sm.disabled_at is null
      and sm.role = any (array['owner','admin','manager'])
      and private.is_store_operational(sm.store_id)
  )
  and private.is_pin_verified()
);

drop policy if exists "Store managers can update store logos" on storage.objects;
create policy "Store managers can update store logos"
on storage.objects for update to authenticated
using (
  bucket_id = 'store-logos'
  and (storage.foldername(name))[1] in (
    select sm.store_id::text
    from public.store_members sm
    where sm.user_id = (select auth.uid())
      and sm.is_active = true
      and sm.disabled_at is null
      and sm.role = any (array['owner','admin','manager'])
      and private.is_store_operational(sm.store_id)
  )
  and private.is_pin_verified()
)
with check (
  bucket_id = 'store-logos'
  and (storage.foldername(name))[1] in (
    select sm.store_id::text
    from public.store_members sm
    where sm.user_id = (select auth.uid())
      and sm.is_active = true
      and sm.disabled_at is null
      and sm.role = any (array['owner','admin','manager'])
      and private.is_store_operational(sm.store_id)
  )
  and private.is_pin_verified()
);

drop policy if exists "Store managers can delete store logos" on storage.objects;
create policy "Store managers can delete store logos"
on storage.objects for delete to authenticated
using (
  bucket_id = 'store-logos'
  and (storage.foldername(name))[1] in (
    select sm.store_id::text
    from public.store_members sm
    where sm.user_id = (select auth.uid())
      and sm.is_active = true
      and sm.disabled_at is null
      and sm.role = any (array['owner','admin','manager'])
      and private.is_store_operational(sm.store_id)
  )
  and private.is_pin_verified()
);
