alter table public.cashier_break_settings
  add column if not exists manual_alert_title text not null default 'Peringatan dari Admin',
  add column if not exists manual_alert_message text not null default '⚠️ Waktu istirahat Anda telah melewati batas. Silakan kembali bekerja.';

alter table public.cashier_manual_alerts
  add column if not exists title text not null default 'Peringatan dari Admin';

alter table public.cashier_break_settings
  drop constraint if exists cashier_break_settings_manual_alert_title_length,
  add constraint cashier_break_settings_manual_alert_title_length
    check (char_length(manual_alert_title) between 1 and 120),
  drop constraint if exists cashier_break_settings_manual_alert_message_length,
  add constraint cashier_break_settings_manual_alert_message_length
    check (char_length(manual_alert_message) between 1 and 2000);

alter table public.cashier_manual_alerts
  drop constraint if exists cashier_manual_alerts_title_length,
  add constraint cashier_manual_alerts_title_length
    check (char_length(title) between 1 and 120);

notify pgrst, 'reload schema';
