-- Platform staff roles for internal NexaPos administration.
-- Assignments are managed only by existing platform Super Admins; no live database changes are applied by this migration file.
CREATE TABLE IF NOT EXISTS public.platform_staff_roles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin', 'customer_service')),
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(permissions) = 'object'),
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_staff_roles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.platform_staff_roles FROM anon, PUBLIC;
GRANT SELECT ON public.platform_staff_roles TO authenticated;

DROP POLICY IF EXISTS platform_staff_roles_super_admin_read ON public.platform_staff_roles;
CREATE POLICY platform_staff_roles_super_admin_read
  ON public.platform_staff_roles FOR SELECT TO authenticated
  USING (private.is_super_admin());

CREATE OR REPLACE FUNCTION public.super_admin_list_platform_staff()
RETURNS TABLE(user_id uuid, email text, full_name text, role text, permissions jsonb, is_active boolean, created_at timestamptz, updated_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
BEGIN
  IF NOT private.is_super_admin() THEN RAISE EXCEPTION 'Super Admin access required'; END IF;
  RETURN QUERY
  SELECT p.user_id, coalesce(u.email, '')::text,
    coalesce(u.raw_user_meta_data->>'full_name', '')::text,
    p.role, p.permissions, p.is_active, p.created_at, p.updated_at
  FROM public.platform_staff_roles p
  JOIN auth.users u ON u.id = p.user_id
  ORDER BY p.created_at DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.super_admin_set_platform_staff(
  p_email text,
  p_role text,
  p_permissions jsonb,
  p_is_active boolean DEFAULT true
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE target_user_id uuid;
BEGIN
  IF NOT private.is_super_admin() THEN RAISE EXCEPTION 'Super Admin access required'; END IF;
  IF lower(trim(coalesce(p_role, ''))) NOT IN ('admin', 'customer_service') THEN RAISE EXCEPTION 'Role tidak valid'; END IF;
  IF jsonb_typeof(coalesce(p_permissions, '{}'::jsonb)) <> 'object' THEN RAISE EXCEPTION 'Format izin tidak valid'; END IF;
  SELECT id INTO target_user_id FROM auth.users WHERE lower(email) = lower(trim(p_email)) LIMIT 1;
  IF target_user_id IS NULL THEN RAISE EXCEPTION 'Akun belum terdaftar. Minta anggota membuat akun terlebih dahulu.'; END IF;
  IF EXISTS (SELECT 1 FROM public.super_admins WHERE user_id = target_user_id) THEN RAISE EXCEPTION 'Akun Super Admin utama tidak dapat dijadikan staf delegasi'; END IF;
  INSERT INTO public.platform_staff_roles(user_id, role, permissions, is_active, created_by, updated_by)
  VALUES (target_user_id, lower(trim(p_role)), coalesce(p_permissions, '{}'::jsonb), coalesce(p_is_active, true), (SELECT auth.uid()), (SELECT auth.uid()))
  ON CONFLICT (user_id) DO UPDATE SET
    role = EXCLUDED.role, permissions = EXCLUDED.permissions, is_active = EXCLUDED.is_active,
    updated_by = (SELECT auth.uid()), updated_at = now()
  RETURNING user_id INTO target_user_id;
  RETURN target_user_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.super_admin_remove_platform_staff(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
BEGIN
  IF NOT private.is_super_admin() THEN RAISE EXCEPTION 'Super Admin access required'; END IF;
  DELETE FROM public.platform_staff_roles WHERE user_id = p_user_id;
  RETURN FOUND;
END;
$function$;

REVOKE ALL ON FUNCTION public.super_admin_list_platform_staff() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.super_admin_set_platform_staff(text, text, jsonb, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.super_admin_remove_platform_staff(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.super_admin_list_platform_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.super_admin_set_platform_staff(text, text, jsonb, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.super_admin_remove_platform_staff(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
