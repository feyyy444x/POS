-- Tenant WhatsApp support configuration and per-cashier shift/attendance ledger.
-- This migration is committed to PR #3 only; do not apply directly to production during review.
alter table public.store_settings
  add column if not exists whatsapp_support_number text;

create table if not exists public.cashier_shifts (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  cashier_id uuid not null references auth.users(id) on delete restrict,
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  opening_cash numeric(12,2) not null default 0 check (opening_cash >= 0),
  counted_cash numeric(12,2) check (counted_cash >= 0),
  counted_qris numeric(12,2) check (counted_qris >= 0),
  expected_cash numeric(12,2) check (expected_cash >= 0),
  expected_qris numeric(12,2) check (expected_qris >= 0),
  cash_difference numeric(12,2),
  qris_difference numeric(12,2),
  notes text,
  created_at timestamptz not null default now(),
  constraint cashier_shifts_close_after_open check (closed_at is null or closed_at >= opened_at),
  constraint cashier_shifts_closed_values check (
    closed_at is null or (counted_cash is not null and counted_qris is not null
      and expected_cash is not null and expected_qris is not null
      and cash_difference is not null and qris_difference is not null)
  )
);

create unique index if not exists cashier_shifts_one_open_per_cashier
  on public.cashier_shifts(store_id, cashier_id) where closed_at is null;
create index if not exists cashier_shifts_store_opened_idx
  on public.cashier_shifts(store_id, opened_at desc);
create index if not exists cashier_shifts_cashier_opened_idx
  on public.cashier_shifts(cashier_id, opened_at desc);

alter table public.cashier_shifts enable row level security;

drop policy if exists "cashiers can view own shifts" on public.cashier_shifts;
create policy "cashiers can view own shifts"
  on public.cashier_shifts for select to authenticated
  using (cashier_id = (select auth.uid()) or private.is_store_manager(store_id));

drop policy if exists "cashiers can open own shift" on public.cashier_shifts;
create policy "cashiers can open own shift"
  on public.cashier_shifts for insert to authenticated
  with check (
    cashier_id = (select auth.uid())
    and private.is_store_member(store_id)
    and closed_at is null
    and counted_cash is null
    and counted_qris is null
  );

drop policy if exists "cashiers can close own shift" on public.cashier_shifts;
create policy "cashiers can close own shift"
  on public.cashier_shifts for update to authenticated
  using (
    cashier_id = (select auth.uid())
    and closed_at is null
    and private.is_store_member(store_id)
  )
  with check (
    cashier_id = (select auth.uid())
    and private.is_store_member(store_id)
    and closed_at is not null
  );

grant select, insert, update on public.cashier_shifts to authenticated;

-- Realtime drives active shift state and attendance reports without manual refresh.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'cashier_shifts'
     ) then
    alter publication supabase_realtime add table public.cashier_shifts;
  end if;
end $$;
