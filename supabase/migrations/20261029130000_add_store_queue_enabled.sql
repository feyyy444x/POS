-- Allow each tenant to turn queue ticket generation on or off.
-- Existing tenants keep the current behavior (queue enabled) until an owner/admin changes it.
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS queue_enabled boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.store_settings.queue_enabled IS
  'When false, cashier checkout must not create queue tickets or print queue numbers for this store.';
