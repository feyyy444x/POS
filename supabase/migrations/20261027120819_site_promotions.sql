create table if not exists public.site_promotions (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Penawaran khusus NexaPos',
  description text not null default '',
  discount_type text not null check (discount_type in ('percent','fixed')),
  discount_value numeric(12,2) not null check (discount_value > 0),
  eligible_periods text[] not null default array['daily','weekly','monthly','yearly']::text[],
  promo_code text,
  requires_code boolean not null default false,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint site_promotions_code_required check (not requires_code or (promo_code is not null and length(trim(promo_code)) > 0)),
  constraint site_promotions_valid_period check (ends_at is null or starts_at is null or ends_at > starts_at)
);
create index if not exists site_promotions_active_window_idx on public.site_promotions (is_active, starts_at, ends_at);
alter table public.site_promotions enable row level security;
drop policy if exists "Public can view current site promotions" on public.site_promotions;
create policy "Public can view current site promotions" on public.site_promotions
  for select to anon, authenticated
  using (is_active = true and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at >= now()));
drop policy if exists "Super admins manage site promotions" on public.site_promotions;
create policy "Super admins manage site promotions" on public.site_promotions
  for all to authenticated
  using (exists (select 1 from public.super_admins sa where sa.user_id = auth.uid()))
  with check (exists (select 1 from public.super_admins sa where sa.user_id = auth.uid()));
