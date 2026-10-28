-- Restrict sensitive Super Admin listing RPCs to authenticated Super Admins.
-- These functions execute with elevated privileges and return account/membership data.

CREATE OR REPLACE FUNCTION public.super_admin_list_disabled_members()
RETURNS TABLE(member_id uuid, user_id uuid, store_id uuid, store_name text, email text, full_name text, role text, disabled_at timestamp with time zone, disabled_by_email text, has_other_active_membership boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF NOT private.is_super_admin() THEN
    RAISE EXCEPTION 'Super Admin access required';
  END IF;

  RETURN QUERY
  SELECT
    m.id,
    m.user_id,
    m.store_id,
    s.name::text,
    coalesce(nullif(m.email, ''), u.email, '')::text,
    coalesce(m.full_name, '')::text,
    m.role::text,
    m.disabled_at,
    du.email::text,
    EXISTS (
      SELECT 1 FROM public.store_members active_m
      WHERE active_m.user_id = m.user_id
        AND active_m.is_active = true
        AND active_m.id <> m.id
    )
  FROM public.store_members m
  JOIN public.stores s ON s.id = m.store_id
  LEFT JOIN auth.users u ON u.id = m.user_id
  LEFT JOIN auth.users du ON du.id = m.disabled_by
  WHERE m.is_active = false
    AND m.role IN ('admin', 'cashier', 'manager')
  ORDER BY m.disabled_at DESC NULLS LAST, s.name, m.email;
END;
$function$;

CREATE OR REPLACE FUNCTION public.super_admin_list_users_detailed()
RETURNS TABLE(user_id uuid, email text, full_name text, created_at timestamp with time zone, last_sign_in_at timestamp with time zone, is_super_admin boolean, is_banned boolean, membership_count bigint, active_memberships bigint, store_names text, tenant_roles text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF NOT private.is_super_admin() THEN
    RAISE EXCEPTION 'Super Admin access required';
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    coalesce(u.email, '')::text,
    coalesce(
      nullif(u.raw_user_meta_data->>'full_name', ''),
      string_agg(distinct nullif(m.full_name, ''), ', ') FILTER (WHERE nullif(m.full_name, '') IS NOT NULL),
      ''
    )::text,
    u.created_at,
    u.last_sign_in_at,
    EXISTS(SELECT 1 FROM public.super_admins sa WHERE sa.user_id = u.id),
    coalesce(u.banned_until > now(), false),
    count(distinct m.id),
    count(distinct m.id) FILTER (WHERE m.is_active = true AND m.disabled_at IS NULL),
    coalesce(string_agg(distinct s.name, ', ') FILTER (WHERE s.name IS NOT NULL), '')::text,
    coalesce(
      string_agg(
        distinct concat_ws(
          ' — ',
          coalesce(s.name, 'Tenant tidak ditemukan'),
          CASE m.role
            WHEN 'owner' THEN 'Owner'
            WHEN 'admin' THEN 'Admin'
            WHEN 'cashier' THEN 'Kasir'
            ELSE coalesce(m.role, 'Role tidak diketahui')
          END,
          CASE WHEN m.is_active = true AND m.disabled_at IS NULL THEN 'Aktif' ELSE 'Nonaktif' END
        ),
        '; '
      ) FILTER (WHERE m.id IS NOT NULL),
      ''
    )::text
  FROM auth.users u
  LEFT JOIN public.store_members m ON m.user_id = u.id
  LEFT JOIN public.stores s ON s.id = m.store_id
  GROUP BY u.id, u.email, u.created_at, u.last_sign_in_at, u.banned_until, u.raw_user_meta_data
  ORDER BY u.created_at DESC;
END;
$function$;
