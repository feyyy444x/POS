-- NexaPos TV display settings and token-protected public queue display.
-- Additive migration: does not modify POS transactions or queue history.
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.store_tv_settings (
  store_id uuid primary key references public.stores(id) on delete cascade,
  template text not null default 'modern-blue'
    check (template in ('modern-blue','minimal-light','premium-dark','queue-media','professional')),
  layout_mode text not null default 'split-left'
    check (layout_mode in ('split-left','media-top','media-bottom','media-fullscreen','alternate')),
  theme_mode text not null default 'light'
    check (theme_mode in ('light','dark')),
  primary_color text not null default '#2563eb',
  background_color text not null default '#f8fafc',
  text_color text not null default '#0f172a',
  queue_number_size integer not null default 112 check (queue_number_size between 48 and 240),
  customer_name_size integer not null default 32 check (customer_name_size between 12 and 96),
  counter_size integer not null default 26 check (counter_size between 12 and 72),
  next_queue_size integer not null default 22 check (next_queue_size between 12 and 64),
  media_volume integer not null default 35 check (media_volume between 0 and 100),
  announcement_volume integer not null default 100 check (announcement_volume between 0 and 100),
  voice_gender text not null default 'female' check (voice_gender in ('female','male')),
  media_fit text not null default 'contain' check (media_fit in ('contain','cover','original')),
  portrait_background text not null default 'blur' check (portrait_background in ('blur','dark','theme')),
  rotation_seconds integer not null default 20 check (rotation_seconds between 5 and 300),
  public_token text unique,
  updated_at timestamptz not null default now()
);

create table if not exists public.store_tv_media (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  media_type text not null check (media_type in ('link','upload')),
  title text not null check (char_length(trim(title)) between 1 and 160),
  source_url text,
  storage_path text,
  mime_type text,
  file_size_bytes bigint,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint store_tv_media_source_check check (
    (media_type = 'link' and source_url is not null and source_url ~ '^https?://' and storage_path is null and file_size_bytes is null)
    or
    (media_type = 'upload' and source_url is null and storage_path is not null and file_size_bytes between 1 and 104857600)
  )
);

create index if not exists store_tv_media_store_order_idx
  on public.store_tv_media(store_id, sort_order, created_at);

alter table public.store_tv_settings enable row level security;
alter table public.store_tv_media enable row level security;

revoke all on table public.store_tv_settings, public.store_tv_media from anon;
grant select, insert, update, delete on table public.store_tv_settings, public.store_tv_media to authenticated;

drop policy if exists "Store managers manage TV settings" on public.store_tv_settings;
create policy "Store managers manage TV settings"
on public.store_tv_settings
for all to authenticated
using (
  exists (
    select 1 from public.store_members sm
    where sm.store_id = store_tv_settings.store_id
      and sm.user_id = (select auth.uid())
      and sm.is_active = true
      and sm.role in ('owner','admin')
  )
)
with check (
  exists (
    select 1 from public.store_members sm
    where sm.store_id = store_tv_settings.store_id
      and sm.user_id = (select auth.uid())
      and sm.is_active = true
      and sm.role in ('owner','admin')
  )
);

drop policy if exists "Store managers manage TV media" on public.store_tv_media;
create policy "Store managers manage TV media"
on public.store_tv_media
for all to authenticated
using (
  exists (
    select 1 from public.store_members sm
    where sm.store_id = store_tv_media.store_id
      and sm.user_id = (select auth.uid())
      and sm.is_active = true
      and sm.role in ('owner','admin')
  )
)
with check (
  exists (
    select 1 from public.store_members sm
    where sm.store_id = store_tv_media.store_id
      and sm.user_id = (select auth.uid())
      and sm.is_active = true
      and sm.role in ('owner','admin')
  )
);

create or replace function public.enforce_store_tv_media_quota()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  used_bytes bigint;
begin
  if new.media_type <> 'upload' then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtext(new.store_id::text));
  select coalesce(sum(file_size_bytes), 0)
    into used_bytes
    from public.store_tv_media
   where store_id = new.store_id
     and id <> new.id
     and media_type = 'upload';

  if coalesce(new.file_size_bytes, 0) < 1
     or used_bytes + new.file_size_bytes > 104857600 then
    raise exception 'Kuota video tenant maksimal 100 MB. Hapus video lama sebelum menambahkan video baru.';
  end if;
  return new;
end;
$$;

drop trigger if exists store_tv_media_quota_guard on public.store_tv_media;
create trigger store_tv_media_quota_guard
before insert or update of store_id, media_type, file_size_bytes
on public.store_tv_media
for each row execute function public.enforce_store_tv_media_quota();

create or replace function public.get_public_tv_display(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  result jsonb;
begin
  if p_token is null or length(p_token) < 32 then
    return null;
  end if;

  select jsonb_build_object(
    'store_id', s.id,
    'store_name', coalesce(ss.store_name, s.name, 'NexaPos'),
    'settings', (to_jsonb(cfg) - 'public_token') || jsonb_build_object('queue_prefix', coalesce(ss.queue_prefix, 'A')),
    'media', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id,
        'title', m.title,
        'media_type', m.media_type,
        'source_url', m.source_url,
        'storage_path', m.storage_path,
        'mime_type', m.mime_type,
        'sort_order', m.sort_order
      ) order by m.sort_order, m.created_at)
      from public.store_tv_media m
      where m.store_id = s.id and m.is_active = true
    ), '[]'::jsonb),
    'current', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', q.id,
        'queue_number', q.queue_number,
        'customer_name', q.customer_name,
        'counter_label', q.counter_label,
        'status', q.status,
        'called_at', q.called_at
      ) order by q.called_at desc nulls last, q.created_at desc)
      from (
        select *
        from public.queue_tickets
        where store_id = s.id
          and service_date = (now() at time zone 'Asia/Jakarta')::date
          and status in ('called','serving')
        order by called_at desc nulls last, created_at desc
        limit 3
      ) q
    ), '[]'::jsonb),
    'waiting', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', q.id,
        'queue_number', q.queue_number,
        'customer_name', q.customer_name,
        'counter_label', q.counter_label,
        'status', q.status
      ) order by q.queue_number)
      from (
        select *
        from public.queue_tickets
        where store_id = s.id
          and service_date = (now() at time zone 'Asia/Jakarta')::date
          and status = 'waiting'
        order by queue_number
        limit 6
      ) q
    ), '[]'::jsonb)
  )
  into result
  from public.store_tv_settings cfg
  join public.stores s on s.id = cfg.store_id
  left join public.store_settings ss on ss.store_id = s.id
  where cfg.public_token = p_token
    and s.status = 'active'
    and (s.expires_at is null or s.expires_at > now());

  return result;
end;
$$;

revoke all on function public.get_public_tv_display(text) from public;
grant execute on function public.get_public_tv_display(text) to anon, authenticated;

comment on table public.store_tv_settings is 'Tenant-scoped TV queue appearance and secure public display token.';
comment on table public.store_tv_media is 'Tenant-scoped TV promotion links and uploaded media metadata; uploaded files are stored outside Postgres.';
