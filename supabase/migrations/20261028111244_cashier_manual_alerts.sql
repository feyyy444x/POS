create table if not exists public.cashier_manual_alerts (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  cashier_id uuid not null references auth.users(id) on delete cascade,
  sent_by uuid not null references auth.users(id),
  message text not null default 'Waktu istirahat Anda telah melewati batas. Silakan kembali bekerja.',
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists cashier_manual_alerts_recipient_idx
  on public.cashier_manual_alerts (store_id, cashier_id, created_at desc);
alter table public.cashier_manual_alerts enable row level security;
drop policy if exists "cashier alerts recipient or manager read" on public.cashier_manual_alerts;
create policy "cashier alerts recipient or manager read"
  on public.cashier_manual_alerts for select to authenticated
  using (cashier_id = auth.uid() or private.is_store_manager(store_id));
drop policy if exists "store managers send cashier alerts" on public.cashier_manual_alerts;
create policy "store managers send cashier alerts"
  on public.cashier_manual_alerts for insert to authenticated
  with check (sent_by = auth.uid() and private.is_store_manager(store_id)
    and exists (select 1 from public.store_members m
      where m.store_id = cashier_manual_alerts.store_id
        and m.user_id = cashier_manual_alerts.cashier_id and m.is_active = true));
drop policy if exists "cashier marks own alert read" on public.cashier_manual_alerts;
create policy "cashier marks own alert read"
  on public.cashier_manual_alerts for update to authenticated
  using (cashier_id = auth.uid()) with check (cashier_id = auth.uid());
grant select, insert, update on public.cashier_manual_alerts to authenticated;
do $$
begin
  alter publication supabase_realtime add table public.cashier_manual_alerts;
exception when duplicate_object then null;
end $$;
notify pgrst, 'reload schema';
