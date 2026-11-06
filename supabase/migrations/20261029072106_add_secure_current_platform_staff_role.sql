-- Expose only the signed-in user's own active platform staff assignment.
-- This does not grant staff access to Super Admin operations.
CREATE OR REPLACE FUNCTION public.get_my_platform_staff_role()
RETURNS TABLE(role text, permissions jsonb)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT p.role, p.permissions
  FROM public.platform_staff_roles AS p
  WHERE p.user_id = (SELECT auth.uid())
    AND p.is_active = true
    AND NOT EXISTS (
      SELECT 1 FROM public.super_admins AS s WHERE s.user_id = p.user_id
    )
  LIMIT 1;
$function$;

REVOKE ALL ON FUNCTION public.get_my_platform_staff_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_platform_staff_role() TO authenticated;
NOTIFY pgrst, 'reload schema';
