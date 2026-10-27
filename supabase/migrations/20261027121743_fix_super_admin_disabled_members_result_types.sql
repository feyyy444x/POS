-- Explicitly cast joined text fields to match the declared TABLE return types.
create or replace function public.super_admin_list_disabled_members()
returns table(
  member_id uuid,
  user_id uuid,
  store_id uuid,
  store_name text,
  email text,
  full_name text,
  role text,
  disabled_at timestamptz,
  disabled_by_email text,
  has_other_active_membership boolean
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
    m.id,
    m.user_id,
    m.store_id,
    s.name::text,
    coalesce(nullif(m.email, ''), u.email, '')::text,
    coalesce(m.full_name, '')::text,
    m.role::text,
    m.disabled_at,
    du.email::text,
    exists(
      select 1
      from public.store_members active_m
      where active_m.user_id = m.user_id
        and active_m.is_active = true
        and active_m.id <> m.id
    )
  from public.store_members m
  join public.stores s on s.id = m.store_id
  left join auth.users u on u.id = m.user_id
  left join auth.users du on du.id = m.disabled_by
  where m.is_active = false
    and m.role in ('admin', 'cashier', 'manager')
  order by m.disabled_at desc nulls last, s.name, m.email;
end;
$function$;
revoke all on function public.super_admin_list_disabled_members() from public, anon;
grant execute on function public.super_admin_list_disabled_members() to authenticated;
