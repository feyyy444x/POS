-- Add covering indexes for the platform staff audit actor foreign keys.
-- Kept in a new migration because the earlier FK-index migration is already recorded
-- in the production migration ledger and must not be edited retroactively.

create index if not exists platform_staff_roles_created_by_idx
  on public.platform_staff_roles (created_by);

create index if not exists platform_staff_roles_updated_by_idx
  on public.platform_staff_roles (updated_by);
