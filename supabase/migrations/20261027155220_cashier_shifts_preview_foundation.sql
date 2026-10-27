-- Add cashier shifts and attendance support to the POS project.
-- This is the additive foundation already applied to Supabase POS.
-- Do not replace complete_sale here; checkout enforcement stays in the separate reviewed migration.
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
    closed_at is null or (
      counted_cash is not null and counted_qris is not null
      and expected_cash is not null and expected_qris is not null
      and cash_difference is not null and qris_difference is not null
    )
  )
);

create unique index if not exists cashier_shifts_one_open_per_cashier
  on public.cashier_shifts(store_id, cashier_id) where closed_at is null;
create index if not exists cashier_shifts_store_opened_idx
  on public.cashier_shifts(store_id, opened_at desc);
create index if not exists cashier_shifts_cashier_opened_idx
  on public.cashier_shifts(cashier_id, opened_at desc);

alter table public.cashier_shifts enable row level security;
revoke all on public.cashier_shifts from public, anon, authenticated;

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

grant select, insert on public.cashier_shifts to authenticated;

create or replace function public.close_cashier_shift(
  p_shift_id uuid,
  p_counted_cash numeric,
  p_counted_qris numeric,
  p_notes text default null
) returns public.cashier_shifts
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_shift public.cashier_shifts;
  v_expected_cash numeric(12,2);
  v_expected_qris numeric(12,2);
  v_closed_at timestamptz := now();
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;
  if coalesce(p_counted_cash, -1) < 0 or coalesce(p_counted_qris, -1) < 0 then
    raise exception 'Cash and QRIS counts must be zero or greater';
  end if;

  select * into v_shift
  from public.cashier_shifts
  where id = p_shift_id
  for update;

  if not found then raise exception 'Shift not found'; end if;
  if v_shift.closed_at is not null then raise exception 'Shift is already closed'; end if;
  if v_shift.cashier_id <> (select auth.uid())
     and not private.is_store_manager(v_shift.store_id) then
    raise exception 'Not authorized to close this shift';
  end if;
  if not private.is_store_member(v_shift.store_id) then
    raise exception 'Not authorized for this store';
  end if;

  select
    coalesce(v_shift.opening_cash, 0) + coalesce(sum(o.total) filter (where o.payment_method = 'cash'), 0),
    coalesce(sum(o.total) filter (where o.payment_method = 'qris'), 0)
  into v_expected_cash, v_expected_qris
  from public.orders o
  where o.store_id = v_shift.store_id
    and o.cashier_id = v_shift.cashier_id
    and o.status = 'paid'
    and o.created_at >= v_shift.opened_at
    and o.created_at <= v_closed_at;

  update public.cashier_shifts
  set closed_at = v_closed_at,
      counted_cash = p_counted_cash,
      counted_qris = p_counted_qris,
      expected_cash = v_expected_cash,
      expected_qris = v_expected_qris,
      cash_difference = p_counted_cash - v_expected_cash,
      qris_difference = p_counted_qris - v_expected_qris,
      notes = nullif(trim(coalesce(p_notes, '')), '')
  where id = p_shift_id
  returning * into v_shift;

  return v_shift;
end;
$function$;

revoke all on function public.close_cashier_shift(uuid,numeric,numeric,text) from public, anon;
grant execute on function public.close_cashier_shift(uuid,numeric,numeric,text) to authenticated;

do $function$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public' and tablename = 'cashier_shifts'
     ) then
    alter publication supabase_realtime add table public.cashier_shifts;
  end if;
end;
$function$;

notify pgrst, 'reload schema';
