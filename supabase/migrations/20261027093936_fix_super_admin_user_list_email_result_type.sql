-- Keep return-query column types explicit for the declared TABLE result.
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
as $function$
begin
  if not private.is_super_admin() then
    raise exception 'Super Admin access required';
  end if;
  return query
  select
    u.id,
    coalesce(u.email, '')::text,
    coalesce(
      nullif(u.raw_user_meta_data->>'full_name', ''),
      string_agg(distinct nullif(m.full_name, ''), ', ') filter (where nullif(m.full_name, '') is not null),
      ''
    )::text,
    u.created_at,
    u.last_sign_in_at,
    exists(select 1 from public.super_admins sa where sa.user_id = u.id),
    coalesce(u.banned_until > now(), false),
    count(distinct m.id),
    count(distinct m.id) filter (where m.is_active = true and m.disabled_at is null),
    coalesce(string_agg(distinct s.name, ', ') filter (where s.name is not null), '')::text
  from auth.users u
  left join public.store_members m on m.user_id = u.id
  left join public.stores s on s.id = m.store_id
  group by u.id, u.email, u.created_at, u.last_sign_in_at, u.banned_until, u.raw_user_meta_data
  order by u.created_at desc;
end;
$function$;
revoke all on function public.super_admin_list_users() from public, anon;
grant execute on function public.super_admin_list_users() to authenticated;
