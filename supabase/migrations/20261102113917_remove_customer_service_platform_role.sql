-- NexaPos platform staff has a single internal role: Admin NEXAPOS.
-- Remove legacy Customer Service assignments without deleting their auth accounts.
-- Those accounts can still sign in as ordinary users, but no longer receive platform access.
DELETE FROM public.platform_staff_roles
WHERE role = 'customer_service';

ALTER TABLE public.platform_staff_roles
  ADD CONSTRAINT platform_staff_roles_admin_only_check
  CHECK (role = 'admin') NOT VALID;

ALTER TABLE public.platform_staff_roles
  VALIDATE CONSTRAINT platform_staff_roles_admin_only_check;
