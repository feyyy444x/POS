-- Remove the obsolete permissive role check after the admin-only constraint is active.
ALTER TABLE public.platform_staff_roles DROP CONSTRAINT IF EXISTS platform_staff_roles_role_check;
