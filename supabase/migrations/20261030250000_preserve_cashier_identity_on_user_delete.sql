-- Preserve cashier identity in historical shifts while allowing the login account to be deleted.
alter table public.cashier_shifts
  add column if not exists cashier_name_snapshot text;

update public.cashier_shifts cs
set cashier_name_snapshot = coalesce(
  nullif(btrim(sm.full_name), ''),
  nullif(btrim(u.raw_user_meta_data->>'full_name'), ''),
  nullif(btrim(u.email), ''),
  'Kasir'
)
from auth.users u
left join lateral (
  select m.full_name
  from public.store_members m
  where m.user_id = u.id and m.store_id = cs.store_id
  order by m.created_at desc
  limit 1
) sm on true
where cs.cashier_id = u.id
  and cs.cashier_name_snapshot is null;

alter table public.cashier_shifts
  alter column cashier_id drop not null;

alter table public.cashier_shifts
  drop constraint if exists cashier_shifts_cashier_id_fkey;

alter table public.cashier_shifts
  add constraint cashier_shifts_cashier_id_fkey
  foreign key (cashier_id) references auth.users(id) on delete set null;

create or replace function private.snapshot_cashier_shift_identity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.cashier_name_snapshot is null and new.cashier_id is not null then
    select coalesce(
      nullif(btrim(m.full_name), ''),
      nullif(btrim(u.raw_user_meta_data->>'full_name'), ''),
      nullif(btrim(u.email), ''),
      'Kasir'
    )
    into new.cashier_name_snapshot
    from auth.users u
    left join lateral (
      select sm.full_name
      from public.store_members sm
      where sm.user_id = u.id and sm.store_id = new.store_id
      order by sm.created_at desc
      limit 1
    ) m on true
    where u.id = new.cashier_id;
  end if;
  return new;
end;
$$;

drop trigger if exists cashier_shifts_snapshot_identity on public.cashier_shifts;
create trigger cashier_shifts_snapshot_identity
before insert on public.cashier_shifts
for each row execute function private.snapshot_cashier_shift_identity();
