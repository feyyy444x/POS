-- Super Admin account directory and safe login access controls.
create or replace function public.super_admin_list_users()
returns table(
  user_id uuid,
  email text,
  full_name text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  is_super_admin boolean,
  is_banned boolean,
  membership_count bigint,
  active_memberships bigint,
  store_names text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_super_admin() then
    raise exception 'Super Admin access required';
  end if;
  return query
  select
    u.id,
    coalesce(u.email, ''),
    coalesce(string_agg(distinct nullif(m.full_name, ''), ', ') filter (where nullif(m.full_name, '') is not null), ''),
    u.created_at,
    u.last_sign_in_at,
    exists(select 1 from public.super_admins sa where sa.user_id = u.id),
    coalesce(u.banned_until > now(), false),
    count(distinct m.id),
    count(distinct m.id) filter (where m.is_active = true),
    coalesce(string_agg(distinct s.name, ', ') filter (where s.name is not null), '')
  from auth.users u
  left join public.store_members m on m.user_id = u.id
  left join public.stores s on s.id = m.store_id
  group by u.id, u.email, u.created_at, u.last_sign_in_at, u.banned_until
  order by u.created_at desc;
end;
$$;
revoke all on function public.super_admin_list_users() from public, anon;
grant execute on function public.super_admin_list_users() to authenticated;

create or replace function public.super_admin_set_user_banned(p_user_id uuid, p_banned boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_super_admin() then
    raise exception 'Super Admin access required';
  end if;
  if p_user_id is null or p_user_id = (select auth.uid()) then
    raise exception 'Target akun tidak valid';
  end if;
  if exists(select 1 from public.super_admins sa where sa.user_id = p_user_id) then
    raise exception 'Akun Super Admin dilindungi';
  end if;
  update auth.users
  set banned_until = case when coalesce(p_banned, false) then now() + interval '100 years' else null end,
      updated_at = now()
  where id = p_user_id;
  if not found then
    raise exception 'Akun tidak ditemukan';
  end if;
end;
$$;
revoke all on function public.super_admin_set_user_banned(uuid, boolean) from public, anon;
grant execute on function public.super_admin_set_user_banned(uuid, boolean) to authenticated;
