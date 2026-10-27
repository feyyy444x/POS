-- Bootstrap the explicitly designated NexaPos platform administrator.
-- Works whether the account already exists or is created after this migration.
create or replace function private.bootstrap_nexapos_super_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if lower(coalesce(new.email, '')) = 'ndraaaid@gmail.com' then
    insert into public.super_admins(user_id)
    values (new.id)
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;

revoke all on function private.bootstrap_nexapos_super_admin() from public, anon, authenticated;

drop trigger if exists bootstrap_nexapos_super_admin on auth.users;
create trigger bootstrap_nexapos_super_admin
after insert on auth.users
for each row execute function private.bootstrap_nexapos_super_admin();

insert into public.super_admins(user_id)
select u.id
from auth.users u
where lower(coalesce(u.email, '')) = 'ndraaaid@gmail.com'
on conflict (user_id) do nothing;
