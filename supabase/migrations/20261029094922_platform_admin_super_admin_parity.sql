-- Internal platform Admins use the same workspace and backend authorization as Super Admins.
-- Keep the existing PIN verification requirement; tenant-level admin roles are never consulted here.
CREATE OR REPLACE FUNCTION private.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT private.is_pin_verified()
    AND (
      EXISTS (
        SELECT 1
        FROM public.super_admins AS sa
        WHERE sa.user_id = (SELECT auth.uid())
      )
      OR EXISTS (
        SELECT 1
        FROM public.platform_staff_roles AS psr
        WHERE psr.user_id = (SELECT auth.uid())
          AND psr.role = 'admin'
          AND psr.is_active = true
      )
    );
$function$;
