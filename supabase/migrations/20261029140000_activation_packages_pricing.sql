-- NexaPos activation packages: separate package capacity from activation duration and pricing.
create table if not exists public.site_activation_durations (
  duration_key text primary key,
  name text not null check (char_length(trim(name)) between 1 and 40),
  duration_days integer not null check (duration_days between 1 and 36500),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

create table if not exists public.site_activation_packages (
  id uuid primary key default gen_random_uuid(),
  package_key text not null unique check (package_key in ('starter','growth','business','enterprise')),
  name text not null check (char_length(trim(name)) between 1 and 60),
  location_limit integer not null check (location_limit between 1 and 1000),
  note text not null default '',
  prices jsonb not null default '{}'::jsonb check (jsonb_typeof(prices) = 'object'),
  features text[] not null default '{}'::text[],
  is_popular boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.site_activation_durations enable row level security;
alter table public.site_activation_packages enable row level security;

drop policy if exists "Public can view active activation durations" on public.site_activation_durations;
create policy "Public can view active activation durations"
  on public.site_activation_durations for select to anon, authenticated using (is_active = true);
drop policy if exists "Super admins manage activation durations" on public.site_activation_durations;
create policy "Super admins manage activation durations"
  on public.site_activation_durations for all to authenticated
  using (exists (select 1 from public.super_admins sa where sa.user_id = (select auth.uid())))
  with check (exists (select 1 from public.super_admins sa where sa.user_id = (select auth.uid())));

drop policy if exists "Public can view active activation packages" on public.site_activation_packages;
create policy "Public can view active activation packages"
  on public.site_activation_packages for select to anon, authenticated using (is_active = true);
drop policy if exists "Super admins manage activation packages" on public.site_activation_packages;
create policy "Super admins manage activation packages"
  on public.site_activation_packages for all to authenticated
  using (exists (select 1 from public.super_admins sa where sa.user_id = (select auth.uid())))
  with check (exists (select 1 from public.super_admins sa where sa.user_id = (select auth.uid())));

grant select on public.site_activation_durations, public.site_activation_packages to anon, authenticated;
grant insert, update, delete on public.site_activation_durations, public.site_activation_packages to authenticated;

insert into public.site_activation_durations (duration_key,name,duration_days,sort_order,is_active)
values
  ('daily','Harian',1,1,true),
  ('weekly','Mingguan',7,2,true),
  ('monthly','Bulanan',30,3,true),
  ('yearly','Tahunan',365,4,true),
  ('custom','Custom',15,5,true)
on conflict (duration_key) do nothing;

insert into public.site_activation_packages (package_key,name,location_limit,note,prices,features,is_popular,is_active,sort_order)
values
  ('starter','Starter',1,'Untuk satu lokasi usaha','{"daily":5000,"weekly":15000,"monthly":49000,"yearly":490000,"custom":25000}'::jsonb,array['Semua fitur NexaPos','Kasir dan transaksi','Produk dan stok per cabang','Laporan operasional','Sistem antrian dan struk']::text[],false,true,1),
  ('growth','Growth',3,'Untuk bisnis yang mulai berkembang','{"daily":10000,"weekly":30000,"monthly":99000,"yearly":990000,"custom":45000}'::jsonb,array['Semua fitur NexaPos','Kasir dan transaksi','Produk dan stok per cabang','Laporan operasional','Sistem antrian dan struk']::text[],false,true,2),
  ('business','Business',5,'Untuk bisnis dengan beberapa lokasi','{"daily":15000,"weekly":50000,"monthly":179000,"yearly":1790000,"custom":75000}'::jsonb,array['Semua fitur NexaPos','Kasir dan transaksi','Produk dan stok per cabang','Laporan operasional','Sistem antrian dan struk']::text[],true,true,3),
  ('enterprise','Enterprise',10,'Untuk jaringan usaha yang lebih besar','{"daily":25000,"weekly":85000,"monthly":299000,"yearly":2990000,"custom":125000}'::jsonb,array['Semua fitur NexaPos','Kasir dan transaksi','Produk dan stok per cabang','Laporan operasional','Sistem antrian dan struk']::text[],false,true,4)
on conflict (package_key) do nothing;

-- Keep public read-only behavior and prevent direct browser access to internal activation issuance.
