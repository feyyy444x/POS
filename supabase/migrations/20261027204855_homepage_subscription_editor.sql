create table if not exists public.site_subscription_plans (
  id uuid primary key default gen_random_uuid(),
  plan_key text not null unique check (plan_key in ('daily','weekly','monthly','yearly')),
  name text not null,
  duration text not null,
  price numeric(12,2) not null default 0 check (price >= 0),
  note text not null default '',
  features text[] not null default '{}'::text[],
  is_popular boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.site_subscription_plans enable row level security;
drop policy if exists "Public can view active subscription plans" on public.site_subscription_plans;
create policy "Public can view active subscription plans"
  on public.site_subscription_plans for select to anon, authenticated
  using (is_active = true);
drop policy if exists "Super admins manage subscription plans" on public.site_subscription_plans;
create policy "Super admins manage subscription plans"
  on public.site_subscription_plans for all to authenticated
  using (exists (select 1 from public.super_admins sa where sa.user_id = (select auth.uid())))
  with check (exists (select 1 from public.super_admins sa where sa.user_id = (select auth.uid())));

grant select on public.site_subscription_plans to anon, authenticated;
grant insert, update, delete on public.site_subscription_plans to authenticated;

insert into public.site_subscription_plans
  (plan_key, name, duration, price, note, features, is_popular, is_active, sort_order)
values
  ('daily', 'Harian', '1 hari', 10000, 'Untuk kebutuhan jangka pendek',
   array['Semua fitur NexaPos','POS dan manajemen produk','Laporan penjualan dan modal','Sistem antrian dan bantuan']::text[], false, true, 1),
  ('weekly', 'Mingguan', '7 hari', 49000, 'Fleksibel untuk operasional mingguan',
   array['Semua fitur NexaPos','POS dan manajemen produk','Laporan penjualan dan modal','Sistem antrian dan bantuan']::text[], false, true, 2),
  ('monthly', 'Bulanan', '30 hari', 149000, 'Praktis untuk operasional rutin',
   array['Semua fitur NexaPos','POS dan manajemen produk','Laporan penjualan dan modal','Sistem antrian dan bantuan']::text[], true, true, 3),
  ('yearly', 'Tahunan', '365 hari', 1490000, 'Pilihan untuk penggunaan jangka panjang',
   array['Semua fitur NexaPos','POS dan manajemen produk','Laporan penjualan dan modal','Sistem antrian dan bantuan']::text[], false, true, 4)
on conflict (plan_key) do nothing;
