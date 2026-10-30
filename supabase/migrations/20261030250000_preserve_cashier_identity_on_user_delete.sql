-- Preserve cashier/actor attribution in historical operational records while allowing login deletion.
-- Keep immutable display snapshots; nullable auth references are only for optional live-account links.

alter table public.cashier_shifts
  add column if not exists cashier_name_snapshot text;
update public.cashier_shifts cs
set cashier_name_snapshot = coalesce((
  select coalesce(nullif(btrim(sm.full_name),''),nullif(btrim(u.raw_user_meta_data->>'full_name'),''),nullif(btrim(u.email),''),'Kasir')
  from auth.users u
  left join lateral (
    select m.full_name from public.store_members m
    where m.user_id=u.id and m.store_id=cs.store_id
    order by m.created_at desc limit 1
  ) sm on true
  where u.id=cs.cashier_id
), 'Kasir')
where cs.cashier_name_snapshot is null;
alter table public.cashier_shifts alter column cashier_id drop not null;
alter table public.cashier_shifts drop constraint if exists cashier_shifts_cashier_id_fkey;
alter table public.cashier_shifts add constraint cashier_shifts_cashier_id_fkey
  foreign key (cashier_id) references auth.users(id) on delete set null;

create or replace function private.snapshot_cashier_shift_identity()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.cashier_name_snapshot is null and new.cashier_id is not null then
    select coalesce(nullif(btrim(sm.full_name),''),nullif(btrim(u.raw_user_meta_data->>'full_name'),''),nullif(btrim(u.email),''),'Kasir')
    into new.cashier_name_snapshot
    from auth.users u
    left join lateral (
      select m.full_name from public.store_members m
      where m.user_id=u.id and m.store_id=new.store_id
      order by m.created_at desc limit 1
    ) sm on true
    where u.id=new.cashier_id;
  end if;
  return new;
end;
$$;
drop trigger if exists cashier_shifts_snapshot_identity on public.cashier_shifts;
create trigger cashier_shifts_snapshot_identity before insert on public.cashier_shifts
for each row execute function private.snapshot_cashier_shift_identity();

-- Break history is also retained after the account is removed.
alter table public.cashier_shift_breaks
  add column if not exists cashier_name_snapshot text;
update public.cashier_shift_breaks cb
set cashier_name_snapshot = coalesce(
  (select cs.cashier_name_snapshot from public.cashier_shifts cs where cs.id=cb.shift_id),
  (select coalesce(nullif(btrim(m.full_name),''),nullif(btrim(u.raw_user_meta_data->>'full_name'),''),nullif(btrim(u.email),''),'Kasir')
   from auth.users u left join public.store_members m on m.user_id=u.id and m.store_id=cb.store_id
   where u.id=cb.cashier_id),
  'Kasir'
)
where cb.cashier_name_snapshot is null;
alter table public.cashier_shift_breaks alter column cashier_id drop not null;
alter table public.cashier_shift_breaks drop constraint if exists cashier_shift_breaks_cashier_id_fkey;
alter table public.cashier_shift_breaks add constraint cashier_shift_breaks_cashier_id_fkey
  foreign key (cashier_id) references auth.users(id) on delete set null;

create or replace function private.snapshot_cashier_break_identity()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.cashier_name_snapshot is null and new.cashier_id is not null then
    select coalesce(nullif(btrim(m.full_name),''),nullif(btrim(u.raw_user_meta_data->>'full_name'),''),nullif(btrim(u.email),''),'Kasir')
    into new.cashier_name_snapshot
    from auth.users u
    left join public.store_members m on m.user_id=u.id and m.store_id=new.store_id
    where u.id=new.cashier_id;
  end if;
  return new;
end;
$$;
drop trigger if exists cashier_shift_breaks_snapshot_identity on public.cashier_shift_breaks;
create trigger cashier_shift_breaks_snapshot_identity before insert on public.cashier_shift_breaks
for each row execute function private.snapshot_cashier_break_identity();

-- Manual alert history must not be erased or block deletion of the cashier/administrator.
alter table public.cashier_manual_alerts
  add column if not exists cashier_name_snapshot text,
  add column if not exists sent_by_name_snapshot text;
update public.cashier_manual_alerts a
set cashier_name_snapshot = coalesce(
      (select coalesce(nullif(btrim(m.full_name),''),nullif(btrim(u.raw_user_meta_data->>'full_name'),''),nullif(btrim(u.email),''),'Kasir')
       from auth.users u left join public.store_members m on m.user_id=u.id and m.store_id=a.store_id where u.id=a.cashier_id),
      'Kasir'
    ),
    sent_by_name_snapshot = coalesce(
      (select coalesce(nullif(btrim(m.full_name),''),nullif(btrim(u.raw_user_meta_data->>'full_name'),''),nullif(btrim(u.email),''),'Admin')
       from auth.users u left join public.store_members m on m.user_id=u.id and m.store_id=a.store_id where u.id=a.sent_by),
      'Admin'
    )
where a.cashier_name_snapshot is null or a.sent_by_name_snapshot is null;
alter table public.cashier_manual_alerts alter column cashier_id drop not null;
alter table public.cashier_manual_alerts alter column sent_by drop not null;
alter table public.cashier_manual_alerts drop constraint if exists cashier_manual_alerts_cashier_id_fkey;
alter table public.cashier_manual_alerts drop constraint if exists cashier_manual_alerts_sent_by_fkey;
alter table public.cashier_manual_alerts add constraint cashier_manual_alerts_cashier_id_fkey
  foreign key (cashier_id) references auth.users(id) on delete set null;
alter table public.cashier_manual_alerts add constraint cashier_manual_alerts_sent_by_fkey
  foreign key (sent_by) references auth.users(id) on delete set null;

create or replace function private.snapshot_cashier_alert_identity()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.cashier_id is not null and new.cashier_name_snapshot is null then
    select coalesce(nullif(btrim(m.full_name),''),nullif(btrim(u.raw_user_meta_data->>'full_name'),''),nullif(btrim(u.email),''),'Kasir')
    into new.cashier_name_snapshot from auth.users u
    left join public.store_members m on m.user_id=u.id and m.store_id=new.store_id
    where u.id=new.cashier_id;
  end if;
  if new.sent_by is not null and new.sent_by_name_snapshot is null then
    select coalesce(nullif(btrim(m.full_name),''),nullif(btrim(u.raw_user_meta_data->>'full_name'),''),nullif(btrim(u.email),''),'Admin')
    into new.sent_by_name_snapshot from auth.users u
    left join public.store_members m on m.user_id=u.id and m.store_id=new.store_id
    where u.id=new.sent_by;
  end if;
  return new;
end;
$$;
drop trigger if exists cashier_manual_alerts_snapshot_identity on public.cashier_manual_alerts;
create trigger cashier_manual_alerts_snapshot_identity before insert on public.cashier_manual_alerts
for each row execute function private.snapshot_cashier_alert_identity();
