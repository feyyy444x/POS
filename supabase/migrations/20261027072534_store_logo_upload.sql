-- Optional per-tenant store logo for settings and thermal receipts.
alter table public.store_settings
  add column if not exists logo_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('store-logos', 'store-logos', true, 3145728, array['image/png','image/jpeg','image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

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
      and sm.role in ('owner', 'admin', 'manager')
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
      and sm.role in ('owner', 'admin', 'manager')
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
      and sm.role in ('owner', 'admin', 'manager')
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
      and sm.role in ('owner', 'admin', 'manager')
  )
  and private.is_pin_verified()
);
