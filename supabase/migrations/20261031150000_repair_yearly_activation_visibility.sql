-- Reconcile all standard activation durations, the Admin-only custom duration,
-- and the four public package price maps.
-- This migration is safe to re-run and preserves the Admin-configured custom day count.

insert into public.site_activation_durations
  (duration_key, name, duration_days, sort_order, is_active)
values
  ('daily', 'Harian', 3, 1, true),
  ('weekly', 'Mingguan', 7, 2, true),
  ('monthly', 'Bulanan', 30, 3, true),
  ('yearly', 'Tahunan', 365, 4, true)
on conflict (duration_key) do update
set name = excluded.name,
    duration_days = excluded.duration_days,
    sort_order = excluded.sort_order,
    is_active = true,
    updated_at = now();

-- Custom is available only in Super Admin's company activation form.
-- Preserve the custom duration entered by Admin when the row already exists.
insert into public.site_activation_durations
  (duration_key, name, duration_days, sort_order, is_active)
values ('custom', 'Custom', 15, 5, true)
on conflict (duration_key) do update
set is_active = true,
    sort_order = 5,
    updated_at = now();

-- Older builds could create generated custom-* keys. Keep them out of the
-- canonical activation selector; the single editable key is always "custom".
update public.site_activation_durations
set is_active = false,
    updated_at = now()
where duration_key like 'custom-%';

-- Ensure every public package has a complete four-duration price map.
-- Preserve unrelated JSON properties while replacing only the standard prices.
update public.site_activation_packages
set prices = coalesce(prices, '{}'::jsonb) || case package_key
  when 'starter' then jsonb_build_object('daily', 5000, 'weekly', 15000, 'monthly', 49000, 'yearly', 490000)
  when 'growth' then jsonb_build_object('daily', 10000, 'weekly', 30000, 'monthly', 99000, 'yearly', 990000)
  when 'business' then jsonb_build_object('daily', 15000, 'weekly', 50000, 'monthly', 179000, 'yearly', 1790000)
  when 'enterprise' then jsonb_build_object('daily', 25000, 'weekly', 85000, 'monthly', 299000, 'yearly', 2990000)
end,
updated_at = now()
where package_key in ('starter', 'growth', 'business', 'enterprise');
