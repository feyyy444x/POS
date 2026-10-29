-- Anonymous Supabase Auth users are used only to give guest live-chat sessions
-- an isolated user_id. They must not appear in the workspace/admin account directory.
-- Keep them in auth.users so chat history and RLS ownership continue to work.

CREATE OR REPLACE FUNCTION public.super_admin_list_users()
RETURNS TABLE(
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
    coalesce(string_agg(distinct s.name, ', ') FILTER (WHERE s.name IS NOT NULL), '')::text
  FROM auth.users u
  LEFT JOIN public.store_members m ON m.user_id = u.id
  LEFT JOIN public.stores s ON s.id = m.store_id
  WHERE coalesce(u.is_anonymous, false) = false
  GROUP BY u.id, u.email, u.created_at, u.last_sign_in_at, u.banned_until, u.raw_user_meta_data
  ORDER BY u.created_at DESC;
END;
$function$;

REVOKE ALL ON FUNCTION public.super_admin_list_users() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.super_admin_list_users() TO authenticated;

CREATE OR REPLACE FUNCTION public.super_admin_list_users_detailed()
RETURNS TABLE(
  user_id uuid,
  email text,
  full_name text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  is_super_admin boolean,
  is_banned boolean,
  membership_count bigint,
  active_memberships bigint,
  store_names text,
  tenant_roles text
)
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
  WHERE coalesce(u.is_anonymous, false) = false
  GROUP BY u.id, u.email, u.created_at, u.last_sign_in_at, u.banned_until, u.raw_user_meta_data
  ORDER BY u.created_at DESC;
END;
$function$;

REVOKE ALL ON FUNCTION public.super_admin_list_users_detailed() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.super_admin_list_users_detailed() TO authenticated;
