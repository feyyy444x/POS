-- A disabled Telegram channel may be left without a username.
alter table public.support_channel_settings
  alter column telegram_username drop not null;

notify pgrst, 'reload schema';
