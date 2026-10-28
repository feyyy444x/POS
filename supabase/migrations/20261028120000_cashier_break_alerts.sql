-- Per-store break alert configuration and durable cashier break history.
-- This migration is committed to PR #15 only; it is not applied to the production database.
create table if not exists public.cashier_break_settings (
  store_id uuid primary key references public.stores(id) on delete cascade,
  max_break_minutes integer not null default 15 check (max_break_minutes between 1 and 240),
  repeat_reminder_minutes integer not null default 5 check (repeat_reminder_minutes between 1 and 60),
  sound_enabled boolean not null default true,
  escalation_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.cashier_break_settings enable row level security;
revoke all on public.cashier_break_settings from public, anon, authenticated;
create policy "store members read break alert settings"
  on public.cashier_break_settings for select to authenticated
  using (private.is_store_member(store_id));
create policy "store managers insert break alert settings"
  on public.cashier_break_settings for insert to authenticated
  with check (private.is_store_manager(store_id));
create policy "store managers update break alert settings"
  on public.cashier_break_settings for update to authenticated
  using (private.is_store_manager(store_id))
  with check (private.is_store_manager(store_id));
grant select, insert, update on public.cashier_break_settings to authenticated;

create table if not exists public.cashier_shift_breaks (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  shift_id uuid not null references public.cashier_shifts(id) on delete cascade,
  cashier_id uuid not null references auth.users(id) on delete restrict,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  constraint cashier_shift_breaks_end_after_start check (ended_at is null or ended_at >= started_at)
);

create unique index if not exists cashier_shift_breaks_one_open_per_shift
  on public.cashier_shift_breaks(shift_id) where ended_at is null;
create index if not exists cashier_shift_breaks_store_started_idx
  on public.cashier_shift_breaks(store_id, started_at desc);
create index if not exists cashier_shift_breaks_cashier_started_idx
  on public.cashier_shift_breaks(cashier_id, started_at desc);

alter table public.cashier_shift_breaks enable row level security;
revoke all on public.cashier_shift_breaks from public, anon, authenticated;
create policy "cashiers and managers read break history"
  on public.cashier_shift_breaks for select to authenticated
  using (cashier_id = (select auth.uid()) or private.is_store_manager(store_id));
create policy "cashiers start own breaks on open shifts"
  on public.cashier_shift_breaks for insert to authenticated
  with check (
    cashier_id = (select auth.uid())
    and private.is_store_member(store_id)
    and exists (
      select 1 from public.cashier_shifts s
      where s.id = shift_id
        and s.store_id = cashier_shift_breaks.store_id
        and s.cashier_id = (select auth.uid())
        and s.closed_at is null
    )
    and ended_at is null
  );
create policy "cashiers end own breaks"
  on public.cashier_shift_breaks for update to authenticated
  using (cashier_id = (select auth.uid()) and ended_at is null)
  with check (
    cashier_id = (select auth.uid())
    and ended_at is not null
    and exists (
      select 1 from public.cashier_shifts s
      where s.id = shift_id
        and s.store_id = cashier_shift_breaks.store_id
        and s.cashier_id = (select auth.uid())
        and s.closed_at is null
    )
  );
grant select, insert on public.cashier_shift_breaks to authenticated;
grant update (ended_at) on public.cashier_shift_breaks to authenticated;

-- Enforce the break/close rule in the database as well as the UI, including RPC calls.
create or replace function public.prevent_closing_shift_during_break()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if old.closed_at is null and new.closed_at is not null
     and exists (
       select 1
       from public.cashier_shift_breaks b
       where b.shift_id = old.id
         and b.ended_at is null
     ) then
    raise exception 'Kasir harus menekan Kembali Bekerja sebelum menutup sesi.';
  end if;
  return new;
end;
$function$;

drop trigger if exists prevent_closing_shift_during_break on public.cashier_shifts;
create trigger prevent_closing_shift_during_break
before update of closed_at on public.cashier_shifts
for each row
execute function public.prevent_closing_shift_during_break();

do $publication$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='cashier_break_settings') then
      alter publication supabase_realtime add table public.cashier_break_settings;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='cashier_shift_breaks') then
      alter publication supabase_realtime add table public.cashier_shift_breaks;
    end if;
  end if;
end;
$publication$;
