-- The public support contact configuration does not need to expose the updater's user ID.
alter table public.support_channel_settings
  drop column if exists updated_by;

notify pgrst, 'reload schema';