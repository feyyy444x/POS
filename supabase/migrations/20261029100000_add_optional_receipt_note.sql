-- Optional per-tenant note printed on receipts. NULL/blank means it is not printed.
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS receipt_note text;

COMMENT ON COLUMN public.store_settings.receipt_note IS
  'Optional tenant-defined receipt note; blank values are omitted from printed receipts.';
