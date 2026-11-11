-- Configurable offline grace period per activation package.
-- Default 72 hours; Super Admin can set 0–168 hours. No production apply from this PR.
alter table public.site_activation_packages
  add column if not exists offline_grace_hours integer not null default 72
  check (offline_grace_hours between 0 and 168);

update public.site_activation_packages
set offline_grace_hours = 72
where offline_grace_hours is null;

comment on column public.site_activation_packages.offline_grace_hours is
  'Maximum offline POS write grace period after the last successful server-signed license validation, in hours (0–168).';

