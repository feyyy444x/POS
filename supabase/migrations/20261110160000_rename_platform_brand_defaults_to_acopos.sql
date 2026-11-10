-- Update only new-record defaults; existing tenant/company names are customer data.
ALTER TABLE public.stores
  ALTER COLUMN name SET DEFAULT 'acoPos Store';

ALTER TABLE public.store_settings
  ALTER COLUMN store_name SET DEFAULT 'acoPos Store';
